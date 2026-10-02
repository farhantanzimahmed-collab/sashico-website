-- One-time setup after 20261003_inventory.sql (run once, in one transaction).
-- Current products.sizes[].stock = master (sheet counts, never reduced by orders).
BEGIN;

-- 1. Every size gets master = current stock, reserved = 0, sold = 0
UPDATE products SET sizes = (
  SELECT jsonb_agg((e - 'stock') || jsonb_build_object('master', COALESCE((e->>'stock')::int, 0), 'reserved', 0, 'sold', 0))
  FROM jsonb_array_elements(sizes) e
) WHERE sizes IS NOT NULL AND jsonb_typeof(sizes) = 'array' AND jsonb_array_length(sizes) > 0;

-- 2. Old orders are history: not tracked
UPDATE orders SET inventory_state = 'untracked' WHERE inventory_state IS NULL;

-- 3. Orders in process now → reserve their items (no availability check: they're already accepted)
SELECT sashico_adjust_stock(items, 1, 0, 0, false)
  FROM orders WHERE order_status IN ('pending', 'confirmed', 'processing', 'shipped')
  ORDER BY created_at;
UPDATE orders SET inventory_state = 'reserved'
  WHERE order_status IN ('pending', 'confirmed', 'processing', 'shipped');

-- 4. Delivered during the campaign (Oct 2+) → consumed (master −, sold +)
SELECT sashico_adjust_stock(items, 0, -1, 1, false)
  FROM orders WHERE order_status = 'delivered' AND created_at >= '2026-10-01';
UPDATE orders SET inventory_state = 'consumed'
  WHERE order_status = 'delivered' AND created_at >= '2026-10-01';

COMMIT;
