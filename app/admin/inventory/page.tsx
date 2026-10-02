import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/adminAuth";
import { sortByCollection } from "@/lib/collectionOrder";
import InventoryTable, { type InvRow } from "./InventoryTable";

export const metadata = { title: "Inventory | Admin" };
export const revalidate = 0;

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data } = await serviceClient()
    .from("products")
    .select("id, name, slug, category, price, created_at, is_active, sizes")
    .order("created_at", { ascending: false });
  const products = sortByCollection((data || []) as { id: string; name: string; slug: string; category: string; price: number; created_at: string; is_active: boolean; sizes: { size: string; stock: number; master?: number; reserved?: number; sold?: number }[] }[]);

  const rows: InvRow[] = products.flatMap((p) =>
    (p.sizes || []).map((s) => {
      const reserved = s.reserved ?? 0;
      const master = s.master ?? s.stock + reserved;
      return {
        productId: p.id, name: p.name, slug: p.slug, active: p.is_active, size: s.size,
        master, reserved, available: master - reserved, sold: s.sold ?? 0,
      };
    })
  );
  const totals = rows.filter((r) => r.active).reduce(
    (t, r) => ({ master: t.master + r.master, reserved: t.reserved + r.reserved, available: t.available + Math.max(r.available, 0), sold: t.sold + r.sold }),
    { master: 0, reserved: 0, available: 0, sold: 0 }
  );

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-brand-black">Inventory</h1>
        <p className="text-sm text-brand-gray-500 font-sans mt-1 max-w-3xl">
          Edit <strong>Master</strong> only when new stock arrives or after a stock count. Orders reserve stock automatically,
          cancellations release it, and deliveries remove it from Master. Available = Master − Reserved is what customers can buy.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 max-w-3xl">
        {([["Master", totals.master], ["Reserved", totals.reserved], ["Available", totals.available], ["Sold (delivered)", totals.sold]] as const).map(([l, v]) => (
          <div key={l} className="bg-white border border-brand-gray-100 p-4">
            <p className="text-2xs uppercase tracking-wider text-brand-gray-500 font-sans">{l}</p>
            <p className="text-xl font-sans font-semibold text-brand-black mt-1">{v}</p>
          </div>
        ))}
      </div>
      <InventoryTable rows={rows} />
    </div>
  );
}
