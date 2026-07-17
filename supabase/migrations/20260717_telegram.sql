-- Telegram bot settings
CREATE TABLE IF NOT EXISTS telegram_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  bot_token TEXT,
  chat_id TEXT,
  notify_new_order BOOLEAN NOT NULL DEFAULT true,
  notify_new_customer BOOLEAN NOT NULL DEFAULT true,
  notify_contact_form BOOLEAN NOT NULL DEFAULT true,
  notify_new_review BOOLEAN NOT NULL DEFAULT true,
  notify_low_stock BOOLEAN NOT NULL DEFAULT true,
  notify_out_of_stock BOOLEAN NOT NULL DEFAULT true,
  notify_newsletter BOOLEAN NOT NULL DEFAULT true,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  daily_summary_enabled BOOLEAN NOT NULL DEFAULT false,
  weekly_summary_enabled BOOLEAN NOT NULL DEFAULT false,
  monthly_summary_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default row (only one row ever exists)
INSERT INTO telegram_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Ensure only row id=1 can ever exist
CREATE UNIQUE INDEX IF NOT EXISTS telegram_settings_singleton ON telegram_settings (id);

-- Store Telegram message ID on orders so we can edit the message on status change
ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_message_id TEXT;

-- Order status history (audit trail)
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS order_status_history_order_id ON order_status_history (order_id);
CREATE INDEX IF NOT EXISTS order_status_history_changed_at ON order_status_history (changed_at DESC);

-- RLS: telegram_settings readable by authenticated users, writable only via service role
ALTER TABLE telegram_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "telegram_settings_read" ON telegram_settings;
CREATE POLICY "telegram_settings_read" ON telegram_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- order_status_history readable by authenticated users
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_status_history_read" ON order_status_history;
CREATE POLICY "order_status_history_read" ON order_status_history
  FOR SELECT USING (auth.role() = 'authenticated');
