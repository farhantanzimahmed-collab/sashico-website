"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ShopFiltersProps {
  categories: string[];
  sizes: string[];
  activeCategory: string;
  activeSort: string;
  activeSize?: string;
}

export default function ShopFilters({
  categories,
  sizes,
  activeCategory,
  activeSort,
  activeSize,
}: ShopFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "all" || value === "newest") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/shop?${params.toString()}`);
    },
    [router, searchParams]
  );

  const hasFilters = activeCategory !== "all" || activeSort !== "newest" || activeSize;

  return (
    <aside className="w-full lg:w-56 flex-shrink-0 space-y-8">
      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={() => router.push("/shop")}
          className="flex items-center gap-2 text-2xs uppercase tracking-widest text-brand-gray-500 hover:text-black transition-colors"
        >
          <X className="h-3 w-3" />
          Clear All Filters
        </button>
      )}

      {/* Sort */}
      <div>
        <p className="text-2xs uppercase tracking-widest font-medium text-black mb-4">Sort By</p>
        <div className="space-y-2">
          {[
            { value: "newest", label: "Newest" },
            { value: "price_asc", label: "Price: Low to High" },
            { value: "price_desc", label: "Price: High to Low" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => updateParam("sort", option.value)}
              className={cn(
                "block w-full text-left text-sm py-1 transition-colors",
                activeSort === option.value
                  ? "text-black font-medium"
                  : "text-brand-gray-500 hover:text-black"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <p className="text-2xs uppercase tracking-widest font-medium text-black mb-4">Category</p>
        <div className="space-y-2">
          <button
            onClick={() => updateParam("category", "all")}
            className={cn(
              "block w-full text-left text-sm py-1 transition-colors",
              activeCategory === "all" ? "text-black font-medium" : "text-brand-gray-500 hover:text-black"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => updateParam("category", cat.toLowerCase())}
              className={cn(
                "block w-full text-left text-sm py-1 transition-colors",
                activeCategory === cat.toLowerCase()
                  ? "text-black font-medium"
                  : "text-brand-gray-500 hover:text-black"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <p className="text-2xs uppercase tracking-widest font-medium text-black mb-4">Size</p>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() => updateParam("size", activeSize === size ? null : size)}
              className={cn(
                "px-2.5 py-1.5 text-xs border rounded-lg transition-all duration-150",
                activeSize === size
                  ? "bg-black text-white border-black"
                  : "border-brand-gray-200 text-brand-gray-600 hover:border-black"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
