import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/adminAuth";
import { formatPrice } from "@/lib/utils";
import AbandonedTable, { type Cart } from "./AbandonedTable";

export const metadata = { title: "Abandoned Carts | Admin" };
export const revalidate = 0;

export default async function AbandonedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data, error } = await serviceClient()
    .from("abandoned_checkouts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
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
          Shoppers who typed their phone at checkout but didn&apos;t place the order within 30 minutes. Call or WhatsApp
          them — many just need a nudge. Tick boxes to delete carts you no longer need.
        </p>
      </div>

      {error ? (
        <div className="border border-yellow-200 bg-yellow-50 p-4 text-sm font-sans text-yellow-800">
          Not active yet — run the database update (supabase/migrations/20260930_growth_features.sql) to switch this on.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-xl">
            {[
              ["To follow up", open.length],
              ["Recovered", recovered.length],
              ["Recovered value", formatPrice(recovered.reduce((s, c) => s + Number(c.total_amount), 0))],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white border border-brand-gray-100 p-4">
                <p className="text-2xs uppercase tracking-wider text-brand-gray-500 font-sans">{label}</p>
                <p className="text-xl font-sans font-semibold text-brand-black mt-1">{value}</p>
              </div>
            ))}
          </div>
          <AbandonedTable carts={carts} />
        </>
      )}
    </div>
  );
}
