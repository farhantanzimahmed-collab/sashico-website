import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import TrackingScripts from "@/components/tracking/TrackingScripts";
import StoreHydration from "@/components/StoreHydration";
import PromoPopup from "@/components/ui/PromoPopup";
import { MarketingSettings } from "@/lib/types";

export const metadata: Metadata = {
  title: {
    default: "Sashico | Premium Embroidery Streetwear",
    template: "%s | Sashico",
  },
  description:
    "Premium embroidery streetwear crafted in Bangladesh. Shop the latest collections of t-shirts, hoodies, and jackets with authentic hand-stitched embroidery.",
  keywords: [
    "Sashico",
    "Bangladesh streetwear",
    "embroidery fashion",
    "premium streetwear",
    "Dhaka fashion",
    "embroidered clothing",
  ],
  authors: [{ name: "Sashico" }],
  creator: "Sashico",
  publisher: "Sashico",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://sashico.vercel.app"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://sashico.com",
    siteName: "Sashico",
    title: "Sashico | Premium Embroidery Streetwear",
    description:
      "Premium embroidery streetwear crafted in Bangladesh. Authentic hand-stitched designs for the modern streetwear enthusiast.",
    images: [
      {
        url: "/og-image.jpg",
        width: 2048,
        height: 899,
        alt: "Sashico - Premium Embroidery Streetwear",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sashico | Premium Embroidery Streetwear",
    description: "Premium embroidery streetwear crafted in Bangladesh.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

async function getMarketingSettings(): Promise<MarketingSettings | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("marketing_settings")
      .select("*")
      .eq("id", 1)
      .single();
    return data;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const marketingSettings = await getMarketingSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://kkvybxtgpczbomjesfxs.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://kkvybxtgpczbomjesfxs.supabase.co" />
      </head>
      <body>
        <PromoPopup />
        {children}
        <StoreHydration />
        <TrackingScripts settings={marketingSettings} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "'Times New Roman', Georgia, serif",
              fontSize: "13px",
              border: "1px solid #D8D8D8",
              borderRadius: "8px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            },
            success: {
              iconTheme: { primary: "#000000", secondary: "#FFFFFF" },
            },
          }}
        />
      </body>
    </html>
  );
}
