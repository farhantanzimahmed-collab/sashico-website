import { Metadata } from "next";
import { Suspense } from "react";
import Hero from "@/components/home/Hero";
import ProductSection from "@/components/home/ProductSection";
import Reviews from "@/components/home/Reviews";
import Newsletter from "@/components/home/Newsletter";
import { getCachedHomeProducts } from "@/lib/cache";
import { SiteSettings } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: "Sashico — Premium Streetwear in Bangladesh" },
  description:
    "Discover Sashico, a Bangladesh-based streetwear brand creating premium T-shirts, hoodies and contemporary urban apparel.",
  alternates: { canonical: "/" },
};

// revalidate is now controlled inside getCachedHomeProducts (180s)
// This page itself can be long-lived since data comes from cache
export const revalidate = 180;

const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  site_name: "Sashico",
  tagline: "Premium Embroidery Streetwear",
  hero_title: "Wear the Culture",
  hero_subtitle: "Premium embroidery streetwear",
  hero_image: null,
  hero_video: null,
  hero_cta_text: "Shop Collection",
  about_title: "Crafted With Intention",
  about_content:
    "Sashico was born from a deep reverence for the art of embroidery — a craft that has been part of Bangladesh's cultural identity for centuries.",
  about_image: null,
  contact_email: "sashicofficial2020@gmail.com",
  contact_phone: "01628340463",
  contact_address: "Dhaka, Bangladesh",
  instagram_url: null,
  facebook_url: null,
  tiktok_url: null,
  youtube_url: null,
  shipping_cost: 80,
  free_shipping_threshold: 2000,
  currency: "BDT",
  currency_symbol: "৳",
  announcement_bar_text: null,
  announcement_bar_enabled: false,
  updated_at: new Date().toISOString(),
};

export default async function HomePage() {
  // Single cached call — all concurrent visitors share this result
  const { settings, allProducts, newArrivals, featured, reviews } =
    await getCachedHomeProducts();

  const siteSettings = settings || DEFAULT_SETTINGS;

  const settingsHeroImages = [
    siteSettings.hero_image_1 ?? null,
    siteSettings.hero_image_2 ?? null,
    siteSettings.hero_image_3 ?? null,
    siteSettings.hero_image_4 ?? null,
  ];
  const hasSettingsImages = settingsHeroImages.some(Boolean);
  const heroImages = hasSettingsImages
    ? settingsHeroImages
    : [...featured, ...newArrivals]
        .filter((p) => p.images?.length > 0)
        .slice(0, 4)
        .map((p) => p.images[0]);

  return (
    <>
      <Hero settings={siteSettings} featuredImages={heroImages} />

      {allProducts.length > 0 && (
        <ProductSection
          title="Shop All"
          subtitle="The full Sashico collection"
          products={allProducts}
          viewAllHref="/shop"
          viewAllLabel="View All Products"
          index={1}
          bottomButtonOnDesktop
        />
      )}
      <Suspense fallback={null}>
        <Reviews reviews={reviews} />
      </Suspense>
      <Newsletter />
    </>
  );
}
