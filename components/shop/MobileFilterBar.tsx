"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, X, Check } from "lucide-react";

interface MobileFilterBarProps {
  categories: string[];
  sizes: string[];
  activeCategory: string;
  activeSort: string;
  activeSize?: string;
  productCount: number;
}

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default function MobileFilterBar({
  categories,
  sizes,
  activeCategory,
  activeSort,
  activeSize,
  productCount,
}: MobileFilterBarProps) {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

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

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === activeSort)?.label ?? "Newest";
  const hasExtraFilters  = activeSort !== "newest" || !!activeSize;
  const extraFilterCount = (activeSort !== "newest" ? 1 : 0) + (activeSize ? 1 : 0);

  return (
    <div className="lg:hidden">
      {/* ── Filter row ─────────────────────────────────────────── */}
      <div className="flex items-center gap-0">
        {/* Scrollable category pills — takes all available width */}
        <div className="flex-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 pb-0.5 pr-3">
            {/* All */}
            <button
              onClick={() => updateParam("category", "all")}
              className={cn(
                "flex-shrink-0 px-4 py-2 text-xs font-sans tracking-wide border transition-colors",
                activeCategory === "all"
                  ? "bg-black text-white border-black"
                  : "border-brand-gray-200 text-brand-gray-600"
              )}
            >
              All
            </button>

            {/* Category pills */}
            {categories.map((cat) => {
              const slug     = cat.toLowerCase();
              const isActive = activeCategory === slug;
              return (
                <button
                  key={cat}
                  onClick={() => updateParam("category", slug)}
                  className={cn(
                    "flex-shrink-0 px-4 py-2 text-xs font-sans tracking-wide border transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-black text-white border-black"
                      : "border-brand-gray-200 text-brand-gray-600"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort / Filter button — fixed on the right, never scrolls away */}
        <div className="flex-shrink-0 border-l border-brand-gray-100 pl-3">
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-sans border border-brand-gray-200 text-brand-gray-700 relative"
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>Sort</span>
            {/* Badge — shows count of active non-category filters */}
            {hasExtraFilters && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-black text-white text-[9px] flex items-center justify-center">
                {extraFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Product count */}
      <p className="text-xs text-brand-gray-400 font-sans mt-3">
        {productCount} product{productCount !== 1 ? "s" : ""}
        {activeCategory !== "all" && (
          <> · <span className="capitalize">{activeCategory}</span></>
        )}
      </p>

      {/* ── Sort & Filter Bottom Sheet ──────────────────────────── */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet panel — slides up from bottom */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white shadow-2xl"
               style={{ borderRadius: "16px 16px 0 0" }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-brand-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-2 pb-4 border-b border-brand-gray-100">
              <p className="text-xs font-sans font-semibold uppercase tracking-widest text-black">
                Sort & Filter
              </p>
              <button onClick={() => setSheetOpen(false)} className="p-1 -mr-1">
                <X className="h-4 w-4 text-brand-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh] pb-safe-nav">
              {/* Sort section */}
              <div className="px-6 pt-5 pb-4">
                <p className="text-2xs uppercase tracking-widest font-medium text-brand-gray-400 font-sans mb-3">
                  Sort By
                </p>
                <div className="space-y-0 divide-y divide-brand-gray-100">
                  {SORT_OPTIONS.map((opt) => {
                    const isActive = activeSort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          updateParam("sort", opt.value);
                          setSheetOpen(false);
                        }}
                        className="flex items-center justify-between w-full py-4 text-sm font-sans text-left"
                      >
                        <span className={isActive ? "text-black font-medium" : "text-brand-gray-500"}>
                          {opt.label}
                        </span>
                        {isActive && <Check className="h-4 w-4 text-black flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size section */}
              <div className="px-6 py-4 border-t border-brand-gray-100">
                <p className="text-2xs uppercase tracking-widest font-medium text-brand-gray-400 font-sans mb-3">
                  Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const isActive = activeSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          updateParam("size", isActive ? null : size);
                          setSheetOpen(false);
                        }}
                        className={cn(
                          "px-4 py-2.5 text-xs font-sans border transition-colors",
                          isActive
                            ? "bg-black text-white border-black"
                            : "border-brand-gray-200 text-brand-gray-600"
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clear all — only shown if filters active */}
              {(hasExtraFilters) && (
                <div className="px-6 pt-2 pb-6">
                  <button
                    onClick={() => {
                      router.push("/shop");
                      setSheetOpen(false);
                    }}
                    className="w-full py-3 text-xs font-sans uppercase tracking-widest border border-brand-gray-200 text-brand-gray-500 hover:border-black hover:text-black transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
