import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/shop/ProductCard";
import { Product } from "@/lib/types";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
  index?: number;
}

export default function ProductSection({
  title,
  subtitle,
  products,
  viewAllHref = "/shop",
  viewAllLabel = "View All",
  index = 1,
}: ProductSectionProps) {
  if (products.length === 0) return null;

  const num = String(index).padStart(2, "0");

  return (
    <section className="py-20 lg:py-28">
      <div className="container-xl">
        {/* Section header */}
        <div className="flex items-end justify-between mb-12 pb-6 border-b border-black/10">
          <div className="flex items-end gap-5">
            <span aria-hidden="true" className="display-heading text-[4rem] lg:text-[5rem] leading-none select-none section-num" data-num={num} />
            <div className="mb-1">
              <h2 className="display-heading text-[2rem] lg:text-[2.6rem] text-black leading-none">
                {title.toUpperCase()}
              </h2>
              {subtitle && (
                <p className="label-xs text-brand-gray-500 mt-2">{subtitle}</p>
              )}
            </div>
          </div>
          <Link
            href={viewAllHref}
            className="hidden sm:flex items-center gap-2 label-xs text-brand-gray-500 hover:text-black transition-colors group"
          >
            {viewAllLabel}
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.slice(0, 12).map((product, idx) => (
            <ProductCard key={product.id} product={product} priority={idx < 4} />
          ))}
        </div>

        {/* Mobile view all */}
        <div className="mt-10 text-center sm:hidden">
          <Link href={viewAllHref} className="btn-outline inline-flex">
            {viewAllLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
