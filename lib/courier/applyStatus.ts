import { serviceClient } from "@/lib/adminAuth";
import { mapPathaoStatus } from "@/lib/courier/pathao";

/** Apply a Pathao parcel status to our order + audit trail. Returns true if the order changed. */
export async function applyPathaoStatus(orderId: string, pathaoStatus: string, source: string): Promise<boolean> {
  const db = serviceClient();
  const { data: order } = await db.from("orders").select("order_status, payment_status").eq("id", orderId).single();
  if (!order) return false;

  const mapped = mapPathaoStatus(pathaoStatus) || {};
  const update: Record<string, string> = {};
  if (mapped.order_status && mapped.order_status !== order.order_status) update.order_status = mapped.order_status;
  if (mapped.payment_status && mapped.payment_status !== order.payment_status) update.payment_status = mapped.payment_status;
  if (Object.keys(update).length) await db.from("orders").update(update).eq("id", orderId);

  await db.from("order_status_history").insert({
    order_id: orderId,
    status: update.order_status || order.order_status,
    notes: `Pathao: ${pathaoStatus}`,
    changed_by: source,
  });
  return Object.keys(update).length > 0;
}
