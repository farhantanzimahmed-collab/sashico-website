-- ============================================================
-- Sashico Migration — run in Supabase SQL Editor
-- ============================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image       TEXT,
  display_order INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, slug, display_order) VALUES
  ('T-Shirts',     't-shirts',     1),
  ('Hoodies',      'hoodies',      2),
  ('Jackets',      'jackets',      3),
  ('Accessories',  'accessories',  4)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON categories FOR ALL USING (true);

-- 2. PRODUCTS — add new columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors       JSONB   DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stitch_count INTEGER;

-- 3. NEWSLETTER SUBSCRIBERS — add phone
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS phone TEXT;

-- 4. CONTACT SUBMISSIONS — ensure subject + is_read columns exist
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 5. SITE SETTINGS — add appearance columns
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS font_family                TEXT DEFAULT 'Manrope';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS announcement_bar_bg_color  TEXT DEFAULT '#000000';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS announcement_bar_text_color TEXT DEFAULT '#FFFFFF';

-- 6. ORDERS — RLS: allow public INSERT (service role bypasses RLS anyway)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow order creation" ON orders;
CREATE POLICY "Allow order creation" ON orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin read orders" ON orders;
CREATE POLICY "Admin read orders" ON orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin update orders" ON orders;
CREATE POLICY "Admin update orders" ON orders
  FOR UPDATE USING (true);

-- 7. CUSTOMERS — allow public upsert
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow customer upsert" ON customers;
CREATE POLICY "Allow customer upsert" ON customers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow customer update" ON customers;
CREATE POLICY "Allow customer update" ON customers
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admin read customers" ON customers;
CREATE POLICY "Admin read customers" ON customers
  FOR SELECT USING (true);

-- ============================================================
-- Done. Verify by checking:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'site_settings';
-- SELECT * FROM categories;
-- ============================================================
