"use client";

import { CARRY_BAG_IMAGE } from "@/lib/carryBag";
import Image from "next/image";
import ChatButtons from "@/components/ui/ChatButtons";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Heart, Share2, Ruler, ChevronDown, ChevronUp, Truck, ShieldCheck } from "lucide-react";
import { Product } from "@/lib/types";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { getProductSizeChart } from "@/lib/size-charts";
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
  const [shippingOpen, setShippingOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  const { addItem, openCart } = useCartStore();
  const { toggleItem, isWishlisted } = useWishlistStore();
  const { trackAddToCart, trackProductView } = useTracking();

  // Fire ViewContent on mount — once per product page load
  useEffect(() => {
    trackProductView(product.id, product.name, price, product.category);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);
  const wishlisted = isWishlisted(product.id);

  const price = product.discount_price ?? product.price;
  const hasDiscount = !!product.discount_price && product.discount_price < product.price;
  const discount = hasDiscount ? getDiscountPercentage(product.price, product.discount_price!) : 0;
  const inStock = product.sizes?.length ? product.sizes.some((s) => s.stock > 0) : product.stock_quantity > 0;
  const sizeChart = getProductSizeChart(product);
  // Beanies/bags come in one size — show "Free Size" instead of a picker + chart
  const isFreeSize =
    product.sizes.length > 0 && product.sizes.every((s) => /free\s*size|one\s*size/i.test(s.size));
  // Only list chart rows for sizes this product is actually made in
  const chartRows = sizeChart
    ? sizeChart.rows.filter((r) => product.sizes.length === 0 || product.sizes.some((s) => s.size.toUpperCase() === r.size.toUpperCase()))
    : [];

  // Mobile sticky Add-to-Cart: show once the main button has scrolled out of view
  const ctaRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = ctaRef.current;
      // Hidden while the main button is on screen or still below it
      if (el) setCtaVisible(el.getBoundingClientRect().bottom > 0);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function handleAddToCart() {
    if (!selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      // From the sticky bar, bring the size buttons into view
      sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
          <span className="label-xs bg-red-600 text-white px-2.5 py-1 rounded font-bold">SALE</span>
        )}
      </div>

      {/* Name */}
      <h1 className="display-heading text-[clamp(2rem,4vw,3.2rem)] text-black leading-none">
        {product.name.toUpperCase()}
      </h1>

      {/* Price */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className={`text-4xl font-bold ${hasDiscount ? "text-red-600" : "text-black"}`}>
            {formatPrice(price)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-xl text-brand-gray-500 line-through">
                {formatPrice(product.price)}
              </span>
              <span className="inline-flex items-center bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded">
                −{discount}% OFF
              </span>
            </>
          )}
        </div>
        {hasDiscount && (
          <p className="text-sm text-brand-gray-500">
            You save <span className="font-semibold text-red-600">{formatPrice(product.price - product.discount_price!)}</span>
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
      <div ref={sizeRef}>
        <div className="flex items-center justify-between mb-4">
          <p className="label-xs text-black">
            Size
            {selectedSize && (
              <span className="ml-2 normal-case tracking-normal text-brand-gray-500 font-normal">
                {!isFreeSize && <>— {selectedSize}</>}
                {selectedStock > 0 && selectedStock <= 3 && (
                  <span className="ml-1 text-orange-600 text-xs">({selectedStock} left)</span>
                )}
              </span>
            )}
          </p>
          {!isFreeSize && (
          <Link prefetch={false}
            href="/size-guide"
            className="flex items-center gap-1 label-xs text-brand-gray-400 hover:text-black transition-colors"
          >
            <Ruler className="h-3 w-3" />
            Size Guide
          </Link>
          )}
        </div>

        {isFreeSize ? (
          <p className="inline-flex items-center px-4 py-3 text-xs uppercase tracking-wider border border-black rounded-lg text-black">
            Free Size
          </p>
        ) : (
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
        )}
        {sizeError && <p className="mt-2 text-xs text-red-600">Please select a size</p>}

        {/* Category-specific size chart, directly under the size picker */}
        {sizeChart && chartRows.length > 0 && (
          <div className="mt-5 border border-black/8 rounded-lg px-4 py-3">
            <div className="flex items-baseline justify-between mb-2">
              <p className="label-xs text-black">{sizeChart.label}</p>
              <p className="text-2xs text-brand-gray-500">in {sizeChart.unit}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-black/10">
                    {sizeChart.headers.map((h) => (
                      <th key={h} className="text-left py-2 pr-4 label-xs text-black font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartRows.map((row) => (
                    <tr
                      key={row.size}
                      className={cn(
                        "border-b border-black/6 last:border-0 transition-colors",
                        selectedSize?.toUpperCase() === row.size.toUpperCase() && "bg-brand-gray-50"
                      )}
                    >
                      <td className="py-2 pr-4 font-medium text-black">{row.size}</td>
                      <td className="py-2 pr-4 text-brand-gray-600">{row.length}</td>
                      <td className="py-2 pr-4 text-brand-gray-600">{row.chest}</td>
                      <td className="py-2 pr-4 text-brand-gray-600">{row.sleeve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
      <div ref={ctaRef} className="flex gap-3">
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

      {/* Talk to a human before ordering (WhatsApp / Messenger) */}
      <ChatButtons
        message={`Hi Sashico! I have a question about "${product.name}" — https://sashico.net/shop/${product.slug}`}
        refTag={product.slug}
      />

      {/* Mobile sticky bar — replaces the bottom nav on product pages. Portaled to <body>
          so a transformed ancestor can't turn position:fixed into page-relative. */}
      {mounted && createPortal(
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 lg:hidden bg-white border-t border-black/10 px-4 pt-3 transition-transform duration-300",
          ctaVisible ? "translate-y-full" : "translate-y-0"
        )}
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        aria-hidden={ctaVisible}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-brand-gray-600">
              {product.name}{selectedSize && !isFreeSize ? ` · ${selectedSize}` : ""}
            </p>
            <p className="text-sm font-bold text-black">
              {formatPrice(price)}
              {hasDiscount && <span className="ml-2 text-xs font-normal text-brand-gray-500 line-through">{formatPrice(product.price)}</span>}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!inStock || addingToCart}
            tabIndex={ctaVisible ? -1 : 0}
            className={cn("btn-primary px-6 py-3.5 shrink-0", (!inStock || addingToCart) && "opacity-50 cursor-not-allowed")}
          >
            {!inStock ? "Out of Stock" : addingToCart ? "Adding..." : selectedSize ? "Add to Cart" : "Select Size"}
          </button>
        </div>
      </div>,
      document.body)}

      {/* Free carry bag offer — oxblood shimmer banner (same accent as the SALE button) */}
      <div className="sale-shimmer !block w-full rounded-lg shadow-sm">
       <div className="relative flex items-center gap-3 px-4 py-3.5">
        {/* The actual gift: SS-DB-005 carry bag photo, with a bouncing gift tag */}
        <div className="relative h-16 w-16 shrink-0 rounded-md bg-white overflow-hidden ring-2 ring-white/60">
          <Image src={CARRY_BAG_IMAGE} alt="Free Sashico carry bag" fill sizes="64px" className="object-contain p-1" />
        </div>
        <span aria-hidden className="absolute left-14 top-2 text-lg leading-none animate-bounce [animation-duration:2s]">🎁</span>
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-bold tracking-wide text-white">
            Shop ৳600+ &amp; Get a FREE Carry Bag!
          </p>
          <p className="text-xs text-white/80 mt-0.5">
            {price >= 600
              ? "This item alone unlocks it — added automatically at checkout"
              : `Add ${formatPrice(600 - price)} more to unlock — added automatically`}
          </p>
        </div>
       </div>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 border border-black/8 rounded-lg px-4 py-3">
          <Truck className="h-4 w-4 text-brand-gray-400 flex-shrink-0" />
          <p className="text-xs text-brand-gray-500 leading-snug">Free shipping over ৳2,000</p>
        </div>
        <div className="flex items-center gap-3 border border-black/8 rounded-lg px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-brand-gray-400 flex-shrink-0" />
          <p className="text-xs text-brand-gray-500 leading-snug">72-hour return policy</p>
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
          {
            label: "Shipping & Returns",
            open: shippingOpen,
            toggle: () => setShippingOpen(!shippingOpen),
            content: (
              <ul className="space-y-2 text-sm text-brand-gray-600">
                <li>Standard delivery: 2–4 business days (Dhaka)</li>
                <li>Outside Dhaka: 4–6 business days</li>
                <li>Free shipping on orders above ৳2,000</li>
                <li>Contact us within 72 hours of delivery to initiate a return</li>
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
