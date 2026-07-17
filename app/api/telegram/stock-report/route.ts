import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTelegramConfig } from "@/lib/telegram/config";
import { sendMessage } from "@/lib/telegram/telegramService";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Called by Vercel Cron every day at 7 AM Bangladesh time (1 AM UTC)
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.botToken || !config.chatId) {
    return NextResponse.json({ ok: true, skipped: "bot not configured" });
  }

  await sendStockReport(config.botToken, config.chatId);
  return NextResponse.json({ ok: true });
}

// POST — manual trigger from admin or bot command
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  let authorized = cronSecret && auth === `Bearer ${cronSecret}`;

  if (!authorized) {
    const { createClient: createSSR } = await import("@/lib/supabase/server");
    const supabase = await createSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await serviceClient()
        .from("admin_users").select("id").eq("user_id", user.id).single();
      authorized = !!data;
    }
  }

  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.botToken || !config.chatId) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 400 });
  }

  await sendStockReport(config.botToken, config.chatId);
  return NextResponse.json({ ok: true });
}

async function sendStockReport(botToken: string, chatId: string) {
  const supabase = serviceClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, sizes, is_active")
    .eq("is_active", true)
    .order("name");

  if (!products?.length) {
    await sendMessage(botToken, chatId,
      "📦 <b>MORNING STOCK REPORT</b>\n\nNo active products found.",
      { parse_mode: "HTML" }
    );
    return;
  }

  const outOfStock: string[] = [];
  const lowStock: string[] = [];
  const healthy: string[] = [];
  let totalUnits = 0;
  let totalSKUs = 0;

  for (const product of products) {
    const sizes = (product.sizes as Array<{ size: string; stock: number }>) || [];
    const productLines: string[] = [];

    for (const s of sizes) {
      totalSKUs++;
      totalUnits += s.stock;

      if (s.stock === 0) {
        productLines.push(`   • ${s.size}: <b>OUT OF STOCK</b> 🚨`);
      } else if (s.stock <= 5) {
        productLines.push(`   • ${s.size}: <b>${s.stock} pcs</b> ⚠️`);
      } else {
        productLines.push(`   • ${s.size}: ${s.stock} pcs ✅`);
      }
    }

    // Determine which bucket this product goes in (worst case)
    const hasOut = sizes.some((s) => s.stock === 0);
    const hasLow = sizes.some((s) => s.stock > 0 && s.stock <= 5);
    const entry = `\n<b>${product.name}</b>\n${productLines.join("\n")}`;

    if (hasOut) outOfStock.push(entry);
    else if (hasLow) lowStock.push(entry);
    else healthy.push(entry);
  }

  const now = new Date().toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build the report — split into sections to stay under Telegram's 4096 char limit
  const header = [
    `🌅 <b>MORNING STOCK REPORT</b>`,
    `📅 ${now}`,
    ``,
    `📊 <b>Summary</b>`,
    `• Total Products: <b>${products.length}</b>`,
    `• Total SKUs: <b>${totalSKUs}</b>`,
    `• Total Units: <b>${totalUnits}</b>`,
    `• Out of Stock: <b>${outOfStock.length} products</b>`,
    `• Low Stock (≤5): <b>${lowStock.length} products</b>`,
    `• Healthy: <b>${healthy.length} products</b>`,
  ].join("\n");

  await sendMessage(botToken, chatId, header, { parse_mode: "HTML" });

  // Out of stock section
  if (outOfStock.length > 0) {
    const chunks = chunkArray(outOfStock, 10);
    for (const chunk of chunks) {
      const text = `🚨 <b>OUT OF STOCK (${outOfStock.length})</b>\n${chunk.join("\n")}`;
      await sendMessage(botToken, chatId, text, { parse_mode: "HTML" });
    }
  }

  // Low stock section
  if (lowStock.length > 0) {
    const chunks = chunkArray(lowStock, 10);
    for (const chunk of chunks) {
      const text = `⚠️ <b>LOW STOCK (${lowStock.length})</b>\n${chunk.join("\n")}`;
      await sendMessage(botToken, chatId, text, { parse_mode: "HTML" });
    }
  }

  // Healthy section (only if there are no critical items, otherwise skip to keep it brief)
  if (outOfStock.length === 0 && lowStock.length === 0) {
    await sendMessage(botToken, chatId,
      `✅ <b>ALL STOCK HEALTHY</b>\n\nAll ${products.length} products have sufficient inventory. Great job! 🎉`,
      { parse_mode: "HTML" }
    );
  } else if (healthy.length > 0) {
    await sendMessage(botToken, chatId,
      `✅ <b>HEALTHY STOCK (${healthy.length} products)</b>\n\nRemaining products have sufficient stock.`,
      { parse_mode: "HTML" }
    );
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
