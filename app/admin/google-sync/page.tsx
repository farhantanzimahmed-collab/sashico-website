import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GoogleSyncClient from "./GoogleSyncClient";

export const metadata = { title: "Google Sync | Admin" };

export default async function GoogleSyncPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: config } = await supabase
    .from("google_sync_config")
    .select("*")
    .eq("id", 1)
    .single();

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-brand-black">Google Sync</h1>
        <p className="text-sm font-sans text-brand-gray-500 mt-1">
          Import products from Google Sheets + images from Google Drive into Sashico
        </p>
      </div>
      <GoogleSyncClient initialConfig={config ?? {}} />
    </div>
  );
}
