import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingSettings } from "@/lib/types";
import MarketingForm from "./MarketingForm";

export const revalidate = 0;

export default async function AdminMarketingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!adminUser) redirect("/admin/login");

  const { data: settings } = await supabase
    .from("marketing_settings")
    .select("*")
    .eq("id", 1)
    .single();

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-brand-black">
          Marketing Integrations
        </h1>
        <p className="text-sm text-brand-gray-500 font-sans mt-1">
          Manage your tracking pixels and analytics. Changes take effect immediately — no redeploy needed.
        </p>
      </div>

      <div className="max-w-3xl">
        <div className="bg-brand-cream border border-brand-gray-200 px-5 py-4 mb-8">
          <p className="text-sm font-sans text-brand-gray-700">
            <strong className="text-brand-black">How it works:</strong> Enable each integration
            with the toggle, enter your Pixel/Tracking ID, and save. The tracking code
            automatically loads on your store without any code changes.
          </p>
        </div>

        <MarketingForm settings={settings as MarketingSettings | null} />
      </div>
    </div>
  );
}
