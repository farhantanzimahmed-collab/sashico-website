import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { serviceClient } from "@/lib/adminAuth";
import { readPathaoConfig } from "@/lib/courier/pathao";
import { applyPathaoStatus } from "@/lib/courier/applyStatus";

const safeEqual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Pathao → us: parcel status changes. URL (with ?key=) is shown in Admin → Courier.
export async function POST(req: NextRequest) {
  const cfg = await readPathaoConfig();
  const key = req.nextUrl.searchParams.get("key") || "";
  if (!cfg?.webhook_key || !safeEqual(key, cfg.webhook_key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  const consignmentId = String(payload.consignment_id || payload.consignmentId || "");
  const merchantOrderId = String(payload.merchant_order_id || "");
  const status = String(payload.order_status_slug || payload.order_status || payload.event || "");

  const headers = process.env.PATHAO_WEBHOOK_SECRET
    ? { "X-Pathao-Merchant-Webhook-Integration-Secret": process.env.PATHAO_WEBHOOK_SECRET }
    : undefined;

  // Pathao's "test webhook" ping carries no parcel — just acknowledge it
  if (!status || (!consignmentId && !merchantOrderId)) {
    return NextResponse.json({ ok: true }, { status: 202, headers });
  }

  const db = serviceClient();
  let query = db.from("orders").select("id");
  query = consignmentId ? query.eq("tracking_number", consignmentId) : query.eq("order_number", merchantOrderId);
  const { data: order } = await query.maybeSingle();
  if (order) await applyPathaoStatus(order.id, status, "pathao_webhook");

  return NextResponse.json({ ok: true }, { status: 202, headers });
}
