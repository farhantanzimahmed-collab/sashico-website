/**
 * Cached data fetchers — uses Next.js unstable_cache to deduplicate
 * concurrent requests and serve from memory cache.
 *
 * WHY: Every page visit was hitting Supabase independently. With 10 concurrent
 * visitors, that's 10x the DB load. With these caches, all concurrent visitors
 * share one cached result — only one Supabase call fires per cache window
 * regardless of how many people are on the site.
 *
 * Uses a plain public Supabase client (no cookies) so results are safely
 * shareable across all users. Site settings, products, and reviews are
 * not user-specific, so cookie-based auth is not needed here.
 */

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { SiteSettings, MarketingSettings, Product, Review } from "@/lib/types";

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

const PRODUCT_COLS =
  "id,name,slug,price,discount_price,category,category_id,images,sizes,stock_quantity,is_featured,is_new_arrival,is_best_seller,is_active,description,meta_title,meta_description,created_at,updated_at";

// ── Site settings (Navbar logo, announcement bar, hero, etc.) ────────────────
// Cached 5 minutes — change in admin takes ≤5 min to appear
export const getCachedSiteSettings = unstable_cache(
  async (): Promise<SiteSettings | null> => {
    try {
      const { data } = await getPublicClient()
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .single();
      return data as SiteSettings | null;
    } catch {
      return null;
    }
  },
  ["site-settings"],
  { revalidate: 300 }
);

// ── Marketing settings (Meta Pixel, GA, promo popup) ─────────────────────────
// Cached 10 minutes — tracking IDs almost never change
export const getCachedMarketingSettings = unstable_cache(
  async (): Promise<MarketingSettings | null> => {
    try {
      const { data } = await getPublicClient()
        .from("marketing_settings")
        .select("*")
        .eq("id", 1)
        .single();
      return data as MarketingSettings | null;
    } catch {
      return null;
    }
  },
  ["marketing-settings"],
  { revalidate: 600 }
);

// ── Home page products ────────────────────────────────────────────────────────
// Cached 3 minutes — new arrivals / featured / best sellers
export const getCachedHomeProducts = unstable_cache(
  async () => {
    const db = getPublicClient();
    const [newArrivalsRes, featuredRes, bestSellersRes, reviewsRes, settingsRes] =
      await Promise.all([
        db.from("products").select(PRODUCT_COLS).eq("is_new_arrival", true).eq("is_active", true).order("created_at", { ascending: false }).limit(12),
        db.from("products").select(PRODUCT_COLS).eq("is_featured", true).eq("is_active", true).order("created_at", { ascending: false }).limit(12),
        db.from("products").select(PRODUCT_COLS).eq("is_best_seller", true).eq("is_active", true).order("created_at", { ascending: false }).limit(12),
        db.from("reviews").select("id,product_id,customer_name,rating,comment,is_approved,created_at").eq("is_approved", true).order("created_at", { ascending: false }).limit(8),
        db.from("site_settings").select("*").eq("id", 1).single(),
      ]);
    return {
      newArrivals:  (newArrivalsRes.data  as Product[]) || [],
      featured:     (featuredRes.data     as Product[]) || [],
      bestSellers:  (bestSellersRes.data  as Product[]) || [],
      reviews:      (reviewsRes.data      as Review[])  || [],
      settings:     (settingsRes.data     as SiteSettings | null),
    };
  },
  ["home-products"],
  { revalidate: 180 }
);

// ── Shop page products (no filters) ──────────────────────────────────────────
// Cached 2 minutes — base product list for the shop grid
export const getCachedShopProducts = unstable_cache(
  async (): Promise<Product[]> => {
    try {
      const { data } = await getPublicClient()
        .from("products")
        .select(PRODUCT_COLS)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(96);
      return (data as Product[]) || [];
    } catch {
      return [];
    }
  },
  ["shop-products"],
  { revalidate: 120 }
);

// ── Single product ────────────────────────────────────────────────────────────
// Cached 5 minutes per slug
export const getCachedProduct = unstable_cache(
  async (slug: string) => {
    const db = getPublicClient();
    const FULL_COLS =
      "id,name,slug,price,discount_price,category,category_id,images,sizes,colors,stitch_count,stock_quantity,is_featured,is_new_arrival,is_best_seller,is_active,description,meta_title,meta_description,created_at,updated_at";
    const [productRes, reviewsRes] = await Promise.all([
      db.from("products").select(FULL_COLS).eq("slug", slug).eq("is_active", true).single(),
      db.from("reviews").select("id,product_id,customer_name,rating,comment,is_approved,created_at").eq("is_approved", true).order("created_at", { ascending: false }),
    ]);
    return {
      product: productRes.data as Product | null,
      reviews: (reviewsRes.data as Review[]) || [],
    };
  },
  ["product"],
  { revalidate: 300 }
);
