import { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/shop/ProductCard";
import ShopFilters from "@/components/shop/ShopFilters";
import { Product } from "@/lib/types";
import { SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse all Sashico premium embroidery streetwear. Filter by category, size, and price.",
};

export const revalidate = 300;

const CATEGORIES = ["T-Shirts", "Cuban Shirts", "Winter", "Bags"];
const SIZES = ["S", "M", "L", "XL", "FREE SIZE"];

interface SearchParams {
  category?: string;
  size?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  search?: string;
  page?: string;
  filter?: string;
}

async function getProducts(searchParams: SearchParams): Promise<Product[]> {
  const supabase = await createClient();
  const cols = "id,name,slug,price,discount_price,category,category_id,images,sizes,stock_quantity,is_featured,is_new_arrival,is_best_seller,is_active,description,meta_title,meta_description,created_at,updated_at";
  let query = supabase
    .from("products")
    .select(cols)
    .eq("is_active", true);

  if (searchParams.category && searchParams.category !== "all") {
    const cat = searchParams.category.toLowerCase().trim();

    // Explicit mapping from UI filter slug → exact DB category values.
    // "winter" is a UI grouping that covers several DB categories.
    // "cuban shirts" maps to "shirts" (product code prefix SS-S-).
    const CATEGORY_MAP: Record<string, string[]> = {
      "t-shirts":     ["t-shirts"],
      "cuban shirts": ["shirts"],
      "cuban-shirts": ["shirts"],
      "winter":       ["sweatshirts", "hoodies", "jackets", "winter"],
      "bags":         ["bags", "accessories"],
    };

    const dbCats = CATEGORY_MAP[cat];
    if (dbCats) {
      // Exact-match OR across all mapped DB categories
      query = query.or(dbCats.map((c) => `category.eq.${c}`).join(","));
    } else {
      // Fallback for unknown slugs — substring match on full slug (no single-char splits)
      query = query.ilike("category", `%${cat}%`);
    }
  }

  if (searchParams.filter === "new") query = query.eq("is_new_arrival", true);
  if (searchParams.filter === "featured") query = query.eq("is_featured", true);
  if (searchParams.filter === "bestseller") query = query.eq("is_best_seller", true);
  if (searchParams.filter === "sale") query = query.not("discount_price", "is", null).gt("discount_price", 0);

  if (searchParams.search) {
    const s = searchParams.search;
    query = query.or(`name.ilike.%${s}%,description.ilike.%${s}%,category.ilike.%${s}%`);
  }
  // Size filter applied in JS after fetch (JSONB partial-object matching)

  if (searchParams.minPrice) {
    query = query.gte("price", parseFloat(searchParams.minPrice));
  }
  if (searchParams.maxPrice) {
    query = query.lte("price", parseFloat(searchParams.maxPrice));
  }

  const sortBy = searchParams.sort || "newest";
  if (sortBy === "newest") query = query.order("created_at", { ascending: false });
  else if (sortBy === "price_asc") query = query.order("price", { ascending: true });
  else if (sortBy === "price_desc") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data } = await query.limit(200);
  let products = (data as Product[]) || [];

  // Size filter — JS post-filter (JSONB partial-object matching not reliable via ORM)
  if (searchParams.size) {
    const sizeKey = searchParams.size.toUpperCase();
    products = products.filter((p) =>
      Array.isArray(p.sizes) &&
      p.sizes.some((s: { size: string; stock: number }) =>
        s.size?.toUpperCase() === sizeKey && s.stock > 0
      )
    );
  }

  return products.slice(0, 48);
}

interface ShopPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const products = await getProducts(params);

  const activeCategory = params.category || "all";
  const activeSort = params.sort || "newest";

  return (
    <div className="pt-28">
      {/* Page Header */}
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-12 border-b border-brand-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-2xs uppercase tracking-widest text-brand-gray-400 font-sans mb-2">
              {params.filter
                ? params.filter.charAt(0).toUpperCase() + params.filter.slice(1)
                : params.search
                ? `Search: "${params.search}"`
                : "All Products"}
            </p>
            <h1 className="font-serif text-display-md text-brand-black">
              {params.search ? `Results for "${params.search}"` : "Shop"}
            </h1>
          </div>
          <p className="text-sm text-brand-gray-500 font-sans">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Filters Sidebar */}
          <Suspense fallback={<div className="w-56 flex-shrink-0" />}>
            <ShopFilters
              categories={CATEGORIES}
              sizes={SIZES}
              activeCategory={activeCategory}
              activeSort={activeSort}
              activeSize={params.size}
            />
          </Suspense>

          {/* Products */}
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <SlidersHorizontal className="h-12 w-12 text-brand-gray-200 mb-4" />
                <h3 className="font-serif text-xl text-brand-black mb-2">
                  No products found
                </h3>
                <p className="text-sm text-brand-gray-500 font-sans">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {products.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={idx < 4}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
