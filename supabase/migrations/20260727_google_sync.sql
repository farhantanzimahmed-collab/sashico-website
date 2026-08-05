-- Add product_code to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS products_product_code_idx ON products (product_code);

-- Google Sync config table
CREATE TABLE IF NOT EXISTS google_sync_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  sheet_id TEXT,
  drive_folder_id TEXT,
  last_synced_at TIMESTAMPTZ,
  last_sync_log TEXT,
  last_sync_status TEXT DEFAULT 'never',  -- never | running | success | error
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO google_sync_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS: admin only
ALTER TABLE google_sync_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "google_sync_admin_all" ON google_sync_config FOR ALL USING (is_admin());
