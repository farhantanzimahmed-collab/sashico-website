import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteSettings } from "@/lib/types";
import SiteSettingsForm from "./SiteSettingsForm";

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: settings } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-brand-black">Site Settings</h1>
        <p className="text-sm text-brand-gray-500 font-sans mt-1">
          Manage your store content, contact info, and shipping settings.
        </p>
      </div>
      <div className="max-w-3xl">
        <SiteSettingsForm settings={settings as SiteSettings | null} />
      </div>
    </div>
  );
}
