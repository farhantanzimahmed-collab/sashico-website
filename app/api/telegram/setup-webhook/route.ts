import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getTelegramConfig } from "@/lib/telegram/config";
import { setWebhook, deleteWebhook, getWebhookInfo } from "@/lib/telegram/telegramService";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function requireAdmin() {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;
  const { data } = await serviceClient()
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();
  return data ? user : null;
}

// POST — register webhook with Telegram
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const customToken = body.bot_token;

  let botToken: string | undefined;
  if (customToken) {
    botToken = customToken;
  } else {
    const config = await getTelegramConfig();
    botToken = config?.botToken;
  }

  if (!botToken) {
    return NextResponse.json({ error: "Bot Token not configured" }, { status: 400 });
  }

  // Build the webhook URL from the request origin or env
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`;
  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  const result = await setWebhook(botToken, webhookUrl, secret);

  if (result.ok) {
    return NextResponse.json({ success: true, webhook_url: webhookUrl });
  } else {
    return NextResponse.json(
      { error: result.description || "Failed to set webhook" },
      { status: 500 }
    );
  }
}

// DELETE — remove webhook
export async function DELETE() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getTelegramConfig();
  if (!config?.botToken) {
    return NextResponse.json({ error: "Bot Token not configured" }, { status: 400 });
  }

  const ok = await deleteWebhook(config.botToken);
  return NextResponse.json({ success: ok });
}

// GET — check webhook status
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getTelegramConfig();
  if (!config?.botToken) {
    return NextResponse.json({ configured: false });
  }

  const info = await getWebhookInfo(config.botToken);
  return NextResponse.json({ configured: true, webhook: info });
}
