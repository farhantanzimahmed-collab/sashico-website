import { redirect } from "next/navigation";
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
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-sans text-brand-black">{order.customer_name}</p>
                        <p className="text-2xs text-brand-gray-400 font-sans">{order.customer_phone}</p>
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
