import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CATEGORIES = [
  { label: "T-Shirts", href: "/shop?category=t-shirts", num: "01" },
  { label: "Hoodies", href: "/shop?category=hoodies", num: "02" },
  { label: "Jackets", href: "/shop?category=jackets", num: "03" },
  { label: "Accessories", href: "/shop?category=accessories", num: "04" },
];

export default function CategoryStrip() {
  return (
    <section className="border-y border-black/10">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((cat, i) => (
          <Link
            key={cat.label}
            href={cat.href}
            className={`group relative flex flex-col justify-end p-8 lg:p-10 hover:bg-black transition-colors duration-300 min-h-[140px] ${i > 0 ? "border-l border-black/10" : ""}`}
          >
            <div className="flex items-end justify-between">
              <span className="display-heading text-[1.8rem] sm:text-[2.2rem] text-black group-hover:text-white transition-colors leading-none">
                {cat.label.toUpperCase()}
              </span>
              <ArrowRight className="h-4 w-4 text-brand-gray-300 group-hover:text-white transition-all duration-300 group-hover:translate-x-1 flex-shrink-0 ml-2" />
            </div>
            <span className="label-xs text-brand-gray-300 group-hover:text-white/40 transition-colors mt-2">{cat.num}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
