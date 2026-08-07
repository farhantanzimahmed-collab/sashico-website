"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Heart, ShoppingBag, X, Menu } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { cn } from "@/lib/utils";
import CartDrawer from "@/components/cart/CartDrawer";
import MobileMenu from "./MobileMenu";
import { SiteSettings } from "@/lib/types";

const NAV_LEFT = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?filter=new", label: "New Arrivals" },
  { href: "/shop?filter=sale", label: "Sale", sale: true },
];
const NAV_RIGHT = [
  { href: "/shop?filter=bestseller", label: "Best Sellers" },
  { href: "/order-tracking", label: "Track Order" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
const ALL_LINKS = [...NAV_LEFT, ...NAV_RIGHT];

interface NavbarProps {
  settings?: SiteSettings | null;
}

export default function Navbar({ settings }: NavbarProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const totalItems = useCartStore((s) => s.getTotalItems());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const openCart = useCartStore((s) => s.openCart);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener("sashico:open-search", handler);
    return () => window.removeEventListener("sashico:open-search", handler);
  }, []);

  const isHome = pathname === "/";
  const transparent = isHome && !scrolled;

  const navLinkClass = (href: string, sale?: boolean) => cn(
    "label-xs transition-colors duration-200 whitespace-nowrap",
    sale
      ? "text-red-500 hover:text-red-600 font-semibold"
      : transparent
        ? pathname === href ? "text-white" : "text-white/90 hover:text-white"
        : pathname === href ? "text-black" : "text-brand-gray-600 hover:text-black"
  );

  const iconClass = cn(
    "transition-colors",
    transparent ? "text-white/90 hover:text-white" : "text-brand-gray-600 hover:text-black"
  );

  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        !transparent && "bg-white/96 backdrop-blur-md border-b border-black/8"
      )}>
        {/* Announcement bar */}
        <div
          className="py-2.5 text-center"
          style={{
            backgroundColor: settings?.announcement_bar_bg_color || "#000000",
            color: settings?.announcement_bar_text_color || "#FFFFFF",
          }}
        >
          <p className="label-xs opacity-85">
            {settings?.announcement_bar_enabled && settings?.announcement_bar_text
              ? settings.announcement_bar_text
              : "Free shipping on orders above ৳2,000"}
          </p>
        </div>

        {/* Main bar */}
        <div className="px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-3 h-[64px] items-center gap-4">

            {/* Left */}
            <div className="flex items-center">
              <button
                className="lg:hidden p-1 -ml-1"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className={cn("h-5 w-5 transition-colors", transparent ? "text-white" : "text-black")} />
              </button>

              <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
                {NAV_LEFT.map((link) => (
                  <Link key={link.href} href={link.href} className={navLinkClass(link.href, link.sale)}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Center — logo */}
            <div className="flex justify-center">
              <Link href="/" className="flex items-center justify-center">
                <Image
                  src={transparent ? "/sashico-logo-white.png" : "/sashico-logo.png"}
                  alt="Sashico"
                  width={346}
                  height={103}
                  className="h-10 w-auto object-contain transition-all duration-300"
                  priority
                />
              </Link>
            </div>

            {/* Right */}
            <div className="flex items-center justify-end gap-6 xl:gap-8">
              <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
                {NAV_RIGHT.map((link) => (
                  <Link key={link.href} href={link.href} className={navLinkClass(link.href)}>
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="flex items-center gap-4">
                <button onClick={() => setSearchOpen(true)} aria-label="Search" className={iconClass}>
                  <Search className="h-[18px] w-[18px]" />
                </button>
                <Link href="/wishlist" aria-label="Wishlist" className={cn("relative hidden sm:block", iconClass)}>
                  <Heart className="h-[18px] w-[18px]" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-black text-white text-[8px] flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                <button onClick={openCart} aria-label="Cart" className={cn("relative", iconClass)}>
                  <ShoppingBag className="h-[18px] w-[18px]" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-black text-white text-[8px] flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search overlay */}
        {searchOpen && (
          <div className="absolute inset-x-0 top-full bg-white border-b border-black/8 shadow-sm" style={{ animation: "slideDown 0.25s ease-out" }}>
            <div className="container-xl py-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    window.location.href = `/shop?search=${encodeURIComponent(searchQuery)}`;
                    setSearchOpen(false);
                  }
                }}
                className="relative"
              >
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray-300" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-10 py-3 text-sm bg-transparent border-b border-brand-gray-200 focus:border-black focus:outline-none placeholder:text-brand-gray-300 transition-colors"
                  style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
                />
                <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className="absolute right-0 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-black">
                  <X className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      <CartDrawer />
      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} links={ALL_LINKS} />
    </>
  );
}
