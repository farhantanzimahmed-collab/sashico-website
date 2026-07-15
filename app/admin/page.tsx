import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Package, ShoppingCart, Users, TrendingUp, Clock, CheckCircle, XCircle, Truck } from "lucide-react";
import { formatPrice, ORDER_STATUS_LABELS } from "@/lib/utils";
import Link from "next/link";

export const revalidate = 30;

async function getAdminData() {
  const supabase = await createClient();

  const [
    { data: { user } },
    { count: productCount },
    { count: orderCount },
    { count: customerCount },
    { data: allOrders },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("total_amount, order_status, payment_status, created_at, items"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8),
  ]);

  if (!user) redirect("/admin/login");
  const { data: adminUser } = await supabase.from("admin_users").select("id").eq("user_id", user.id).single();
  if (!adminUser) redirect("/admin/login");

  const orders = allOrders || [];

  // Revenue totals
  const totalRevenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((s, o) => s + Number(o.total_amount), 0);

  const allRevenue = orders.reduce((s, o) => s + Number(o.total_amount), 0);

  // Order status counts
  const statusCounts = {
    pending:   orders.filter((o) => o.order_status === "pending").length,
    confirmed: orders.filter((o) => o.order_status === "confirmed").length,
    processing:orders.filter((o) => o.order_status === "processing").length,
    shipped:   orders.filter((o) => o.order_status === "shipped").length,
    delivered: orders.filter((o) => o.order_status === "delivered").length,
    cancelled: orders.filter((o) => o.order_status === "cancelled").length,
  };

  // Monthly revenue — last 6 months
  const now = new Date();
  const months: { label: string; revenue: number; orders: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en", { month: "short" });
    const yr = d.getFullYear();
    const mo = d.getMonth();
    const monthOrders = orders.filter((o) => {
      const od = new Date(o.created_at);
      return od.getFullYear() === yr && od.getMonth() === mo;
    });
    months.push({
      label,
      revenue: monthOrders.reduce((s, o) => s + Number(o.total_amount), 0),
      orders: monthOrders.length,
    });
  }

  // Best-selling products from order items JSONB
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const order of orders) {
    const items: any[] = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const id = item.product_id || item.product_slug || item.product_name;
      if (!id) continue;
      if (!productSales[id]) productSales[id] = { name: item.product_name || id, qty: 0, revenue: 0 };
      productSales[id].qty += item.quantity || 1;
      productSales[id].revenue += item.total_price || 0;
    }
  }
  const bestSellers = Object.values(productSales)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    productCount: productCount || 0,
    orderCount: orderCount || 0,
    customerCount: customerCount || 0,
    totalRevenue,
    allRevenue,
    statusCounts,
    months,
    bestSellers,
    recentOrders: recentOrders || [],
  };
}

