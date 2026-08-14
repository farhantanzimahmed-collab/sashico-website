import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";
import ExportButton from "@/components/admin/ExportButton";
import DeleteCustomerButton from "@/components/admin/DeleteCustomerButton";
import DateRangeDelete from "@/components/admin/DateRangeDelete";

export const revalidate = 0;

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-sans text-2xl font-bold text-brand-black">Customers</h1>
          <p className="text-sm text-brand-gray-500 font-sans mt-1">{customers?.length || 0} total customers</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeDelete type="customers" />
          <ExportButton type="customers" />
        </div>
      </div>

      <div className="bg-white border border-brand-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-gray-100 bg-brand-gray-50">
                {["Customer", "Phone", "Orders", "Total Spent", "Joined", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-2xs uppercase tracking-wider text-brand-gray-400 font-sans font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!customers?.length ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-brand-gray-400 font-sans">
                    No customers yet
                  </td>
                </tr>
              ) : (
                customers.map((customer: any) => (
                  <tr key={customer.id} className="border-b border-brand-gray-50 hover:bg-brand-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-sans font-medium text-brand-black">{customer.name}</p>
                      <p className="text-2xs text-brand-gray-400 font-sans">{customer.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-sans text-brand-gray-600">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-sans text-brand-gray-700 text-center">
                      {customer.total_orders}
                    </td>
                    <td className="px-6 py-4 text-sm font-sans font-medium text-brand-black">
                      {formatPrice(customer.total_spent || 0)}
                    </td>
                    <td className="px-6 py-4 text-xs font-sans text-brand-gray-500">
                      {formatDate(customer.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <DeleteCustomerButton
                        customerId={customer.id}
                        customerName={customer.name}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
