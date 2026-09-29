import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminAuth";
import { readPathaoConfig, createPathaoOrder } from "@/lib/courier/pathao";

// POST { orderId, city_id, zone_id, area_id?, weight, amount_to_collect, instruction? }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db = serviceClient();
  const { data: order } = await db.from("orders").select("*").eq("id", body.orderId).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.tracking_number) {
    return NextResponse.json({ error: `Already booked — consignment ${order.tracking_number}` }, { status: 409 });
  }

  const cfg = await readPathaoConfig();
  if (!cfg?.store_id) return NextResponse.json({ error: "Set up Pathao (and pick a pickup store) in Admin → Courier first" }, { status: 400 });

  const a = order.shipping_address || {};
  const address = [a.street, a.city, a.district].filter(Boolean).join(", ");
  const items = (order.items || []) as { product_name: string; size: string; quantity: number }[];

  try {
    const parcel = await createPathaoOrder({
      store_id: cfg.store_id,
      merchant_order_id: order.order_number,
      recipient_name: order.customer_name,
      recipient_phone: String(order.customer_phone).replace(/\D/g, "").replace(/^880/, "0"),
      recipient_address: address.length >= 10 ? address : `${address}, Bangladesh`,
      recipient_city: Number(body.city_id),
      recipient_zone: Number(body.zone_id),
      ...(body.area_id ? { recipient_area: Number(body.area_id) } : {}),
      delivery_type: 48,
      item_type: 2,
      special_instruction: body.instruction || undefined,
      item_quantity: items.reduce((s, i) => s + (i.quantity || 1), 0) || 1,
      item_weight: Number(body.weight) || cfg.default_weight || 0.5,
      amount_to_collect: Math.max(0, Math.round(Number(body.amount_to_collect) || 0)),
      item_description: items.map((i) => `${i.product_name} (${i.size}) ×${i.quantity}`).join(", ").slice(0, 250),
    });

    await db.from("orders").update({ tracking_number: parcel.consignment_id, order_status: "processing" }).eq("id", order.id);
    await db.from("order_status_history").insert({
      order_id: order.id,
      status: "processing",
      notes: `Booked with Pathao — consignment ${parcel.consignment_id}, delivery fee ৳${parcel.delivery_fee ?? "?"}`,
      changed_by: admin.email || "admin",
    });
    return NextResponse.json({ ok: true, consignment_id: parcel.consignment_id, delivery_fee: parcel.delivery_fee });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
