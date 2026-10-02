-- Sashico inventory: master / reserved / available / sold, enforced in the database.
--
-- products.sizes is a JSON array; each size now carries:
--   master   – units you own and haven't delivered yet (edit this in Admin)
--   reserved – units held by active orders (pending/confirmed/processing/shipped)
--   sold     – units delivered (counted from 2026-10-03)
--   stock    – AVAILABLE to customers = max(master − reserved, 0)  (derived — never edit)
-- Every page of the website already reads `stock`, so the storefront shows
-- available stock without any other change.
--
-- Order lifecycle (trigger on orders):
--   new active order   → reserve   (fails if not enough available — row-locked, no overselling)
--   → cancelled        → release
--   → delivered        → consume   (reserved −q, master −q, sold +q)
--   delivered → cancelled (returned parcel) → master +q, sold −q
--   cancelled → active (reopened) → reserve again (checked)
--   order deleted while reserved  → release

ALTER TABLE orders ADD COLUMN IF NOT EXISTS inventory_state TEXT;  -- reserved | released | consumed | untracked

-- ── Keep `stock` (available) and stock_quantity in sync with master/reserved ──
CREATE OR REPLACE FUNCTION sashico_normalize_sizes() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  s jsonb; prev jsonb;
  m int; r int; sd int; avail int; total int := 0;
BEGIN
  IF NEW.sizes IS NULL OR jsonb_typeof(NEW.sizes) <> 'array' THEN
    RETURN NEW;
  END IF;
  FOR s IN SELECT * FROM jsonb_array_elements(NEW.sizes) LOOP
    prev := NULL;
    IF TG_OP = 'UPDATE' AND OLD.sizes IS NOT NULL AND jsonb_typeof(OLD.sizes) = 'array' THEN
      SELECT e INTO prev FROM jsonb_array_elements(OLD.sizes) e
       WHERE upper(e->>'size') = upper(s->>'size') LIMIT 1;
    END IF;
    -- A writer that doesn't know about reservations (old form, sync) must not wipe them
    r  := COALESCE((s->>'reserved')::int, (prev->>'reserved')::int, 0);
    sd := COALESCE((s->>'sold')::int,     (prev->>'sold')::int,     0);
    IF s ? 'master' THEN
      m := COALESCE((s->>'master')::int, 0);
    ELSE
      m := COALESCE((s->>'stock')::int, 0) + r;  -- legacy write: `stock` meant "available"
    END IF;
    avail := GREATEST(m - r, 0);
    total := total + avail;
    result := result || jsonb_build_array(
      (s - 'stock' - 'master' - 'reserved' - 'sold')
      || jsonb_build_object('stock', avail, 'master', m, 'reserved', r, 'sold', sd)
    );
  END LOOP;
  NEW.sizes := result;
  IF jsonb_array_length(result) > 0 THEN
    NEW.stock_quantity := total;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sashico_normalize_sizes ON products;
CREATE TRIGGER sashico_normalize_sizes
  BEFORE INSERT OR UPDATE OF sizes ON products
  FOR EACH ROW EXECUTE FUNCTION sashico_normalize_sizes();

