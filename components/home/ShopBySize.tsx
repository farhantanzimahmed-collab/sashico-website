import Link from "next/link";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

export default function ShopBySize() {
  return (
    <section className="py-20 border-t border-black/8">
      <div className="container-xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <p className="label-xs text-brand-gray-500 mb-2">Find Your Fit</p>
            <h2 className="display-heading text-[clamp(2rem,4vw,3.2rem)] text-black leading-none">
              SHOP BY SIZE
            </h2>
          </div>
          <Link href="/shop" className="label-xs text-brand-gray-500 hover:text-black transition-colors">
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {SIZES.map((size) => (
            <Link
              key={size}
              href={`/shop?size=${size}`}
              className="group flex flex-col items-center justify-center aspect-square border border-brand-gray-200 rounded-lg hover:border-black hover:bg-black transition-all duration-200"
            >
              <span className="display-heading text-[clamp(1.2rem,2.5vw,2rem)] text-black group-hover:text-white transition-colors leading-none">
                {size}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
