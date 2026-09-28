import type { Product } from "@/lib/types";

/**
 * Merchandising order for the shop's default view and the homepage:
 * T-shirts → Cuban shirts → Hoodies → Sweatshirts → Jackets → Beanies →
 * Pouch bags → Tote bags. T-shirts follow TEE_PRICE_ORDER; newest first otherwise.
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

// Within T-shirts, by regular price: ৳900 tees → ৳1,800 Art Series → ৳700 tees,
// then polos last. Any other price sits after these, before the polos.
const TEE_PRICE_ORDER = [900, 1800, 700];

function teeRank(p: Pick<Product, "name" | "price">): number {
  if ((p.name || "").toLowerCase().includes("polo")) return 99;
  const i = TEE_PRICE_ORDER.indexOf(Math.round(Number(p.price)));
  return i === -1 ? TEE_PRICE_ORDER.length : i;
}

export function sortByCollection<T extends Pick<Product, "category" | "name" | "created_at" | "price">>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const byGroup = collectionRank(a) - collectionRank(b);
    if (byGroup) return byGroup;
    if (collectionRank(a) === 1) {
      const byTee = teeRank(a) - teeRank(b);
      if (byTee) return byTee;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
