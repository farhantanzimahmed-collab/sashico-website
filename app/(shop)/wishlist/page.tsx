"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useWishlistStore } from "@/store/wishlistStore";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/lib/types";
import ProductCard from "@/components/shop/ProductCard";
import Button from "@/components/ui/Button";

export default function WishlistPage() {
  const { items, clear } = useWishlistStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useWishlistStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useWishlistStore.persist.onFinishHydration(() => setHydrated(true));
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    async function fetchProducts() {
      if (items.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("products")
        .select("*")
        .in("id", items)
        .eq("is_active", true);
      setProducts((data as Product[]) || []);
      setLoading(false);
    }
    fetchProducts();
  }, [hydrated, items]);

  if (loading) {
    return (
      <div className="pt-32 pb-24 flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-brand-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pt-32 pb-24 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <Heart className="h-16 w-16 text-brand-gray-200 mb-6" strokeWidth={1} />
        <h1 className="font-serif text-3xl text-brand-black mb-3">
          Your Wishlist is Empty
        </h1>
        <p className="text-sm text-brand-gray-500 font-sans mb-8 max-w-xs leading-relaxed">
          Save pieces you love and come back to them whenever you&apos;re ready.
        </p>
        <Link href="/shop">
          <Button size="lg">Explore Collection</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20">
      <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 border-b border-brand-gray-100 mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-2xs uppercase tracking-widest text-brand-gray-400 font-sans mb-2">
              Saved Items
            </p>
            <h1 className="font-serif text-display-md text-brand-black">
              My Wishlist
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-sm text-brand-gray-500 font-sans">
              {products.length} item{products.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={clear}
              className="text-2xs uppercase tracking-widest font-sans text-brand-gray-400 hover:text-red-500 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} priority={idx < 4} />
          ))}
        </div>

        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/shop">
            <Button variant="outline" size="lg" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