-- ── Apply quantity changes for an order's items (row-locked) ──
-- d_res / d_master / d_sold are multipliers (-1, 0, +1). p_check refuses
-- reservations larger than available stock.
CREATE OR REPLACE FUNCTION sashico_adjust_stock(p_items jsonb, d_res int, d_master int, d_sold int, p_check boolean)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  it record; v_sizes jsonb; v_name text; idx int; el jsonb;
  m int; r int; sd int;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RETURN; END IF;
  FOR it IN
    SELECT (e->>'product_id')::uuid AS pid, upper(e->>'size') AS sz, SUM(COALESCE((e->>'quantity')::int, 1)) AS q
      FROM jsonb_array_elements(p_items) e
     WHERE (e->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     GROUP BY 1, 2
     ORDER BY 1, 2            -- consistent lock order: no deadlocks between concurrent orders
  LOOP
    SELECT sizes, name INTO v_sizes, v_name FROM products WHERE id = it.pid FOR UPDATE;
    IF NOT FOUND OR v_sizes IS NULL THEN CONTINUE; END IF;
    idx := NULL;
    SELECT (t.ord - 1)::int, t.elem INTO idx, el
      FROM jsonb_array_elements(v_sizes) WITH ORDINALITY AS t(elem, ord)
     WHERE upper(t.elem->>'size') = it.sz LIMIT 1;
    IF idx IS NULL THEN CONTINUE; END IF;   -- size not tracked on this product

    r  := COALESCE((el->>'reserved')::int, 0);
    sd := COALESCE((el->>'sold')::int, 0);
    m  := COALESCE((el->>'master')::int, COALESCE((el->>'stock')::int, 0) + r);

    IF p_check AND d_res > 0 AND (m - r) < it.q THEN
      RAISE EXCEPTION 'OUT_OF_STOCK|%|%|%', v_name, it.sz, GREATEST(m - r, 0)
        USING ERRCODE = 'P0001';
    END IF;

    r  := GREATEST(r + d_res * it.q, 0);
    m  := m + d_master * it.q;
    sd := GREATEST(sd + d_sold * it.q, 0);
    el := el || jsonb_build_object('master', m, 'reserved', r, 'sold', sd);
    UPDATE products SET sizes = jsonb_set(v_sizes, ARRAY[idx::text], el) WHERE id = it.pid;
  END LOOP;
END $$;

-- ── Order triggers ──
CREATE OR REPLACE FUNCTION sashico_order_inventory() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE target text; cur text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.inventory_state = 'reserved' THEN
      PERFORM sashico_adjust_stock(OLD.items, -1, 0, 0, false);
    END IF;
    RETURN OLD;
  END IF;

  target := CASE
    WHEN NEW.order_status = 'delivered' THEN 'consumed'
    WHEN NEW.order_status = 'cancelled' THEN 'released'
    ELSE 'reserved' END;

  IF TG_OP = 'INSERT' THEN
    IF target = 'reserved' THEN
      PERFORM sashico_adjust_stock(NEW.items, 1, 0, 0, true);
    ELSIF target = 'consumed' THEN
      PERFORM sashico_adjust_stock(NEW.items, 0, -1, 1, false);
    END IF;
    NEW.inventory_state := target;
    RETURN NEW;
  END IF;

  -- UPDATE
  cur := OLD.inventory_state;
  IF cur IS NULL OR cur = 'untracked' OR cur = target THEN
    RETURN NEW;  -- orders from before tracking, or no change
  END IF;
  IF cur = 'reserved' AND target = 'released' THEN
    PERFORM sashico_adjust_stock(OLD.items, -1, 0, 0, false);
  ELSIF cur = 'reserved' AND target = 'consumed' THEN
    PERFORM sashico_adjust_stock(OLD.items, -1, -1, 1, false);
  ELSIF cur = 'released' AND target = 'reserved' THEN
    PERFORM sashico_adjust_stock(NEW.items, 1, 0, 0, true);
  ELSIF cur = 'released' AND target = 'consumed' THEN
    PERFORM sashico_adjust_stock(NEW.items, 0, -1, 1, false);
  ELSIF cur = 'consumed' AND target = 'released' THEN
    PERFORM sashico_adjust_stock(OLD.items, 0, 1, -1, false);   -- returned parcel back on the shelf
  ELSIF cur = 'consumed' AND target = 'reserved' THEN
    PERFORM sashico_adjust_stock(OLD.items, 1, 1, -1, false);
  END IF;
  NEW.inventory_state := target;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sashico_order_inventory_ins ON orders;
CREATE TRIGGER sashico_order_inventory_ins
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION sashico_order_inventory();

DROP TRIGGER IF EXISTS sashico_order_inventory_upd ON orders;
CREATE TRIGGER sashico_order_inventory_upd
  BEFORE UPDATE OF order_status ON orders
  FOR EACH ROW EXECUTE FUNCTION sashico_order_inventory();

DROP TRIGGER IF EXISTS sashico_order_inventory_del ON orders;
CREATE TRIGGER sashico_order_inventory_del
  BEFORE DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION sashico_order_inventory();

NOTIFY pgrst, 'reload schema';
