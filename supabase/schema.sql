-- =====================================================
-- SASHICO E-COMMERCE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CATEGORIES
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  discount_price DECIMAL(10,2),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'uncategorized',
  images TEXT[] DEFAULT '{}',
  sizes JSONB DEFAULT '[]',
  stock_quantity INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_new_arrival BOOLEAN DEFAULT false,
  is_best_seller BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product full-text search index
CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || category)
);

-- =====================================================
-- CUSTOMERS
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address JSONB,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORDERS
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 80,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-generate order number
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'SCO-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- =====================================================
-- REVIEWS
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MARKETING SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS marketing_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  meta_pixel_id TEXT,
  meta_pixel_enabled BOOLEAN DEFAULT false,
  ga4_id TEXT,
  ga4_enabled BOOLEAN DEFAULT false,
  gtm_id TEXT,
  gtm_enabled BOOLEAN DEFAULT false,
  tiktok_pixel_id TEXT,
  tiktok_pixel_enabled BOOLEAN DEFAULT false,
  snapchat_pixel_id TEXT,
  snapchat_pixel_enabled BOOLEAN DEFAULT false,
  linkedin_partner_id TEXT,
  linkedin_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row (single-row table pattern)
INSERT INTO marketing_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SITE SETTINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_name TEXT DEFAULT 'Sashico',
  tagline TEXT DEFAULT 'Premium Embroidery Streetwear',
  hero_title TEXT DEFAULT 'Wear the Culture',
  hero_subtitle TEXT DEFAULT 'Premium embroidery streetwear crafted in Bangladesh',
  hero_image TEXT,
  hero_video TEXT,
  hero_cta_text TEXT DEFAULT 'Shop Collection',
  about_title TEXT DEFAULT 'Our Story',
  about_content TEXT DEFAULT 'Sashico was born from a passion for craftsmanship and street culture.',
  about_image TEXT,
  contact_email TEXT DEFAULT 'hello@sashico.com',
  contact_phone TEXT DEFAULT '+880 1700-000000',
  contact_address TEXT DEFAULT 'Dhaka, Bangladesh',
  instagram_url TEXT,
  facebook_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  shipping_cost DECIMAL(10,2) DEFAULT 80,
  free_shipping_threshold DECIMAL(10,2) DEFAULT 2000,
  currency TEXT DEFAULT 'BDT',
  currency_symbol TEXT DEFAULT '৳',
  announcement_bar_text TEXT,
  announcement_bar_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- NEWSLETTER SUBSCRIBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CONTACT SUBMISSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ADMIN USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER marketing_settings_updated_at BEFORE UPDATE ON marketing_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Products: Anyone can read active, admins can do anything
CREATE POLICY "products_read_active" ON products FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "products_admin_insert" ON products FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "products_admin_update" ON products FOR UPDATE USING (is_admin());
CREATE POLICY "products_admin_delete" ON products FOR DELETE USING (is_admin());

-- Categories: Public read, admin write
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_insert" ON categories FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "categories_admin_update" ON categories FOR UPDATE USING (is_admin());
CREATE POLICY "categories_admin_delete" ON categories FOR DELETE USING (is_admin());

-- Orders: Admins can read all
CREATE POLICY "orders_admin_all" ON orders FOR ALL USING (is_admin());
CREATE POLICY "orders_insert_public" ON orders FOR INSERT WITH CHECK (true);

-- Customers: Admins can read all, users can read own
CREATE POLICY "customers_admin_all" ON customers FOR ALL USING (is_admin());
CREATE POLICY "customers_insert_public" ON customers FOR INSERT WITH CHECK (true);

-- Reviews: Public read approved, admin all
CREATE POLICY "reviews_read_approved" ON reviews FOR SELECT USING (is_approved = true OR is_admin());
CREATE POLICY "reviews_insert_public" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "reviews_admin_update" ON reviews FOR UPDATE USING (is_admin());
CREATE POLICY "reviews_admin_delete" ON reviews FOR DELETE USING (is_admin());

-- Marketing Settings: Public read, admin write
CREATE POLICY "marketing_read" ON marketing_settings FOR SELECT USING (true);
CREATE POLICY "marketing_admin_update" ON marketing_settings FOR UPDATE USING (is_admin());

-- Site Settings: Public read, admin write
CREATE POLICY "site_settings_read" ON site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_admin_update" ON site_settings FOR UPDATE USING (is_admin());

-- Newsletter: Public insert, admin read
CREATE POLICY "newsletter_insert" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "newsletter_admin_read" ON newsletter_subscribers FOR SELECT USING (is_admin());

-- Contact: Public insert, admin read
CREATE POLICY "contact_insert" ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "contact_admin_read" ON contact_submissions FOR SELECT USING (is_admin());
CREATE POLICY "contact_admin_update" ON contact_submissions FOR UPDATE USING (is_admin());

-- Admin users: Only admins can read
CREATE POLICY "admin_users_read" ON admin_users FOR SELECT USING (is_admin() OR auth.uid() = user_id);

-- =====================================================
-- SAMPLE DATA - CATEGORIES
-- =====================================================
INSERT INTO categories (name, slug, description, display_order) VALUES
  ('T-Shirts', 't-shirts', 'Premium embroidered t-shirts', 1),
  ('Hoodies', 'hoodies', 'Heavyweight embroidered hoodies', 2),
  ('Jackets', 'jackets', 'Statement outerwear with embroidery', 3),
  ('Accessories', 'accessories', 'Caps, bags and more', 4)
ON CONFLICT (slug) DO NOTHING;
