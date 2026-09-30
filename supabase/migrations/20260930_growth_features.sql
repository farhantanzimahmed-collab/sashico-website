-- Sashico growth features (2026-09-30)
-- Safe to run more than once. Supabase → SQL Editor → paste → Run.

-- #16 Ad attribution: which ad / campaign each order came from
ALTER TABLE orders ADD COLUMN IF NOT EXISTS attribution JSONB;

-- #12 Reviews with photos, linked to a real delivered order
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;

-- #9 Abandoned checkouts: phone captured at checkout, order never placed
CREATE TABLE IF NOT EXISTS abandoned_checkouts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         TEXT NOT NULL UNIQUE,
  customer_name      TEXT,
  customer_phone     TEXT NOT NULL,
  customer_email     TEXT,
  shipping_address   JSONB,
  items              JSONB NOT NULL DEFAULT '[]',
  total_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  attribution        JSONB,
  status             TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'contacted', 'recovered', 'dismissed')),
  notified_at        TIMESTAMPTZ,
  recovered_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS abandoned_checkouts_status_updated ON abandoned_checkouts (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS abandoned_checkouts_phone ON abandoned_checkouts (customer_phone);

-- Only the server (service role) touches this table — no public access
ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- Tell the API about the new columns/table immediately
NOTIFY pgrst, 'reload schema';
