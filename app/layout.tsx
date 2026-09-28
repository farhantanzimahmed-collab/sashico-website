import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import TrackingScripts from "@/components/tracking/TrackingScripts";
import RouteChangeTracker from "@/components/tracking/RouteChangeTracker";
import StoreHydration from "@/components/StoreHydration";
import PromoPopup from "@/components/ui/PromoPopup";
import { getCachedMarketingSettings, getCachedSiteSettings } from "@/lib/cache";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION, OG_IMAGE, siteJsonLd, jsonLdScript } from "@/lib/seo";

// Explicit viewport export — ensures correct mobile rendering and eliminates
// the 300ms tap delay on Android browsers older than Chrome 55
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: "%s | Sashico",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Sashico",
  keywords: [
    "Sashico",
    "Sashico Bangladesh",
    "Sashico clothing",
    "Sashico streetwear",
    "Sashico T-shirt",
    "Sashico hoodie",
    "Bangladesh streetwear",
    "premium streetwear Bangladesh",
    "embroidered clothing Bangladesh",
  ],
  authors: [{ name: "Sashico", url: SITE_URL }],
  creator: "Sashico",
  publisher: "Sashico",
  category: "Clothing",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Sashico",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 2048,
        height: 899,
        alt: "Sashico — Premium Streetwear in Bangladesh",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  // Safari / iOS: home-screen name + status bar; don't auto-link numbers as phone calls
  appleWebApp: {
    capable: true,
    title: "Sashico",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
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
  // Meta Business Manager domain verification (Brand Safety → Domains → sashico.net)
  other: {
    "facebook-domain-verification": "26l5od1k78nzn61ji80buyt6kffeft",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cached 10 min — concurrent visitors share one result, not one DB call each
  const [marketingSettings, siteSettings] = await Promise.all([
    getCachedMarketingSettings(),
    getCachedSiteSettings(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Brand entity graph (Organization/OnlineStore + Brand + WebSite) on every page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(siteJsonLd(siteSettings)) }}
        />
        {/* Preload navbar logo — it's the first render-visible branded element */}
        <link rel="preload" href="/sashico-logo.png" as="image" type="image/png" />
        {/* Critical-path preconnects — reduce connection overhead on mobile */}
        <link rel="preconnect" href="https://kkvybxtgpczbomjesfxs.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://kkvybxtgpczbomjesfxs.supabase.co" />
        {/* Third-party analytics — warm connections before scripts fire */}
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://analytics.tiktok.com" />
        <link rel="dns-prefetch" href="https://sc-static.net" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        <PromoPopup />
        {children}
        <StoreHydration />
        <TrackingScripts settings={marketingSettings} />
        <RouteChangeTracker />
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
