import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GoogleSyncClient from "./GoogleSyncClient";

export const metadata = { title: "Google Sync | Admin" };

export default async function GoogleSyncPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Load config from Storage via API — fetch from same origin
  let config: Record<string, string> = {};
  try {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await svc.storage.from("sashico-config").download("google-sync.json");
    if (data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      const { credentials: _, ...safe } = parsed; // strip credentials
      config = { ...safe, has_credentials: parsed.credentials ? "true" : "false" };
    }
  } catch {}

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-brand-black">Google Sync</h1>
        <p className="text-sm font-sans text-brand-gray-500 mt-1">
          Import products from Google Sheets + images from Google Drive into Sashico
        </p>
      </div>
      <GoogleSyncClient initialConfig={config} />
    </div>
  );
}
