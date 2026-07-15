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

  const wishlisted = isWishlisted(product.id);
  const mainImage = product.images[0] || null;
  const hoverImage = product.images[1] || null;
  const price = product.discount_price ?? product.price;
  const hasDiscount = !!product.discount_price && product.discount_price < product.price;
  const discount = hasDiscount ? getDiscountPercentage(product.price, product.discount_price!) : 0;
  const inStock = product.stock_quantity > 0;
  const defaultSize = product.sizes.find((s) => s.stock > 0)?.size || "";

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!inStock || !defaultSize) return;
    setAddingToCart(true);
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_image: mainImage || "",
      size: defaultSize,
      quantity: 1,
      unit_price: price,
      total_price: price,
    });
    trackAddToCart(product.id, product.name, price, 1);
    toast.success(`Added to cart`);
    openCart();
    setTimeout(() => setAddingToCart(false), 600);
  }

  function handleMouseEnter() {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      setHovered(true);
    }
  }

  return (
    <article
      className="group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
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
                className={cn(
                  "object-cover transition-all duration-700 ease-out",
                  hovered && hoverImage ? "opacity-0 scale-[1.03]" : "opacity-100 scale-100"
                )}
              />
              {hoverImage && (
                <Image
                  src={getImageUrl(hoverImage)}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className={cn(
                    "object-cover transition-all duration-700 ease-out",
                    hovered ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]"
                  )}
                />
              )}
              {!hoverImage && (
                <div className={cn(
                  "absolute inset-0 bg-black/8 transition-opacity duration-300",
                  hovered ? "opacity-100" : "opacity-0"
                )} />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-gray-100">
              <span className="display-heading text-[2rem] text-brand-gray-200 tracking-widest">SCO</span>
            </div>
          )}
        </Link>

        {/* Badges — top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          {product.is_new_arrival && (
            <span className="label-xs bg-black text-white px-2.5 py-1 rounded">New</span>
          )}
          {hasDiscount && (
            <span className="label-xs bg-white text-black px-2.5 py-1 rounded">−{discount}%</span>
          )}
          {!inStock && (
            <span className="label-xs bg-brand-gray-200 text-brand-gray-600 px-2.5 py-1 rounded">Sold Out</span>
          )}
        </div>

        {/* Wishlist — top right */}
        <button
          onClick={() => toggleItem(product.id)}
          className={cn(
            "absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg transition-all duration-200",
            "opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0",
            wishlisted ? "text-black" : "text-brand-gray-300 hover:text-black"
          )}
          aria-label="Wishlist"
        >
          <Heart className={cn("h-3.5 w-3.5", wishlisted && "fill-current")} />
        </button>

        {/* Quick Add — bottom */}
        {inStock && (
          <button
            onClick={handleQuickAdd}
            disabled={addingToCart}
            className={cn(
              "absolute bottom-0 inset-x-0 bg-black text-white py-3.5 label-xs flex items-center justify-center gap-2 transition-all duration-300",
              hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"
            )}
          >
            <Plus className="h-3 w-3" />
            {addingToCart ? "Added" : "Quick Add"}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="pt-3.5">
        <Link href={`/shop/${product.slug}`}>
          <h3 className="text-sm font-normal text-black hover:text-brand-gray-500 transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2.5 mt-1.5">
          <span className="text-sm font-medium text-black">
            {formatPrice(price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-brand-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
