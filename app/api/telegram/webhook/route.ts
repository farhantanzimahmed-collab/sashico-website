import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTelegramConfig, TelegramConfig } from "@/lib/telegram/config";
import { sendMessage, editMessage, answerCallbackQuery } from "@/lib/telegram/telegramService";
import { formatOrderMessage, getOrderKeyboard, formatDailySummary } from "@/lib/telegram/formatters";
import { Order } from "@/lib/types";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Telegram sends POST to this URL for every update
export async function POST(req: NextRequest) {
  // Verify webhook secret if configured
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const incoming = req.headers.get("x-telegram-bot-api-secret-token");
    if (incoming !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const config = await getTelegramConfig();
  if (!config?.isEnabled) return NextResponse.json({ ok: true });

  let update: Record<string, unknown>;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle button clicks (inline keyboard callbacks)
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query as Record<string, unknown>, config);
  }

  // Handle text commands from admin chat
  const msg = update.message as Record<string, unknown> | undefined;
  if (msg?.text && typeof msg.text === "string" && msg.text.startsWith("/")) {
    await handleCommand(msg, config);
  }

  // Always return 200 immediately — Telegram retries on non-200
  return NextResponse.json({ ok: true });
}

// ─── Callback Query (Button Clicks) ──────────────────────────────────────────

async function handleCallbackQuery(
  cbq: Record<string, unknown>,
  config: TelegramConfig
) {
  const queryId = cbq.id as string;
  const data = cbq.data as string | undefined;
  const message = cbq.message as Record<string, unknown> | undefined;
  const chatId = (message?.chat as Record<string, unknown>)?.id;

  // Security: only respond to the configured chat
  if (String(chatId) !== config.chatId) {
    await answerCallbackQuery(config.botToken, queryId, "⛔ Unauthorized", true);
    return;
  }

  if (!data?.startsWith("order_status:")) {
    await answerCallbackQuery(config.botToken, queryId);
    return;
  }

  // data format: "order_status:{status}:{orderId}"
  const parts = data.split(":");
  if (parts.length < 3) {
    await answerCallbackQuery(config.botToken, queryId, "Invalid action");
    return;
  }

  const newStatus = parts[1];
  const orderId = parts.slice(2).join(":"); // UUID might contain colons? No, but be safe

  const validStatuses = ["confirmed", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(newStatus)) {
    await answerCallbackQuery(config.botToken, queryId, "Unknown status");
    return;
  }

  const supabase = serviceClient();

  // Fetch current order
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    await answerCallbackQuery(config.botToken, queryId, "❌ Order not found", true);
    return;
  }

  if (order.order_status === newStatus) {
    await answerCallbackQuery(config.botToken, queryId, "Already in this status");
    return;
  }

  // Update order status
  const { error: updateError } = await supabase
    .from("orders")
    .update({ order_status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateError) {
    console.error("[Telegram webhook] Failed to update order:", updateError);
    await answerCallbackQuery(config.botToken, queryId, "❌ Database error", true);
    return;
  }

  // Save audit trail
  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: newStatus,
    changed_by: "telegram_bot",
  });

  // Confirm to Telegram user
  const labels: Record<string, string> = {
    confirmed: "✅ Order Confirmed!",
    processing: "📦 Marked as Processing",
    shipped: "🚚 Marked as Shipped",
    delivered: "🎉 Marked as Delivered",
    cancelled: "❌ Order Cancelled",
  };
  await answerCallbackQuery(config.botToken, queryId, labels[newStatus]);

  // Edit the original Telegram message to reflect new status
  const updatedOrder = { ...order, order_status: newStatus } as Order & {
    telegram_message_id: string | null;
  };
  const newText = formatOrderMessage(updatedOrder);
  const newKeyboard = getOrderKeyboard(orderId, newStatus);
  const msgId = message?.message_id as number | undefined;

  if (msgId) {
    await editMessage(config.botToken, config.chatId, msgId, newText, {
      parse_mode: "HTML",
      reply_markup: newKeyboard,
    });
  }
}

// ─── Bot Commands ─────────────────────────────────────────────────────────────

