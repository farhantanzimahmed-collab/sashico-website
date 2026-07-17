import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTelegramConfig } from "@/lib/telegram/config";
import { sendMessage } from "@/lib/telegram/telegramService";
import {
  formatDailySummary,
  formatWeeklySummary,
  formatMonthlySummary,
} from "@/lib/telegram/formatters";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Called by Vercel Cron — secured by CRON_SECRET env var
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const type = req.nextUrl.searchParams.get("type") ?? "daily";
  const config = await getTelegramConfig();
  if (!config?.isEnabled) return NextResponse.json({ ok: true, skipped: "bot disabled" });

  const supabase = serviceClient();
  const now = new Date();

  if (type === "daily" && config.summaries.daily) {
    await sendDailySummary(supabase, config, now);
  } else if (type === "weekly" && config.summaries.weekly) {
    await sendWeeklySummary(supabase, config, now);
  } else if (type === "monthly" && config.summaries.monthly) {
    await sendMonthlySummary(supabase, config, now);
  } else {
    return NextResponse.json({ ok: true, skipped: `${type} summaries disabled` });
  }

  return NextResponse.json({ ok: true, type });
}

// POST — can also be triggered manually from admin
export async function POST(req: NextRequest) {
  // Require admin auth or cron secret
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  let isAuthorized = cronSecret && auth === `Bearer ${cronSecret}`;

  if (!isAuthorized) {
    // Try admin session auth
    const { createClient: createSSRClient } = await import("@/lib/supabase/server");
    const authSupabase = await createSSRClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (user) {
      const { data } = await serviceClient()
        .from("admin_users")
        .select("id")
        .eq("user_id", user.id)
        .single();
      isAuthorized = !!data;
    }
  }

  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = body.type ?? "daily";
  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.botToken || !config.chatId) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 400 });
  }

  const supabase = serviceClient();
  const now = new Date();

  if (type === "daily") await sendDailySummary(supabase, config, now);
  else if (type === "weekly") await sendWeeklySummary(supabase, config, now);
  else if (type === "monthly") await sendMonthlySummary(supabase, config, now);

  return NextResponse.json({ ok: true, type });
}

// ─── Summary Builders ─────────────────────────────────────────────────────────

async function sendDailySummary(
  supabase: ReturnType<typeof serviceClient>,
  config: Awaited<ReturnType<typeof getTelegramConfig>> & object,
  now: Date
) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, order_status, items")
    .gte("created_at", todayStart.toISOString());

  const allOrders = orders || [];
  const nonCancelled = allOrders.filter((o) => o.order_status !== "cancelled");
  const revenue = nonCancelled.reduce((s, o) => s + (o.total_amount || 0), 0);

  // Count product quantities
  const productQty: Record<string, { name: string; qty: number }> = {};
  for (const order of nonCancelled) {
    const items = order.items as Array<{ product_name: string; quantity: number }>;
    for (const item of items || []) {
      const key = item.product_name;
      if (!productQty[key]) productQty[key] = { name: key, qty: 0 };
      productQty[key].qty += item.quantity;
    }
  }
  const topProducts = Object.values(productQty).sort((a, b) => b.qty - a.qty);

  const dateStr = now.toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const text = formatDailySummary({
    date: dateStr,
    totalOrders: allOrders.length,
    revenue,
    pendingOrders: allOrders.filter((o) => o.order_status === "pending").length,
    cancelledOrders: allOrders.filter((o) => o.order_status === "cancelled").length,
    topProducts,
  });

  const cfg = config as { botToken: string; chatId: string };
  await sendMessage(cfg.botToken, cfg.chatId, text, { parse_mode: "HTML" });
}

async function sendWeeklySummary(
  supabase: ReturnType<typeof serviceClient>,
  config: Awaited<ReturnType<typeof getTelegramConfig>> & object,
  now: Date
) {
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, order_status, customer_id")
    .gte("created_at", weekStart.toISOString());

  const allOrders = orders || [];
  const nonCancelled = allOrders.filter((o) => o.order_status !== "cancelled");
  const revenue = nonCancelled.reduce((s, o) => s + (o.total_amount || 0), 0);

  const { count: newCustomers } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekStart.toISOString());

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-BD", { timeZone: "Asia/Dhaka", month: "short", day: "numeric" });

  const text = formatWeeklySummary({
    startDate: fmt(weekStart),
    endDate: fmt(now),
    totalOrders: allOrders.length,
    revenue,
    newCustomers: newCustomers || 0,
    cancelledOrders: allOrders.filter((o) => o.order_status === "cancelled").length,
  });

  const cfg = config as { botToken: string; chatId: string };
  await sendMessage(cfg.botToken, cfg.chatId, text, { parse_mode: "HTML" });
}

async function sendMonthlySummary(
  supabase: ReturnType<typeof serviceClient>,
  config: Awaited<ReturnType<typeof getTelegramConfig>> & object,
  now: Date
) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, order_status, items")
    .gte("created_at", monthStart.toISOString());

  const allOrders = orders || [];
  const nonCancelled = allOrders.filter((o) => o.order_status !== "cancelled");
  const revenue = nonCancelled.reduce((s, o) => s + (o.total_amount || 0), 0);

  const productQty: Record<string, { name: string; qty: number }> = {};
  for (const order of nonCancelled) {
    const items = order.items as Array<{ product_name: string; quantity: number }>;
    for (const item of items || []) {
      const key = item.product_name;
      if (!productQty[key]) productQty[key] = { name: key, qty: 0 };
      productQty[key].qty += item.quantity;
    }
  }
  const topProducts = Object.values(productQty).sort((a, b) => b.qty - a.qty);

  const { count: newCustomers } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStart.toISOString());

  const monthName = now.toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "long",
  });

  const text = formatMonthlySummary({
    month: monthName,
    totalOrders: allOrders.length,
    revenue,
    newCustomers: newCustomers || 0,
    cancelledOrders: allOrders.filter((o) => o.order_status === "cancelled").length,
    topProducts,
  });

  const cfg = config as { botToken: string; chatId: string };
  await sendMessage(cfg.botToken, cfg.chatId, text, { parse_mode: "HTML" });
}
