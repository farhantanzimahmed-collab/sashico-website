import { createClient } from "@supabase/supabase-js";

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
  lowStockThreshold: number;
  notifications: {
    newOrder: boolean;
    newCustomer: boolean;
    contactForm: boolean;
    newReview: boolean;
    lowStock: boolean;
    outOfStock: boolean;
    newsletter: boolean;
  };
  summaries: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  // Try DB first (admin-configured settings take priority)
  try {
    const { data } = await serviceClient()
      .from("telegram_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (data?.bot_token && data?.chat_id) {
      return {
        botToken: data.bot_token,
        chatId: String(data.chat_id),
        isEnabled: data.is_enabled ?? true,
        lowStockThreshold: data.low_stock_threshold ?? 5,
        notifications: {
          newOrder: data.notify_new_order ?? true,
          newCustomer: data.notify_new_customer ?? true,
          contactForm: data.notify_contact_form ?? true,
          newReview: data.notify_new_review ?? true,
          lowStock: data.notify_low_stock ?? true,
          outOfStock: data.notify_out_of_stock ?? true,
          newsletter: data.notify_newsletter ?? true,
        },
        summaries: {
          daily: data.daily_summary_enabled ?? false,
          weekly: data.weekly_summary_enabled ?? false,
          monthly: data.monthly_summary_enabled ?? false,
        },
      };
    }
  } catch {
    // DB not yet migrated — fall through to env vars
  }

  // Fallback: environment variables
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return null;

  return {
    botToken,
    chatId,
    isEnabled: true,
    lowStockThreshold: 5,
    notifications: {
      newOrder: true,
      newCustomer: true,
      contactForm: true,
      newReview: true,
      lowStock: true,
      outOfStock: true,
      newsletter: true,
    },
    summaries: { daily: false, weekly: false, monthly: false },
  };
}
