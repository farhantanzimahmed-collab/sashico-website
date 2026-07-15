"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, getImageUrl } from "@/lib/utils";
import Button from "@/components/ui/Button";

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const [hydrated, setHydrated] = useState(false);
  const total = getTotalPrice();
  const SHIPPING_THRESHOLD = 2000;
  const SHIPPING_COST = 80;
  const freeShippingRemaining = Math.max(0, SHIPPING_THRESHOLD - total);
  const finalShipping = total >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true));
      return () => unsub();
    }
  }, []);

  if (!hydrated) return (
    <div className="pt-32 pb-24 flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-2 border-brand-black border-t-transparent rounded-full" />
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="pt-32 pb-24 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <ShoppingBag className="h-16 w-16 text-brand-gray-200 mb-6" />
        <h1 className="font-serif text-3xl text-brand-black mb-3">
          Your Cart is Empty
        </h1>
        <p className="text-sm text-brand-gray-500 font-sans mb-8 max-w-xs">
          Looks like you haven&apos;t added anything yet. Explore our collections.
        </p>
        <Link href="/shop">
          <Button size="lg">Explore Collection</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <h1 className="font-serif text-display-md text-brand-black mb-10">
        Shopping Cart
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Free shipping progress */}
          {freeShippingRemaining > 0 && (
            <div className="bg-brand-cream p-4">
              <p className="text-xs font-sans text-brand-gray-700">
                Add{" "}
                <strong>{formatPrice(freeShippingRemaining)}</strong> more for
                free shipping
              </p>
              <div className="mt-2 h-1 bg-brand-gray-200">
                <div
                  className="h-full bg-brand-black transition-all duration-500"
                  style={{ width: `${(total / SHIPPING_THRESHOLD) * 100}%` }}
                />
              </div>
            </div>
          )}

          {items.map((item) => (
            <div
              key={`${item.product_id}-${item.size}`}
              className="flex gap-5 pb-6 border-b border-brand-gray-100"
            >
              <div className="relative w-24 h-32 sm:w-28 sm:h-36 flex-shrink-0 bg-brand-gray-50">
                <Image
                  src={getImageUrl(item.product_image)}
                  alt={item.product_name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-4">
                  <Link href={`/shop/${item.product_slug}`}>
                    <h3 className="font-sans font-medium text-brand-black hover:text-brand-gray-600 transition-colors leading-snug">
                      {item.product_name}
                    </h3>
                  </Link>
                  <span className="font-sans font-semibold text-brand-black whitespace-nowrap">
                    {formatPrice(item.total_price)}
                  </span>
                </div>
                <p className="text-2xs uppercase tracking-wider text-brand-gray-400 font-sans mt-1">
                  Size: {item.size} · {formatPrice(item.unit_price)} each
                </p>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border border-brand-gray-200">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() =>
                        updateQuantity(item.product_id, item.size, item.quantity - 1)
                      }
                      className="px-3 py-2 text-brand-gray-600 hover:text-brand-black transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="px-4 py-2 text-sm font-sans font-medium border-x border-brand-gray-200 min-w-[40px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() =>
                        updateQuantity(item.product_id, item.size, item.quantity + 1)
                      }
                      className="px-3 py-2 text-brand-gray-600 hover:text-brand-black transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.product_id, item.size)}
                    className="flex items-center gap-1.5 text-xs font-sans text-brand-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={clearCart}
            className="text-2xs uppercase tracking-widest font-sans text-brand-gray-400 hover:text-red-500 transition-colors"
          >
            Clear Cart
          </button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-brand-gray-50 p-6 sticky top-28">
            <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-brand-black mb-6">
              Order Summary
            </h2>
            <div className="space-y-3 text-sm font-sans">
              <div className="flex justify-between">
                <span className="text-brand-gray-600">
                  Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)
                </span>
                <span className="font-medium">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-gray-600">Shipping</span>
                <span
                  className={
                    finalShipping === 0
                      ? "text-green-600 font-medium"
                      : "font-medium"
                  }
                >
                  {finalShipping === 0 ? "Free" : formatPrice(finalShipping)}
                </span>
              </div>
              {freeShippingRemaining === 0 && (
                <p className="text-xs text-green-600 bg-green-50 px-3 py-2">
                  You qualify for free shipping!
                </p>
              )}
              <div className="border-t border-brand-gray-200 pt-3 flex justify-between font-semibold text-brand-black">
                <span>Total</span>
                <span>{formatPrice(total + finalShipping)}</span>
              </div>
            </div>

            <Link href="/checkout" className="block mt-6">
              <Button fullWidth size="lg" className="flex items-center justify-center gap-2">
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link
              href="/shop"
              className="block mt-3 text-center text-2xs uppercase tracking-widest font-sans text-brand-gray-500 hover:text-brand-black transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
