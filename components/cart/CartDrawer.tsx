"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const total = getTotalPrice();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] bg-white flex flex-col transition-transform duration-400 ease-in-out shadow-xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-black/8">
          <div className="flex items-center gap-3">
            <span className="display-heading text-[1.1rem] tracking-[0.08em] text-black">CART</span>
            <span className="label-xs text-brand-gray-400">({items.length})</span>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="text-brand-gray-300 hover:text-black transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6">
              <ShoppingBag className="h-10 w-10 text-brand-gray-200" />
              <div>
                <p className="display-heading text-[1.4rem] text-black mb-2">EMPTY BAG</p>
                <p className="text-sm text-brand-gray-400">Add something you love.</p>
              </div>
              <button onClick={closeCart} className="btn-outline text-[10px]">
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-8">
              {items.map((item) => (
                <li key={`${item.product_id}-${item.size}`} className="flex gap-5">
                  {/* Image */}
                  <div className="relative w-20 h-24 flex-shrink-0 bg-brand-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={getImageUrl(item.product_image)}
                      alt={item.product_name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-3">
                      <Link
                        href={`/shop/${item.product_slug}`}
                        onClick={closeCart}
                        className="text-sm text-black hover:text-brand-gray-500 transition-colors line-clamp-2 leading-snug"
                      >
                        {item.product_name}
                      </Link>
                      <button
                        onClick={() => removeItem(item.product_id, item.size)}
                        aria-label={`Remove ${item.product_name}`}
                        className="text-brand-gray-300 hover:text-black transition-colors flex-shrink-0 mt-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="label-xs text-brand-gray-400 mt-1.5">Size: {item.size}</p>

                    <div className="flex items-center justify-between mt-4">
                      {/* Qty controls */}
                      <div className="flex items-center border border-brand-gray-200 rounded-lg">
                        <button
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(item.product_id, item.size, item.quantity - 1)}
                          className="px-2.5 py-2 text-brand-gray-500 hover:text-black transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 py-2 text-xs font-medium border-x border-brand-gray-200 min-w-[36px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(item.product_id, item.size, item.quantity + 1)}
                          className="px-2.5 py-2 text-brand-gray-500 hover:text-black transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-medium text-black">
                        {formatPrice(item.total_price)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-8 py-6 border-t border-black/8 space-y-4">
            <div className="flex justify-between items-center">
              <span className="label-xs text-brand-gray-500">Subtotal</span>
              <span className="text-base font-semibold text-black">{formatPrice(total)}</span>
            </div>
            <p className="text-xs text-brand-gray-400">Shipping calculated at checkout</p>
            <Link href="/checkout" onClick={closeCart} className="btn-primary w-full justify-center">
              Checkout
            </Link>
            <Link href="/cart" onClick={closeCart} className="btn-outline w-full justify-center">
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
