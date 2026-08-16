import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ClientWidgets from "@/components/layout/ClientWidgets";
import { getCachedSiteSettings } from "@/lib/cache";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cached 5 min — all concurrent visitors share one Supabase call
  const settings = await getCachedSiteSettings();

  return (
    <>
      <Navbar settings={settings} />
      <main className="min-h-screen pb-safe-nav lg:pb-0">{children}</main>
      <Footer settings={settings} />
      <ClientWidgets />
    </>
  );
}
