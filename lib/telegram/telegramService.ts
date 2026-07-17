const TELEGRAM_API = "https://api.telegram.org";

interface TelegramResponse {
  ok: boolean;
  result?: { message_id: number; [key: string]: unknown };
  error_code?: number;
  description?: string;
}

interface SendMessageOptions {
  parse_mode?: "HTML" | "MarkdownV2";
  reply_markup?: Record<string, unknown>;
  disable_notification?: boolean;
  disable_web_page_preview?: boolean;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function telegramCall(
  method: string,
  botToken: string,
  body: Record<string, unknown>,
  attempt = 0
): Promise<TelegramResponse> {
  const maxRetries = 3;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as TelegramResponse;

    if (data.ok) return data;

    // Rate limited — back off and retry
    if (data.error_code === 429 && attempt < maxRetries - 1) {
      await sleep(Math.pow(2, attempt) * 1500);
      return telegramCall(method, botToken, body, attempt + 1);
    }

    console.error(`[Telegram] ${method} error ${data.error_code}: ${data.description}`);
    return data;
  } catch (err) {
    if (attempt < maxRetries - 1) {
      await sleep(Math.pow(2, attempt) * 1000);
      return telegramCall(method, botToken, body, attempt + 1);
    }
    console.error(`[Telegram] ${method} failed after ${maxRetries} attempts:`, err);
    return { ok: false, description: String(err) };
  }
}

export async function sendMessage(
  botToken: string,
  chatId: string,
  text: string,
  options: SendMessageOptions = {}
): Promise<number | null> {
  const res = await telegramCall("sendMessage", botToken, {
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode ?? "HTML",
    disable_web_page_preview: true,
    ...options,
  });
  return res.ok ? (res.result?.message_id ?? null) : null;
}

export async function editMessage(
  botToken: string,
  chatId: string,
  messageId: number,
  text: string,
  options: SendMessageOptions = {}
): Promise<boolean> {
  const res = await telegramCall("editMessageText", botToken, {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options.parse_mode ?? "HTML",
    disable_web_page_preview: true,
    ...options,
  });
  return res.ok;
}

export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string,
  showAlert = false
): Promise<boolean> {
  const res = await telegramCall("answerCallbackQuery", botToken, {
    callback_query_id: callbackQueryId,
    ...(text ? { text, show_alert: showAlert } : {}),
  });
  return res.ok;
}

export async function setWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string
): Promise<{ ok: boolean; description?: string }> {
  const res = await telegramCall("setWebhook", botToken, {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
  return { ok: res.ok, description: res.description };
}

export async function deleteWebhook(botToken: string): Promise<boolean> {
  const res = await telegramCall("deleteWebhook", botToken, { drop_pending_updates: false });
  return res.ok;
}

export async function getWebhookInfo(botToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/getWebhookInfo`);
  return res.json();
}

export async function getMe(botToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`);
  return res.json();
}
