import { redirect } from "next/navigation";
import { summarizeHistory, RISK_STYLES } from "@/lib/customerHistory";
import { sourceLabel, OrderAttribution } from "@/lib/orderSource";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Order } from "@/lib/types";
import { formatPrice, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/utils";
import ExportButton from "@/components/admin/ExportButton";
import DeleteOrderButton from "@/components/admin/DeleteOrderButton";
import DateRangeDelete from "@/components/admin/DateRangeDelete";

export const revalidate = 0;

async function getOrders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  return (data as Order[]) || [];
}

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-brand-black">Orders</h1>
          <p className="text-sm text-brand-gray-500 font-sans mt-1">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeDelete type="orders" />
          <ExportButton type="orders" />
        </div>
      </div>

      {/* Sales by source / campaign — last 30 days, excluding cancelled */}
      {(() => {
        const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const rows = new Map<string, { orders: number; revenue: number; delivered: number }>();
        for (const o of orders) {
          if (new Date(o.created_at).getTime() < since || o.order_status === "cancelled") continue;
          const src = sourceLabel((o as Order & { attribution?: OrderAttribution | null }).attribution);
          const key = src.campaign ? `${src.channel} · ${src.campaign}` : src.channel;
          const r = rows.get(key) ?? { orders: 0, revenue: 0, delivered: 0 };
          r.orders += 1;
          r.revenue += Number(o.total_amount) || 0;
          if (o.order_status === "delivered") r.delivered += 1;
          rows.set(key, r);
        }
        const list = [...rows.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
        if (!list.length) return null;
        return (
          <div className="bg-white border border-brand-gray-100 mb-6">
            <p className="px-5 pt-4 text-2xs uppercase tracking-wider text-brand-gray-500 font-sans">Sales by source — last 30 days (excl. cancelled)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="text-left text-2xs uppercase tracking-wider text-brand-gray-400">
                    <th className="px-5 py-2 font-medium">Source / campaign</th>
                    <th className="px-5 py-2 font-medium">Orders</th>
                    <th className="px-5 py-2 font-medium">Delivered</th>
                    <th className="px-5 py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(([key, r]) => (
                    <tr key={key} className="border-t border-brand-gray-100">
                      <td className="px-5 py-2.5 text-brand-black">{key}</td>
                      <td className="px-5 py-2.5">{r.orders}</td>
                      <td className="px-5 py-2.5">{r.delivered}</td>
                      <td className="px-5 py-2.5">{formatPrice(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      <div className="bg-white border border-brand-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-gray-100 bg-brand-gray-50">
                {["Order #", "Customer", "Items", "Total", "Payment", "Status", "Date", "", ""].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-2xs uppercase tracking-wider text-brand-gray-400 font-sans font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-sm text-brand-gray-400 font-sans">
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const orderStatus = ORDER_STATUS_LABELS[order.order_status];
                  const paymentStatus = PAYMENT_STATUS_LABELS[order.payment_status];
                  const itemCount = order.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-brand-gray-50 hover:bg-brand-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4 text-sm font-sans font-medium text-brand-black whitespace-nowrap">
                        {order.order_number}
                        {(() => {
                          const src = sourceLabel((order as Order & { attribution?: OrderAttribution | null }).attribution);
                          return (
                            <p className="text-[10px] font-normal uppercase tracking-wider text-brand-gray-500 mt-0.5">
                              {src.channel}{src.campaign ? ` · ${src.campaign}` : ""}
                            </p>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-sans text-brand-black">{order.customer_name}</p>
                        <p className="text-2xs text-brand-gray-400 font-sans">{order.customer_phone}</p>
                        {(() => {
                          // COD fraud check — this phone's history on other orders
                          const h = summarizeHistory(order.customer_phone, orders, order.id);
                          if (h.risk === "new") return null;
                          const r = RISK_STYLES[h.risk];
                          return (
                            <span className={`mt-1 inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${r.className}`}>
                              {r.label} · {h.successRate}%
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-4 text-sm font-sans text-brand-gray-600 text-center">
                        {itemCount}
                      </td>
                      <td className="px-5 py-4 text-sm font-sans font-medium text-brand-black whitespace-nowrap">
                        {formatPrice(order.total_amount)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-2xs font-sans px-2 py-1 uppercase tracking-wider ${paymentStatus?.color}`}>
                          {paymentStatus?.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-2xs font-sans px-2 py-1 uppercase tracking-wider ${orderStatus?.color}`}>
                          {orderStatus?.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-sans text-brand-gray-500 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString("en-BD")}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-2xs uppercase tracking-wider font-sans text-brand-gray-500 hover:text-brand-black transition-colors underline-offset-2 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <DeleteOrderButton
                          orderId={order.id}
                          orderNumber={order.order_number}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
