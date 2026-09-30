import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serviceClient } from "@/lib/adminAuth";
import { verifyReviewToken } from "@/lib/reviews";
import { getImageUrl } from "@/lib/utils";
import ReviewForm from "./ReviewForm";

export const metadata: Metadata = {
  title: "Review your order",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const orderId = verifyReviewToken(token);
  if (!orderId) notFound();

  const db = serviceClient();
  const { data: order } = await db.from("orders").select("id, order_number, customer_name, order_status, items").eq("id", orderId).single();
  if (!order) notFound();

  // One card per distinct product in the order
  const items = (order.items as { product_id: string; product_name: string; product_image: string; size: string }[]) || [];
  const products = [...new Map(items.map((i) => [i.product_id, i])).values()];

  const { data: existing } = await db.from("reviews").select("product_id").eq("order_id", order.id);
  const done = new Set((existing || []).map((r) => r.product_id));
  const firstName = String(order.customer_name || "").split(" ")[0];

  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="container-xl max-w-2xl">
        <p className="label-xs text-brand-gray-500 mb-3">Order {order.order_number}</p>
        <h1 className="display-heading text-4xl sm:text-5xl text-black mb-4">How did we do{firstName ? `, ${firstName}` : ""}?</h1>
        {order.order_status !== "delivered" ? (
          <p className="text-brand-gray-600">You can leave a review once your order has been delivered. We&apos;ll send you this link again then. 🖤</p>
        ) : (
          <>
            <p className="text-brand-gray-600 mb-10">
              Your review helps other shoppers — and a photo of you wearing it helps even more. Thank you for choosing Sashico 🖤
            </p>
            <div className="space-y-8">
              {products.map((p) => (
                <ReviewForm
                  key={p.product_id}
                  token={token}
                  productId={p.product_id}
                  productName={p.product_name}
                  productImage={getImageUrl(p.product_image)}
                  defaultName={order.customer_name || ""}
                  alreadyReviewed={done.has(p.product_id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
