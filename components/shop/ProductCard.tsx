"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Plus } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, getDiscountPercentage, getImageUrl } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useTracking } from "@/hooks/useTracking";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const { addItem, openCart } = useCartStore();
  const { toggleItem, isWishlisted } = useWishlistStore();
  const { trackAddToCart } = useTracking();

  const price       = product.discount_price ?? product.price;
  const wishlisted  = isWishlisted(product.id);
  const mainImage   = product.images[0] || null;
  const hoverImage  = product.images[1] || null;
  const hasDiscount = !!product.discount_price && product.discount_price < product.price;
  const discount    = hasDiscount ? getDiscountPercentage(product.price, product.discount_price!) : 0;
  const inStock     = product.stock_quantity > 0;
  const defaultSize = product.sizes.find((s) => s.stock > 0)?.size || "";

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!inStock || !defaultSize) return;
    setAddingToCart(true);
    addItem({
      product_id:    product.id,
      product_name:  product.name,
      product_slug:  product.slug,
      product_image: mainImage || "",
      size:          defaultSize,
      quantity:      1,
      unit_price:    price,
      total_price:   price,
    });
    trackAddToCart(product.id, product.name, price, 1);
    toast.success("Added to cart");
    openCart();
    setTimeout(() => setAddingToCart(false), 600);
  }

  // Only activate hover state for real mouse pointers.
  // On touch devices, pointerType === "touch" — we deliberately ignore it so
  // the invisible overlay buttons never intercept mobile taps.
  function handlePointerEnter(e: React.PointerEvent) {
    if (e.pointerType === "mouse") setHovered(true);
  }
  function handlePointerLeave(e: React.PointerEvent) {
    if (e.pointerType === "mouse") setHovered(false);
  }

  return (
    <article
      className="group"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* ── Image ─────────────────────────────────── */}
      <div className="relative overflow-hidden bg-brand-gray-100 aspect-[3/4] rounded-lg">
        <Link href={`/shop/${product.slug}`} className="block absolute inset-0">
          {mainImage ? (
            <>
              <Image
                src={getImageUrl(mainImage)}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={priority}
                className="object-cover"
                style={{ display: hovered && hoverImage ? "none" : "block" }}
              />
              {hoverImage && (
                <Image
                  src={getImageUrl(hoverImage)}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                  style={{ display: hovered ? "block" : "none" }}
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-gray-100">
              <span className="display-heading text-[2rem] text-brand-gray-200 tracking-widest">SCO</span>
            </div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
          {hasDiscount && (
            <span className="label-xs bg-red-500 text-white px-2.5 py-1 rounded font-bold">−{discount}%</span>
          )}
          {!inStock && (
            <span className="label-xs bg-brand-gray-200 text-brand-gray-600 px-2.5 py-1 rounded">Sold Out</span>
          )}
        </div>

        {/* Wishlist — mouse-hover only; always pointer-events-none on touch */}
        <button
          onClick={() => toggleItem(product.id)}
          className={cn(
            "absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg z-10 transition-opacity duration-200",
            hovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            wishlisted ? "text-black" : "text-brand-gray-300 hover:text-black"
          )}
          aria-label="Wishlist"
        >
          <Heart className={cn("h-3.5 w-3.5", wishlisted && "fill-current")} />
        </button>

        {/* Quick Add — mouse-hover only; always pointer-events-none on touch */}
        {inStock && (
          <button
            onClick={handleQuickAdd}
            disabled={addingToCart}
            className={cn(
              "absolute bottom-0 inset-x-0 bg-black text-white py-3.5 label-xs flex items-center justify-center gap-2 z-10 transition-opacity duration-200",
              hovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
          >
            <Plus className="h-3 w-3" />
            {addingToCart ? "Added" : "Quick Add"}
          </button>
        )}
      </div>

      {/* ── Info ──────────────────────────────────── */}
      <div className="pt-3.5">
        <Link href={`/shop/${product.slug}`}>
          <h3 className="text-sm font-normal text-black hover:text-brand-gray-500 leading-snug">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2.5 mt-1.5">
          <span
            className={`text-sm font-bold ${hasDiscount ? "text-red-500" : "text-black"}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatPrice(price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-brand-gray-400 line-through" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