async function handleCommand(msg: Record<string, unknown>, config: TelegramConfig) {
  const chat = msg.chat as Record<string, unknown>;
  if (String(chat?.id) !== config.chatId) return; // Security: only owner's chat

  const rawText = (msg.text as string).split(" ")[0].toLowerCase().replace("@", "").split("@")[0];
  const supabase = serviceClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let reply = "";

  switch (rawText) {
    case "/orders":
    case "/orders_today": {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total_amount, order_status, created_at")
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false });

      if (!data?.length) {
        reply = "📦 No orders today yet.";
      } else {
        const lines = data.map((o, i) => {
          const num = o.order_number || o.id.slice(-6).toUpperCase();
          return `${i + 1}. #${num} — ${o.customer_name} — ৳${o.total_amount} <i>(${o.order_status})</i>`;
        });
        reply = `📦 <b>TODAY'S ORDERS (${data.length})</b>\n\n${lines.join("\n")}`;
      }
      break;
    }

    case "/orders_week": {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total_amount, order_status")
        .gte("created_at", weekStart.toISOString())
        .order("created_at", { ascending: false });

      const count = data?.length || 0;
      const revenue = data?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0;
      reply = [
        `📦 <b>LAST 7 DAYS ORDERS</b>`,
        ``,
        `• Total: <b>${count}</b>`,
        `• Revenue: <b>৳${revenue.toLocaleString("en-BD")}</b>`,
      ].join("\n");
      break;
    }

    case "/revenue_today": {
      const { data } = await supabase
        .from("orders")
        .select("total_amount")
        .gte("created_at", todayStart.toISOString())
        .neq("order_status", "cancelled");

      const revenue = data?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0;
      reply = `💰 <b>TODAY'S REVENUE</b>\n\n৳${revenue.toLocaleString("en-BD")}`;
      break;
    }

    case "/revenue_month": {
      const { data } = await supabase
        .from("orders")
        .select("total_amount")
        .gte("created_at", monthStart.toISOString())
        .neq("order_status", "cancelled");

      const revenue = data?.reduce((s, o) => s + (o.total_amount || 0), 0) || 0;
      reply = `💰 <b>THIS MONTH'S REVENUE</b>\n\n৳${revenue.toLocaleString("en-BD")}`;
      break;
    }

    case "/pending": {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total_amount, created_at")
        .eq("order_status", "pending")
        .order("created_at", { ascending: false });

      if (!data?.length) {
        reply = "✅ No pending orders!";
      } else {
        const lines = data.map((o, i) => {
          const num = o.order_number || o.id.slice(-6).toUpperCase();
          const t = new Date(o.created_at).toLocaleTimeString("en-BD", {
            timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit",
          });
          return `${i + 1}. #${num} — ${o.customer_name} — ৳${o.total_amount} <i>(${t})</i>`;
        });
        reply = `⏳ <b>PENDING ORDERS (${data.length})</b>\n\n${lines.join("\n")}`;
      }
      break;
    }

    case "/shipped": {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total_amount")
        .eq("order_status", "shipped")
        .order("created_at", { ascending: false });

      const lines = (data || []).map((o, i) => {
        const num = o.order_number || o.id.slice(-6).toUpperCase();
        return `${i + 1}. #${num} — ${o.customer_name} — ৳${o.total_amount}`;
      });
      reply = `🚚 <b>SHIPPED ORDERS (${data?.length || 0})</b>\n\n${lines.join("\n") || "None"}`;
      break;
    }

    case "/cancelled": {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total_amount")
        .eq("order_status", "cancelled")
        .gte("created_at", weekStart.toISOString())
        .order("created_at", { ascending: false });

      reply = `❌ <b>CANCELLED ORDERS (last 7 days): ${data?.length || 0}</b>`;
      break;
    }

    case "/lowstock": {
      const { data: products } = await supabase
        .from("products")
        .select("name, sizes")
        .eq("is_active", true);

      const alerts: string[] = [];
      const threshold = config.lowStockThreshold;

      for (const p of products || []) {
        const sizes = (p.sizes as Array<{ size: string; stock: number }>) || [];
        for (const s of sizes) {
          if (s.stock >= 0 && s.stock <= threshold) {
            const icon = s.stock === 0 ? "🚨" : "⚠️";
            alerts.push(`${icon} ${p.name} (${s.size}) — <b>${s.stock} left</b>`);
          }
        }
      }

      reply = alerts.length
        ? `⚠️ <b>LOW/OUT STOCK ITEMS (${alerts.length})</b>\n\n${alerts.join("\n")}`
        : "✅ All products have sufficient stock.";
      break;
    }

    case "/support": {
      reply = [
        `🛠 <b>SASHICO SUPPORT</b>`,
        ``,
        `📧 Email: support@sashico.com`,
        `🌐 Admin: <a href="https://sashico.vercel.app/admin">sashico.vercel.app/admin</a>`,
      ].join("\n");
      break;
    }

    case "/help": {
      reply = [
        `🤖 <b>SASHICO BOT — COMMANDS</b>`,
        ``,
        `/orders — Today's orders`,
        `/orders_week — Last 7 days orders`,
        `/revenue_today — Today's revenue`,
        `/revenue_month — This month's revenue`,
        `/pending — All pending orders`,
        `/shipped — All shipped orders`,
        `/cancelled — Cancelled (last 7d)`,
        `/lowstock — Low &amp; out of stock`,
        `/support — Support info`,
        `/help — This menu`,
      ].join("\n");
      break;
    }

    default:
      return;
  }

  if (reply) {
    await sendMessage(config.botToken, config.chatId, reply, { parse_mode: "HTML" });
  }
}
