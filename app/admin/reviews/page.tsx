import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/adminAuth";
import { formatDate } from "@/lib/utils";
import ReviewActions from "./ReviewActions";

export const metadata = { title: "Reviews | Admin" };
export const revalidate = 0;

interface Row {
  id: string; product_id: string; customer_name: string; rating: number; comment: string | null;
  is_approved: boolean; created_at: string; images?: string[]; verified?: boolean;
}

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const db = serviceClient();
  const { data } = await db.from("reviews").select("*").order("created_at", { ascending: false }).limit(300);
  const reviews = (data as Row[]) || [];
  const { data: products } = await db.from("products").select("id, name, slug");
  const productOf = new Map((products || []).map((p) => [p.id, p]));
  const pending = reviews.filter((r) => !r.is_approved);

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-brand-black">Reviews</h1>
        <p className="text-sm text-brand-gray-500 font-sans mt-1">
          {pending.length} waiting for approval. Reviews appear on the website only after you approve them.
          Send customers a review link from any delivered order.
        </p>
      </div>
      <div className="space-y-4 max-w-4xl">
        {reviews.length === 0 && <p className="text-sm text-brand-gray-400 font-sans">No reviews yet.</p>}
        {reviews.map((r) => {
          const product = productOf.get(r.product_id);
          return (
            <div key={r.id} className={`bg-white border p-5 ${r.is_approved ? "border-brand-gray-100" : "border-yellow-300"}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-sans text-brand-black">
                    {"★".repeat(r.rating)}<span className="text-brand-gray-300">{"★".repeat(5 - r.rating)}</span>
                    <span className="ml-3 font-medium">{r.customer_name}</span>
                    {r.verified && <span className="ml-2 text-[10px] uppercase tracking-wider bg-green-100 text-green-800 px-1.5 py-0.5">Verified buyer</span>}
                  </p>
                  <p className="text-xs font-sans text-brand-gray-500 mt-1">
                    {product ? <a href={`/shop/${product.slug}`} target="_blank" className="underline">{product.name}</a> : "Deleted product"} · {formatDate(r.created_at)}
                  </p>
                  {r.comment && <p className="text-sm font-sans text-brand-gray-700 mt-3">&ldquo;{r.comment}&rdquo;</p>}
                  {!!r.images?.length && (
                    <div className="flex gap-2 mt-3">
                      {r.images.map((src) => (
                        <a key={src} href={src} target="_blank" className="relative block h-20 w-20 overflow-hidden border border-brand-gray-100">
                          <Image src={src} alt="Customer photo" fill sizes="80px" className="object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <ReviewActions id={r.id} approved={r.is_approved} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
