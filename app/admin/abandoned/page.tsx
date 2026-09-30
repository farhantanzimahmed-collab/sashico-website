import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/adminAuth";
import { formatPrice, formatDate } from "@/lib/utils";
import AbandonedActions from "./AbandonedActions";

export const metadata = { title: "Abandoned Carts | Admin" };
export const revalidate = 0;

interface Cart {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  items: { product_name: string; size: string; quantity: number }[];
  total_amount: number;
  status: string;
  notified_at: string | null;
  updated_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  contacted: "bg-blue-100 text-blue-800",
  recovered: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

export default async function AbandonedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data, error } = await serviceClient()
    .from("abandoned_checkouts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  const carts = (data as Cart[]) || [];
  // Only carts idle 30+ min count as abandoned; fresher ones may still be checking out
  const idle = (c: Cart) => Date.now() - new Date(c.updated_at).getTime() > 30 * 60 * 1000;
  const open = carts.filter((c) => c.status === "open" && idle(c));
  const recovered = carts.filter((c) => c.status === "recovered");

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-brand-black">Abandoned Carts</h1>
        <p className="text-sm text-brand-gray-500 font-sans mt-1">
          Shoppers who typed their phone at checkout but didn&apos;t place the order. Call or WhatsApp them — many just need a nudge.
        </p>
      </div>

      {error ? (
        <div className="border border-yellow-200 bg-yellow-50 p-4 text-sm font-sans text-yellow-800">
          Not active yet — run the database update (supabase/migrations/20260930_growth_features.sql) to switch this on.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-xl">
            {[["To follow up", open.length], ["Recovered", recovered.length], ["Recovered value", formatPrice(recovered.reduce((s, c) => s + Number(c.total_amount), 0))]].map(([label, value]) => (
              <div key={String(label)} className="bg-white border border-brand-gray-100 p-4">
                <p className="text-2xs uppercase tracking-wider text-brand-gray-500 font-sans">{label}</p>
                <p className="text-xl font-sans font-semibold text-brand-black mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-brand-gray-100 overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-brand-gray-100 bg-brand-gray-50 text-left text-2xs uppercase tracking-wider text-brand-gray-400">
                  {["Customer", "Cart", "Value", "Last activity", "Status", ""].map((h) => (
                    <th key={h} className="px-5 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carts.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-brand-gray-400">No abandoned checkouts yet.</td></tr>
                )}
                {carts.map((c) => (
                  <tr key={c.id} className="border-b border-brand-gray-100 align-top">
                    <td className="px-5 py-4">
                      <p className="text-brand-black">{c.customer_name || "—"}</p>
                      <a href={`tel:${c.customer_phone}`} className="text-xs text-brand-gray-600 underline">{c.customer_phone}</a>
                    </td>
                    <td className="px-5 py-4 text-xs text-brand-gray-600">
                      {c.items.map((i, n) => <p key={n}>{i.product_name} ({i.size}) ×{i.quantity}</p>)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">{formatPrice(c.total_amount)}</td>
                    <td className="px-5 py-4 text-xs text-brand-gray-500 whitespace-nowrap">{formatDate(c.updated_at)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 text-2xs uppercase tracking-wider ${STATUS_STYLE[c.status] || ""}`}>
                        {c.status === "open" && !idle(c) ? "checking out" : c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <AbandonedActions id={c.id} phone={c.customer_phone} name={c.customer_name} status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
