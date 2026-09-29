import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CourierSettings from "./CourierSettings";

export const metadata = { title: "Courier | Admin" };
export const revalidate = 0;

export default async function CourierPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-brand-black">Courier — Pathao</h1>
        <p className="text-sm font-sans text-brand-gray-500 mt-1">
          Connect your Pathao merchant account to book parcels from any order in one click.
        </p>
      </div>
      <CourierSettings />
    </div>
  );
}
