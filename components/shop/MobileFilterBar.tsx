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
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Track pending selections inside the sheet before "Show Results" is tapped
  const [pendingCategory, setPendingCategory] = useState(activeCategory);
  const [pendingSort,     setPendingSort]     = useState(activeSort);
  const [pendingSize,     setPendingSize]     = useState(activeSize ?? "");

  // Sync pending state when sheet opens
  useEffect(() => {
    if (sheetOpen) {
      setPendingCategory(activeCategory);
      setPendingSort(activeSort);
      setPendingSize(activeSize ?? "");
    }
  }, [sheetOpen, activeCategory, activeSort, activeSize]);

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  // Count active filters for the badge
  const activeFilterCount =
    (activeCategory !== "all" ? 1 : 0) +
    (activeSort     !== "newest" ? 1 : 0) +
    (activeSize ? 1 : 0);

  // Active filter label shown below the button
  const activeSortLabel    = SORT_OPTIONS.find((o) => o.value === activeSort)?.label ?? "Newest";
  const activeCategoryLabel = activeCategory !== "all"
    ? categories.find((c) => c.toLowerCase() === activeCategory) ?? activeCategory
    : null;

  function applyFilters() {
    const params = new URLSearchParams();
    if (pendingCategory && pendingCategory !== "all") params.set("category", pendingCategory);
    if (pendingSort     && pendingSort     !== "newest") params.set("sort", pendingSort);
    if (pendingSize) params.set("size", pendingSize);
    router.push(`/shop${params.toString() ? `?${params.toString()}` : ""}`);
    setSheetOpen(false);
  }

  function clearAll() {
    router.push("/shop");
    setSheetOpen(false);
  }

  return (
    <div className="lg:hidden">
      {/* ── Single Sort button row ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 border border-black text-sm font-sans text-black relative"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Sort &amp; Filter</span>
          {activeFilterCount > 0 && (
            <span className="ml-0.5 h-5 w-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-medium">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Active filter summary */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-brand-gray-400 font-sans"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Product count + active filter tags */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <p className="text-xs text-brand-gray-400 font-sans">
          {productCount} product{productCount !== 1 ? "s" : ""}
        </p>
        {activeCategoryLabel && (
          <span className="text-xs font-sans text-black border border-black px-2 py-0.5">
            {activeCategoryLabel}
          </span>
        )}
        {activeSort !== "newest" && (
          <span className="text-xs font-sans text-black border border-black px-2 py-0.5">
            {activeSortLabel}
          </span>
        )}
        {activeSize && (
          <span className="text-xs font-sans text-black border border-black px-2 py-0.5">
            Size: {activeSize}
          </span>
        )}
      </div>

      {/* ── Bottom Sheet ────────────────────────────────────────── */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet — slides from bottom */}
          <div
            className="fixed inset-x-0 bottom-0 z-50 bg-white shadow-2xl flex flex-col"
            style={{ borderRadius: "20px 20px 0 0", maxHeight: "82vh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-brand-gray-200" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-6 pb-4 flex-shrink-0">
              <p className="text-base font-serif text-black tracking-wide">Sort &amp; Filter</p>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-2 -mr-2 text-brand-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* ── SORT BY ───────────────────────────────────── */}
              <div className="px-6 pb-6 border-b border-brand-gray-100">
                <p className="text-2xs uppercase tracking-[0.12em] font-medium text-brand-gray-400 font-sans mb-1">
                  Sort By
                </p>
                <div className="divide-y divide-brand-gray-100">
                  {SORT_OPTIONS.map((opt) => {
                    const isActive = pendingSort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setPendingSort(opt.value)}
                        className="flex items-center justify-between w-full py-4 text-left"
                      >
                        <span className={cn(
                          "text-sm font-sans",
                          isActive ? "text-black font-medium" : "text-brand-gray-500"
                        )}>
                          {opt.label}
                        </span>
                        <span className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                          isActive ? "border-black bg-black" : "border-brand-gray-300"
                        )}>
                          {isActive && <Check className="h-3 w-3 text-white" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── CATEGORY ──────────────────────────────────── */}
              <div className="px-6 py-6 border-b border-brand-gray-100">
                <p className="text-2xs uppercase tracking-[0.12em] font-medium text-brand-gray-400 font-sans mb-4">
                  Category
                </p>
                <div className="flex flex-wrap gap-2">
                  {["All", ...categories].map((cat) => {
                    const slug     = cat.toLowerCase();
                    const value    = slug === "all" ? "all" : slug;
                    const isActive = pendingCategory === value || (pendingCategory === "all" && value === "all");
                    return (
                      <button
                        key={cat}
                        onClick={() => setPendingCategory(value)}
                        className={cn(
                          "px-4 py-2 text-xs font-sans border transition-colors whitespace-nowrap",
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

              {/* ── SIZE ──────────────────────────────────────── */}
              <div className="px-6 py-6">
                <p className="text-2xs uppercase tracking-[0.12em] font-medium text-brand-gray-400 font-sans mb-4">
                  Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const isActive = pendingSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => setPendingSize(isActive ? "" : size)}
                        className={cn(
                          "px-5 py-2.5 text-xs font-sans border transition-colors",
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
            </div>

            {/* ── Sticky bottom action bar ─────────────────────── */}
            <div className="flex-shrink-0 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] border-t border-brand-gray-100 flex gap-3">
              <button
                onClick={clearAll}
                className="flex-1 py-3.5 text-xs font-sans uppercase tracking-widest border border-brand-gray-200 text-brand-gray-500 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={applyFilters}
                className="flex-[2] py-3.5 text-xs font-sans uppercase tracking-widest bg-black text-white transition-colors"
              >
                Show Results
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