function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <div className="bg-white border border-brand-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-sans uppercase tracking-widest text-brand-gray-400 mb-2">{title}</p>
          <p className="text-2xl font-sans font-bold text-brand-black">{value}</p>
          {sub && <p className="text-xs text-brand-gray-400 font-sans mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-sm ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const {
    productCount, orderCount, customerCount,
    totalRevenue, allRevenue,
    statusCounts, months, bestSellers, recentOrders,
  } = await getAdminData();

  const maxMonthRevenue = Math.max(...months.map((m) => m.revenue), 1);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-sans text-xl font-bold text-brand-black">Dashboard</h1>
        <p className="text-sm text-brand-gray-400 font-sans mt-0.5">Live overview of your store</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Revenue (Paid)" value={formatPrice(totalRevenue)} sub="From paid orders" icon={TrendingUp} color="bg-green-50 text-green-600" />
        <StatCard title="Total Orders" value={orderCount} sub={`${formatPrice(allRevenue)} total value`} icon={ShoppingCart} color="bg-blue-50 text-blue-600" />
        <StatCard title="Active Products" value={productCount} sub="In store" icon={Package} color="bg-purple-50 text-purple-600" />
        <StatCard title="Customers" value={customerCount} sub="Registered" icon={Users} color="bg-orange-50 text-orange-600" />
      </div>

      {/* Order status + Monthly revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Order status breakdown */}
        <div className="bg-white border border-brand-gray-100 p-6">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-brand-black mb-5">Order Status</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Pending",    value: statusCounts.pending,    icon: Clock,        bg: "bg-yellow-50", text: "text-yellow-600" },
              { label: "Processing", value: statusCounts.processing + statusCounts.confirmed, icon: Package, bg: "bg-blue-50", text: "text-blue-600" },
              { label: "Shipped",    value: statusCounts.shipped,    icon: Truck,        bg: "bg-indigo-50", text: "text-indigo-600" },
              { label: "Delivered",  value: statusCounts.delivered,  icon: CheckCircle,  bg: "bg-green-50",  text: "text-green-600" },
              { label: "Cancelled",  value: statusCounts.cancelled,  icon: XCircle,      bg: "bg-red-50",    text: "text-red-500" },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-3 p-3 ${s.bg} rounded-sm`}>
                <s.icon className={`h-4 w-4 ${s.text} flex-shrink-0`} />
                <div>
                  <p className={`text-lg font-bold font-sans ${s.text}`}>{s.value}</p>
                  <p className="text-xs text-brand-gray-500 font-sans">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly revenue chart */}
        <div className="bg-white border border-brand-gray-100 p-6">
          <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-brand-black mb-5">Monthly Revenue (Last 6 Months)</h2>
          <div className="flex items-end gap-2 h-32">
            {months.map((m) => {
              const pct = maxMonthRevenue > 0 ? (m.revenue / maxMonthRevenue) * 100 : 0;
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex flex-col justify-end" style={{ height: "96px" }}>
                    <div
                      className="w-full bg-brand-black hover:bg-brand-gray-700 transition-colors cursor-default"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                      title={`${m.label}: ${formatPrice(m.revenue)} (${m.orders} orders)`}
                    />
                  </div>
                  <p className="text-[10px] font-sans text-brand-gray-400">{m.label}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 border-t border-brand-gray-100 pt-3 flex justify-between text-xs font-sans text-brand-gray-400">
            <span>{months[0]?.label} – {months[months.length - 1]?.label}</span>
            <span>Total: {formatPrice(months.reduce((s, m) => s + m.revenue, 0))}</span>
          </div>
        </div>
      </div>

      {/* Best sellers + Recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Best sellers */}
        <div className="bg-white border border-brand-gray-100">
          <div className="px-6 py-4 border-b border-brand-gray-100">
            <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-brand-black">Best Sellers</h2>
          </div>
          <div className="divide-y divide-brand-gray-50">
            {bestSellers.length === 0 ? (
              <p className="px-6 py-10 text-sm text-brand-gray-400 font-sans text-center">No order data yet</p>
            ) : bestSellers.map((p, i) => (
              <div key={p.name} className="flex items-center gap-4 px-6 py-3">
                <span className="text-xs font-sans font-bold text-brand-gray-300 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-sans font-medium text-brand-black truncate">{p.name}</p>
                  <p className="text-xs text-brand-gray-400 font-sans">{p.qty} sold</p>
                </div>
                <span className="text-sm font-sans font-semibold text-brand-black">{formatPrice(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white border border-brand-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gray-100">
            <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-brand-black">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-brand-gray-400 hover:text-brand-black font-sans transition-colors">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-gray-100">
                  {["Order #", "Customer", "Total", "Status", "Date"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-brand-gray-400 font-sans">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-brand-gray-400 font-sans">No orders yet</td></tr>
                ) : recentOrders.map((order: any) => {
                  const status = ORDER_STATUS_LABELS[order.order_status as keyof typeof ORDER_STATUS_LABELS];
                  return (
                    <tr key={order.id} className="border-b border-brand-gray-50 hover:bg-brand-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-sans font-medium text-brand-black">
                        <Link href={`/admin/orders/${order.id}`} className="hover:underline">{order.order_number}</Link>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-sans text-brand-gray-600">{order.customer_name}</td>
                      <td className="px-5 py-3.5 text-sm font-sans font-medium text-brand-black">{formatPrice(order.total_amount)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 text-[10px] font-sans uppercase tracking-wider ${status?.color || "bg-gray-100 text-gray-600"}`}>
                          {status?.label || order.order_status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-sans text-brand-gray-400">
                        {new Date(order.created_at).toLocaleDateString("en-BD")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
