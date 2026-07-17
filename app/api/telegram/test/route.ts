import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getTelegramConfig } from "@/lib/telegram/config";
import { sendMessage } from "@/lib/telegram/telegramService";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  // Require admin auth
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminUser } = await serviceClient()
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Allow override for testing with a custom token/chatId from request body
  const body = await req.json().catch(() => ({}));
  const customToken = body.bot_token;
  const customChatId = body.chat_id;

  const config = await getTelegramConfig();
  const botToken = customToken || config?.botToken;
  const chatId = customChatId || config?.chatId;

  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "Telegram not configured. Add Bot Token and Chat ID first." },
      { status: 400 }
    );
  }

  const testMessage = [
    `🤖 <b>SASHICO BOT — TEST NOTIFICATION</b>`,
    ``,
    `✅ Connection successful!`,
    ``,
    `Your Telegram bot is properly configured and ready to receive notifications from <b>Sashico</b>.`,
    ``,
    `<i>You will now receive alerts for new orders, reviews, contact messages, low stock, and more.</i>`,
  ].join("\n");

  const messageId = await sendMessage(botToken, chatId, testMessage, { parse_mode: "HTML" });

  if (messageId) {
    return NextResponse.json({ success: true, message_id: messageId });
  } else {
    return NextResponse.json(
      { error: "Failed to send test message. Check your Bot Token and Chat ID." },
      { status: 500 }
    );
  }
}
