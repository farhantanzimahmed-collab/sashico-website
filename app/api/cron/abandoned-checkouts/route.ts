import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/adminAuth";
import { getTelegramConfig } from "@/lib/telegram/config";
import { sendMessage } from "@/lib/telegram/telegramService";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Every 15 min (server cron): checkouts idle 30+ min with no order → Telegram alert, once.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = serviceClient();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: carts, error } = await db
    .from("abandoned_checkouts")
    .select("*")
    .eq("status", "open")
    .is("notified_at", null)
    .lt("updated_at", cutoff)
    .gt("updated_at", since)
    .limit(20);
  if (error) return NextResponse.json({ ok: false, error: error.message });
  if (!carts?.length) return NextResponse.json({ ok: true, alerted: 0 });

  // Ordered anyway (e.g. from another device)? Mark recovered instead of alerting.
  const phones = [...new Set(carts.map((c) => c.customer_phone))];
  const { data: orders } = await db.from("orders").select("id, customer_phone, created_at").gt("created_at", since);
  const norm = (p: string) => p.replace(/\D/g, "").replace(/^880/, "0");

  const config = await getTelegramConfig();
  let alerted = 0;
  for (const c of carts) {
    const placed = (orders || []).find((o) => norm(o.customer_phone) === c.customer_phone && o.created_at >= c.created_at);
    if (placed) {
      // Ordered (e.g. from another device) before we ever alerted — not abandoned at all
      await db.from("abandoned_checkouts").delete().eq("id", c.id);
      continue;
    }
    if (config?.isEnabled) {
      const items = (c.items as { product_name: string; size: string; quantity: number }[])
        .map((i) => `• ${esc(i.product_name)} (${esc(i.size)}) ×${i.quantity}`).join("\n");
      const mins = Math.round((Date.now() - new Date(c.updated_at).getTime()) / 60000);
      await sendMessage(config.botToken, config.chatId,
        `🛒 <b>Abandoned checkout</b> — ${mins} min ago\n\n` +
        `👤 ${esc(c.customer_name || "—")}\n📞 <code>${c.customer_phone}</code>\n` +
        `${items}\n💰 ৳${Number(c.total_amount).toLocaleString("en-US")}\n\n` +
        `Call or WhatsApp them — https://wa.me/88${c.customer_phone}\n` +
        `Admin → Abandoned Carts to mark as contacted.`);
      alerted++;
    }
    await db.from("abandoned_checkouts").update({ notified_at: new Date().toISOString() }).eq("id", c.id);
  }
  return NextResponse.json({ ok: true, alerted, phones: phones.length });
}
