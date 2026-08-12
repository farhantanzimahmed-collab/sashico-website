"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Share2, Ruler, ChevronDown, ChevronUp, Truck, ShieldCheck } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { getSizeChart } from "@/lib/size-charts";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useTracking } from "@/hooks/useTracking";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(
    (product.sizes || []).find((s) => s.stock > 0)?.size ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  const { addItem, openCart } = useCartStore();
  const { toggleItem, isWishlisted } = useWishlistStore();
  const { trackAddToCart } = useTracking();
  const wishlisted = isWishlisted(product.id);

  const price = product.discount_price ?? product.price;
  const hasDiscount = !!product.discount_price && product.discount_price < product.price;
  const discount = hasDiscount ? getDiscountPercentage(product.price, product.discount_price!) : 0;
  const inStock = product.stock_quantity > 0;
  const sizeChart = getSizeChart(product.category);

  function handleAddToCart() {
    if (!selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    setAddingToCart(true);
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_image: product.images[0] || "",
      size: selectedSize,
      quantity,
      unit_price: price,
      total_price: price * quantity,
    });
    trackAddToCart(product.id, product.name, price, quantity);
    toast.success(`${product.name} (${selectedSize}) added to cart`);
    openCart();
    setTimeout(() => setAddingToCart(false), 600);
  }

  async function handleShare() {
    try {
      await navigator.share({ title: product.name, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    }
  }

  const selectedStock = product.sizes.find((s) => s.size === selectedSize)?.stock ?? 0;

  return (
    <div className="space-y-7">
      {/* Category + badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="label-xs text-brand-gray-400">{product.category}</span>

        {product.is_best_seller && (
          <span className="label-xs border border-brand-gray-200 text-brand-gray-600 px-2.5 py-1 rounded">Best Seller</span>
        )}
        {hasDiscount && (
          <span className="label-xs bg-red-500 text-white px-2.5 py-1 rounded font-bold">SALE</span>
        )}
      </div>

      {/* Name */}
      <h1 className="display-heading text-[clamp(2rem,4vw,3.2rem)] text-black leading-none">
        {product.name.toUpperCase()}
      </h1>

      {/* Price */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className={`text-4xl font-bold ${hasDiscount ? "text-red-500" : "text-black"}`}>
            {formatPrice(price)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xl text-brand-gray-400 line-through">
                {formatPrice(product.price)}
              </span>
              <span className="inline-flex items-center bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                −{discount}% OFF
              </span>
            </>
          )}
        </div>
        {hasDiscount && (
          <p className="text-sm text-brand-gray-500">
            You save <span className="font-semibold text-red-500">{formatPrice(product.price - product.discount_price!)}</span>
          </p>
        )}
        <p className="text-xs text-brand-gray-400">
          Delivery: <span className="text-brand-gray-600">৳80 inside Dhaka</span> · <span className="text-brand-gray-600">৳140 elsewhere</span>
        </p>
      </div>

      {/* Stock indicator */}
      <div className="flex items-center gap-2">
        <div className={cn("h-1.5 w-1.5 rounded-full", inStock ? "bg-green-500" : "bg-red-400")} />
        <p className="text-xs text-brand-gray-500">
          {inStock
            ? product.stock_quantity <= 5 ? `Only ${product.stock_quantity} left` : "In stock"
            : "Out of stock"}
        </p>
      </div>

      <div className="border-t border-black/8" />

      {/* Color swatches */}
      {product.colors && product.colors.length > 0 && (
        <div>
          <p className="label-xs text-black mb-3">Colors</p>
          <div className="flex flex-wrap gap-3">
            {product.colors.map((c) => (
              <div key={c.hex} className="flex items-center gap-2">
                <div
                  className="h-7 w-7 rounded-full border-2 border-brand-gray-200 flex-shrink-0"
                  style={{ background: c.hex }}
                  title={c.name}
                />
                <span className="text-xs text-brand-gray-500">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stitch count */}
      {product.stitch_count && (
        <div className="flex items-center gap-2">
          <span className="label-xs text-brand-gray-400">Embroidery:</span>
          <span className="text-sm font-medium text-black">{product.stitch_count.toLocaleString()} stitches</span>
        </div>
      )}

      {/* Size selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="label-xs text-black">
            Size
            {selectedSize && (
              <span className="ml-2 normal-case tracking-normal text-brand-gray-500 font-normal">
                — {selectedSize}
                {selectedStock > 0 && selectedStock <= 3 && (
                  <span className="ml-1 text-orange-600 text-xs">({selectedStock} left)</span>
                )}
              </span>
            )}
          </p>
          <Link
            href="/size-guide"
            className="flex items-center gap-1 label-xs text-brand-gray-400 hover:text-black transition-colors"
          >
            <Ruler className="h-3 w-3" />
            Size Guide
          </Link>
        </div>

        <div className={cn("flex flex-wrap gap-2", sizeError && "ring-1 ring-red-300 rounded-lg p-2 -m-2")}>
          {product.sizes.map((sizeObj) => {
            const oos = sizeObj.stock === 0;
            return (
              <button
                key={sizeObj.size}
                onClick={() => !oos && setSelectedSize(sizeObj.size)}
                disabled={oos}
                className={cn(
                  "min-w-[52px] px-3 py-3 text-xs uppercase tracking-wider border rounded-lg transition-all duration-200",
                  selectedSize === sizeObj.size
                    ? "border-black bg-black text-white"
                    : oos
                    ? "border-brand-gray-100 text-brand-gray-300 cursor-not-allowed line-through"
                    : "border-brand-gray-200 text-black hover:border-black"
                )}
              >
                {sizeObj.size}
              </button>
            );
          })}
        </div>
        {sizeError && <p className="mt-2 text-xs text-red-500">Please select a size</p>}
      </div>

      {/* Quantity */}
      <div>
        <p className="label-xs text-black mb-3">Quantity</p>
        <div className="flex items-center border border-brand-gray-200 rounded-lg w-fit">
          <button
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-4 py-3 text-brand-gray-500 hover:text-black transition-colors"
          >
            −
          </button>
          <span className="px-6 py-3 text-sm font-medium border-x border-brand-gray-200 min-w-[56px] text-center">
            {quantity}
          </span>
          <button
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => q + 1)}
            className="px-4 py-3 text-brand-gray-500 hover:text-black transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          disabled={!inStock || addingToCart}
          className={cn(
            "flex-1 btn-primary justify-center",
            (!inStock || addingToCart) && "opacity-50 cursor-not-allowed"
          )}
        >
          {!inStock ? "Out of Stock" : addingToCart ? "Adding..." : "Add to Cart"}
        </button>
        <button
          onClick={() => toggleItem(product.id)}
          className={cn(
            "flex-shrink-0 border px-4 rounded-lg transition-all duration-200",
            wishlisted
              ? "border-black bg-black text-white"
              : "border-brand-gray-200 text-brand-gray-400 hover:border-black hover:text-black"
          )}
          aria-label="Wishlist"
        >
          <Heart className={cn("h-4 w-4", wishlisted && "fill-current")} />
        </button>
        <button
          onClick={handleShare}
          className="flex-shrink-0 border border-brand-gray-200 px-4 rounded-lg text-brand-gray-400 hover:border-black hover:text-black transition-all duration-200"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 border border-black/8 rounded-lg px-4 py-3">
          <Truck className="h-4 w-4 text-brand-gray-400 flex-shrink-0" />
          <p className="text-xs text-brand-gray-500 leading-snug">Free shipping over ৳2,000</p>
        </div>
        <div className="flex items-center gap-3 border border-black/8 rounded-lg px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-brand-gray-400 flex-shrink-0" />
          <p className="text-xs text-brand-gray-500 leading-snug">7-day return policy</p>
        </div>
      </div>

      <div className="border-t border-black/8" />

      {/* Accordions */}
      <div className="space-y-0">
        {[
          {
            label: "Product Details",
            open: detailsOpen,
            toggle: () => setDetailsOpen(!detailsOpen),
            content: product.description ? (
              <p className="text-sm text-brand-gray-600 leading-relaxed">{product.description}</p>
            ) : (
              <ul className="space-y-2 text-sm text-brand-gray-600">
                <li>Premium quality fabric</li>
                <li>Hand-stitched embroidery</li>
                <li>Crafted in Bangladesh</li>
                <li>Machine washable (cold)</li>
              </ul>
            ),
          },
          ...(sizeChart ? [{
            label: "Size Chart",
            open: sizeChartOpen,
            toggle: () => setSizeChartOpen(!sizeChartOpen),
            content: (
              <div className="pb-1">
                <p className="text-xs text-brand-gray-400 mb-3">All measurements in {sizeChart.unit}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-black/10">
                        {sizeChart.headers.map((h) => (
                          <th key={h} className="text-left py-2 pr-6 label-xs text-black font-semibold whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sizeChart.rows.map((row) => (
                        <tr key={row.size} className="border-b border-black/6 last:border-0">
                          <td className="py-2.5 pr-6 font-medium text-black">{row.size}</td>
                          <td className="py-2.5 pr-6 text-brand-gray-600">{row.length}</td>
                          <td className="py-2.5 pr-6 text-brand-gray-600">{row.chest}</td>
                          <td className="py-2.5 pr-6 text-brand-gray-600">{row.sleeve}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ),
          }] : []),
          {
            label: "Shipping & Returns",
            open: shippingOpen,
            toggle: () => setShippingOpen(!shippingOpen),
            content: (
              <ul className="space-y-2 text-sm text-brand-gray-600">
                <li>Standard delivery: 3-5 days (Dhaka)</li>
                <li>Outside Dhaka: 5-7 business days</li>
                <li>Free shipping on orders above ৳2,000</li>
                <li>Returns accepted within 7 days</li>
              </ul>
            ),
          },
        ].map(({ label, open, toggle, content }) => (
          <div key={label} className="border-b border-black/8">
            <button onClick={toggle} className="flex items-center justify-between w-full py-4 text-left">
              <p className="label-xs text-black">{label}</p>
              {open
                ? <ChevronUp className="h-4 w-4 text-brand-gray-400" />
                : <ChevronDown className="h-4 w-4 text-brand-gray-400" />
              }
            </button>
            {open && <div className="pb-5">{content}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
