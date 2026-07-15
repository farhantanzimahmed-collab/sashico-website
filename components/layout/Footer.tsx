import Link from "next/link";
import { Instagram, Facebook } from "lucide-react";
import { SiteSettings } from "@/lib/types";

interface FooterProps {
  settings?: SiteSettings | null;
}

const SHOP_LINKS = [
  { label: "New Arrivals", href: "/shop?filter=new" },
  { label: "Best Sellers", href: "/shop?filter=bestseller" },
  { label: "T-Shirts", href: "/shop?category=t-shirts" },
  { label: "Hoodies", href: "/shop?category=hoodies" },
  { label: "Jackets", href: "/shop?category=jackets" },
  { label: "Accessories", href: "/shop?category=accessories" },
];

const INFO_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "Track Order", href: "/order-tracking" },
];

const POLICY_LINKS = [
  { label: "Shipping Policy", href: "/shipping" },
  { label: "Return Policy", href: "/returns" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export default function Footer({ settings }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black text-white">
      {/* Scrolling marquee */}
      <div aria-hidden="true" className="border-y border-white/10 py-4 overflow-hidden">
        <div className="flex whitespace-nowrap" style={{ animation: "marqueeScroll 35s linear infinite" }}>
          {Array(12).fill("SASHICO · PREMIUM EMBROIDERY · MADE IN BANGLADESH · STREETWEAR · ").map((t, i) => (
            <span key={i} className="label-xs text-white/50 px-6 flex-shrink-0">{t}</span>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="container-xl py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 lg:gap-8">

          {/* Brand col */}
          <div className="lg:col-span-2">
            <Link href="/">
              <span className="display-heading text-[3rem] tracking-[0.08em] text-white leading-none block mb-6">
                SASHICO
              </span>
            </Link>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs mb-8">
              Premium embroidery streetwear handcrafted in Bangladesh. Where artisan craft meets contemporary street culture.
            </p>
            <div className="flex gap-5">
              <a
                href={settings?.instagram_url || "#"}
                target={settings?.instagram_url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={settings?.facebook_url || "#"}
                target={settings?.facebook_url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <p className="label-xs text-white/55 mb-6">Shop</p>
            <ul className="space-y-3">
              {SHOP_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-white/55 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <p className="label-xs text-white/55 mb-6">Info</p>
            <ul className="space-y-3">
              {INFO_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-white/55 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <p className="label-xs text-white/55 mb-6">Policies</p>
            <ul className="space-y-3">
              {POLICY_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-white/55 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-20 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/55">
            © {year} Sashico. All rights reserved.
          </p>
          <p className="text-xs text-white/55">
            Crafted with care · Dhaka, Bangladesh
          </p>
        </div>
      </div>
    </footer>
  );
}
