import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/adminAuth";
import { normalizeBdPhone } from "@/lib/customerHistory";

// Saves an in-progress checkout once the shopper has typed a valid phone number,
// so an unfinished order can be followed up by phone (see /api/cron/abandoned-checkouts).
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const phone = normalizeBdPhone(b.phone);
    const sessionId = String(b.session_id || "").slice(0, 64);
    if (!/^01[3-9]\d{8}$/.test(phone) || !sessionId || !Array.isArray(b.items) || !b.items.length) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const items = b.items.slice(0, 30).map((i: Record<string, unknown>) => ({
      product_id: String(i.product_id ?? ""),
      product_name: String(i.product_name ?? "").slice(0, 120),
      size: String(i.size ?? "").slice(0, 20),
      quantity: Number(i.quantity) || 1,
      unit_price: Number(i.unit_price) || 0,
    }));
    const { error } = await serviceClient().from("abandoned_checkouts").upsert(
      {
        session_id: sessionId,
        customer_name: String(b.name || "").slice(0, 120) || null,
        customer_phone: phone,
        customer_email: String(b.email || "").slice(0, 160) || null,
        shipping_address: b.address && typeof b.address === "object" ? b.address : null,
        items,
        total_amount: Number(b.total) || 0,
        attribution: b.attribution && typeof b.attribution === "object" ? b.attribution : null,
        status: "open",
        notified_at: null, // edits after an alert re-arm it
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );
    // Table not created yet (migration pending) → silently skip
    if (error && !/abandoned_checkouts|relation|schema cache/i.test(error.message)) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
