import type { Product } from "@/lib/types";

/**
 * Merchandising order for the shop's default view and the homepage:
 * T-shirts → Cuban shirts → Hoodies → Sweatshirts → Jackets → Beanies →
 * Pouch bags → Tote bags. Newest first within each group.
 */
export function collectionRank(p: Pick<Product, "category" | "name">): number {
  const cat = (p.category || "").toLowerCase();
  const name = (p.name || "").toLowerCase();
  if (cat === "t-shirts") return 1;
  if (cat === "shirts" || cat === "cuban shirts") return 2;
  if (cat === "hoodies") return 3;
  if (cat === "sweatshirts") return 4;
  if (cat === "jackets") return 5;
  if (cat === "accessories" || name.includes("beanie")) return 6;
  if (cat === "bags") return name.includes("tote") ? 8 : 7;
  return 9; // anything new/unknown goes last until it's given a place here
}

export function sortByCollection<T extends Pick<Product, "category" | "name" | "created_at">>(products: T[]): T[] {
  return [...products].sort(
    (a, b) =>
      collectionRank(a) - collectionRank(b) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
