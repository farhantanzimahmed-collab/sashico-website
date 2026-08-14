import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ClientWidgets from "@/components/layout/ClientWidgets";
import { createClient } from "@/lib/supabase/server";
import { SiteSettings } from "@/lib/types";

async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();
    return data;
  } catch {
    return null;
  }
}

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

  return (
    <>
      <Navbar settings={settings} />
      <main className="min-h-screen pb-safe-nav lg:pb-0">{children}</main>
      <Footer settings={settings} />
      <ClientWidgets />
    </>
  );
}
