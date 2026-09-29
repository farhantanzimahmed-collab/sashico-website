import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminAuth";
import { getPathaoOrderInfo } from "@/lib/courier/pathao";
import { applyPathaoStatus } from "@/lib/courier/applyStatus";

// POST { orderId } — pull the latest parcel status from Pathao
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId } = await req.json();
  const { data: order } = await serviceClient().from("orders").select("id, tracking_number").eq("id", orderId).single();
  if (!order?.tracking_number) return NextResponse.json({ error: "This order isn't booked with Pathao" }, { status: 400 });
  try {
    const info = await getPathaoOrderInfo(order.tracking_number);
    const status = info.order_status_slug || info.order_status;
    const changed = await applyPathaoStatus(order.id, status, "pathao_refresh");
    return NextResponse.json({ ok: true, pathao_status: info.order_status, changed });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
