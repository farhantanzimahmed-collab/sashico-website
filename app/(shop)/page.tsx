import { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Hero from "@/components/home/Hero";
import ProductSection from "@/components/home/ProductSection";
import Reviews from "@/components/home/Reviews";
import Newsletter from "@/components/home/Newsletter";
import { Product, Review, SiteSettings } from "@/lib/types";

const PRODUCT_COLS = "id,name,slug,price,discount_price,category,category_id,images,sizes,stock_quantity,is_featured,is_new_arrival,is_best_seller,is_active,meta_title,meta_description,description,created_at,updated_at";

export const metadata: Metadata = {
  title: "Sashico | Premium Embroidery Streetwear",
};

export const revalidate = 60;

async function getData() {
  const supabase = await createClient();

  const [settingsRes, newArrivalsRes, featuredRes, bestSellersRes, reviewsRes] =
    await Promise.all([
      supabase.from("site_settings").select("*").eq("id", 1).single(),
      supabase
        .from("products")
        .select(PRODUCT_COLS)
        .eq("is_new_arrival", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("products")
        .select(PRODUCT_COLS)
        .eq("is_featured", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("products")
        .select(PRODUCT_COLS)
        .eq("is_best_seller", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("reviews")
        .select("id,product_id,customer_name,rating,comment,is_approved,created_at")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  return {
    settings: settingsRes.data as SiteSettings | null,
    newArrivals: (newArrivalsRes.data as Product[]) || [],
    featured: (featuredRes.data as Product[]) || [],
    bestSellers: (bestSellersRes.data as Product[]) || [],
    reviews: (reviewsRes.data as Review[]) || [],
  };
}

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
  contact_email: "hello@sashico.com",
  contact_phone: "+880 1700-000000",
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
  const { settings, newArrivals, featured, bestSellers, reviews } = await getData();
  const siteSettings = settings || DEFAULT_SETTINGS;

  // Use admin-set hero images if available, otherwise fall back to product images
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

      {/* Shop CTA */}
      <section className="py-12 flex justify-center border-b border-black/8">
        <Link
          href="/shop"
          className="px-12 py-4 bg-black text-white label-xs tracking-widest hover:bg-brand-gray-800 transition-colors"
        >
          SHOP ALL
        </Link>
      </section>

      {newArrivals.length > 0 && (
        <ProductSection
          title="New Arrivals"
          subtitle="Fresh drops, straight from the studio"
          products={newArrivals}
          viewAllHref="/shop?filter=new"
          index={1}
        />
      )}
      {bestSellers.length > 0 && (
        <Suspense fallback={null}>
          <ProductSection
            title="Best Sellers"
            subtitle="What the community loves most"
            products={bestSellers}
            viewAllHref="/shop?filter=bestseller"
            index={3}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <Reviews reviews={reviews} />
      </Suspense>
      <Newsletter />
    </>
  );
}
