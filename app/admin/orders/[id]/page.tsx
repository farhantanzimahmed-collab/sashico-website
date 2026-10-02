import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Order } from "@/lib/types";
import { formatPrice, formatDate, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, getImageUrl } from "@/lib/utils";
import OrderStatusUpdater from "./OrderStatusUpdater";
import PathaoPanel from "./PathaoPanel";
import { serviceClient } from "@/lib/adminAuth";
import { readPathaoConfig } from "@/lib/courier/pathao";
import { summarizeHistory, RISK_STYLES } from "@/lib/customerHistory";
import { sourceLabel, OrderAttribution } from "@/lib/orderSource";
import { reviewUrl } from "@/lib/reviews";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const orderId = id;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (!order) notFound();

  const o = order as Order;

  // Fraud check: this phone's track record across all Sashico orders
  const { data: phoneOrders } = await serviceClient().from("orders").select("id, customer_phone, order_status, order_number, created_at").order("created_at", { ascending: false });
  const history = summarizeHistory(o.customer_phone, phoneOrders || [], o.id);
  const risk = RISK_STYLES[history.risk];
  const pathaoConfig = await readPathaoConfig().catch(() => null);
  const { data: statusLog } = await serviceClient().from("order_status_history").select("status, notes, changed_at, changed_by").eq("order_id", o.id).order("changed_at", { ascending: false }).limit(10);
  const orderStatus = ORDER_STATUS_LABELS[o.order_status];
  const paymentStatus = PAYMENT_STATUS_LABELS[o.payment_status];

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <Link
          href="/admin/orders"
          className="flex items-center gap-1.5 text-2xs uppercase tracking-widest font-sans text-brand-gray-500 hover:text-brand-black transition-colors mb-4"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Orders
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-bold text-brand-black">
              {o.order_number}
            </h1>
            <p className="text-sm text-brand-gray-500 font-sans mt-1">
              Placed on {formatDate(o.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1.5 text-2xs font-sans uppercase tracking-wider ${paymentStatus?.color}`}>
              {paymentStatus?.label}
            </span>
            <span className={`px-3 py-1.5 text-2xs font-sans uppercase tracking-wider ${orderStatus?.color}`}>
              {orderStatus?.label}
            </span>
            <a
              href={`/api/admin/orders/${orderId}/invoice`}
              download
              className="flex items-center gap-1.5 bg-brand-black text-white border border-brand-black px-3 py-1.5 text-2xs font-sans uppercase tracking-wider hover:bg-brand-gray-800 transition-colors"
            >
              Download Invoice (PDF)
            </a>
            <a
              href={`/api/admin/orders/${orderId}/invoice?inline=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-brand-gray-200 px-3 py-1.5 text-2xs font-sans uppercase tracking-wider text-brand-gray-700 hover:border-brand-black transition-colors"
            >
              View / Print
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Items & Status Update */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white border border-brand-gray-100 p-6">
            <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black mb-5">
              Items ({o.items?.reduce((s: number, i: any) => s + i.quantity, 0)})
            </h2>
            <div className="space-y-5">
              {o.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-4">
                  <div className="relative w-14 h-18 flex-shrink-0 bg-brand-gray-50">
                    <Image
                      src={getImageUrl(item.product_image)}
                      alt={item.product_name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-sans font-medium text-brand-black">
                      {item.product_name}
                    </p>
                    <p className="text-2xs text-brand-gray-400 font-sans mt-0.5">
                      Size: {item.size} × {item.quantity}
                    </p>
                    <p className="text-sm font-sans font-semibold text-brand-black mt-1">
                      {formatPrice(item.total_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-brand-gray-100 space-y-2 text-sm font-sans">
              <div className="flex justify-between">
                <span className="text-brand-gray-600">Subtotal</span>
                <span>{formatPrice(o.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-gray-600">Shipping</span>
                <span>{o.shipping_cost === 0 ? "Free" : formatPrice(o.shipping_cost)}</span>
              </div>
              <div className="flex justify-between font-semibold text-brand-black border-t border-brand-gray-100 pt-2">
                <span>Total</span>
                <span>{formatPrice(o.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Courier */}
          <div className="bg-white border border-brand-gray-100 p-6">
            <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black mb-5">
              Courier — Pathao
            </h2>
            <PathaoPanel
              orderId={o.id}
              consignmentId={o.tracking_number ?? null}
              district={o.shipping_address?.district || (o.shipping_address as { division?: string })?.division || ""}
              area={o.shipping_address?.city || ""}
              codAmount={o.payment_method === "cod" && o.payment_status !== "paid" ? o.total_amount : 0}
              defaultWeight={pathaoConfig?.default_weight}
            />
            {statusLog && statusLog.length > 0 && (
              <ul className="mt-5 pt-4 border-t border-brand-gray-100 space-y-1.5 text-xs font-sans text-brand-gray-600">
                {statusLog.map((h, i) => (
                  <li key={i}>
                    <span className="text-brand-gray-400">{formatDate(h.changed_at)}</span> · {h.notes || h.status}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Update Status */}
          <div className="bg-white border border-brand-gray-100 p-6">
            <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black mb-5">
              Update Order Status
            </h2>
            <OrderStatusUpdater orderId={o.id} currentStatus={o.order_status} currentPayment={o.payment_status} />
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-6">
          <div className="bg-white border border-brand-gray-100 p-6">
            <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black mb-5">
              Customer
            </h2>
            <div className="space-y-3 text-sm font-sans">
              <p className="font-medium text-brand-black">{o.customer_name}</p>
              {/* COD fraud check */}
              <div className="border border-brand-gray-100 p-3 space-y-1.5">
                <span className={`inline-block px-2 py-0.5 text-2xs uppercase tracking-wider ${risk.className}`}>{risk.label}</span>
                {history.total === 0 ? (
                  <p className="text-xs text-brand-gray-600">First order from this phone number.</p>
                ) : (
                  <p className="text-xs text-brand-gray-600">
                    {history.total} previous order{history.total > 1 ? "s" : ""}: {history.delivered} delivered · {history.cancelled} cancelled/returned
                    {history.inProgress ? ` · ${history.inProgress} in progress` : ""}
                    {history.successRate !== null && <> · <strong className="text-brand-black">{history.successRate}% success</strong></>}
                  </p>
                )}
              </div>
              <a href={`mailto:${o.customer_email}`} className="text-brand-gray-600 hover:text-brand-black transition-colors block">
                {o.customer_email}
              </a>
              <a href={`tel:${o.customer_phone}`} className="text-brand-gray-600 hover:text-brand-black transition-colors block">
                {o.customer_phone}
              </a>
            </div>
          </div>

          <div className="bg-white border border-brand-gray-100 p-6">
            <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black mb-5">
              Shipping Address
            </h2>
            <address className="not-italic text-sm font-sans text-brand-gray-600 leading-relaxed">
              {o.shipping_address.street}<br />
              {o.shipping_address.city}, {o.shipping_address.district}<br />
              {o.shipping_address.postal_code && <>{o.shipping_address.postal_code}<br /></>}
              {o.shipping_address.country}
            </address>
          </div>

          {o.order_status === "delivered" && (() => {
            const link = reviewUrl(o.id);
            const first = String(o.customer_name || "").split(" ")[0];
            const msg = `Hi ${first}! Thank you for shopping with Sashico 🖤 How do you like your order? We'd love a quick review (a photo wearing it would be amazing): ${link}`;
            const phone = String(o.customer_phone).replace(/\D/g, "").replace(/^0/, "880");
            return (
              <div className="bg-white border border-brand-gray-100 p-6">
                <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black mb-3">
                  Ask for a review
                </h2>
                <a href={`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"
                  className="inline-block border border-black bg-black text-white px-4 py-2.5 text-2xs uppercase tracking-wider font-sans">
                  Send review request on WhatsApp
                </a>
                <p className="text-xs font-sans text-brand-gray-500 mt-3 break-all">Link: {link}</p>
              </div>
            );
          })()}

          {(() => {
            const src = sourceLabel((o as Order & { attribution?: OrderAttribution | null }).attribution);
            return (
              <div className="bg-white border border-brand-gray-100 p-6">
                <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black mb-3">
                  Came from
                </h2>
                <p className="text-sm font-sans text-brand-black">{src.channel}</p>
                {src.campaign && <p className="text-xs font-sans text-brand-gray-600 mt-1">Campaign: {src.campaign}</p>}
                {src.ad && <p className="text-xs font-sans text-brand-gray-600">Ad: {src.ad}</p>}
              </div>
            );
          })()}

          <div className="bg-white border border-brand-gray-100 p-6">
            <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black mb-3">
              Payment Method
            </h2>
            <p className="text-sm font-sans text-brand-gray-700 capitalize">
              {o.payment_method === "cod" ? "Cash on Delivery" : o.payment_method}
            </p>
          </div>

          {o.notes && (
            <div className="bg-white border border-brand-gray-100 p-6">
              <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black mb-3">
                Notes
              </h2>
              <p className="text-sm font-sans text-brand-gray-600">{o.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
