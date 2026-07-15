"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2x2, Search, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { items } = useCartStore();
  const [visible, setVisible] = useState(true);
  const lastYRef = useRef(0);

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > lastYRef.current + 8 && y > 80) setVisible(false);
        else if (y < lastYRef.current - 4) setVisible(true);
        lastYRef.current = y;
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function openSearch(e: React.MouseEvent) {
    e.preventDefault();
    window.dispatchEvent(new Event("sashico:open-search"));
  }

  const navItems: Array<{
    href: string;
    icon: React.ElementType;
    label: string;
    badge?: number;
    onClick?: (e: React.MouseEvent) => void;
  }> = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/shop", icon: Grid2x2, label: "Shop" },
    { href: "#", icon: Search, label: "Search", onClick: openSearch },
    { href: "/cart", icon: ShoppingBag, label: "Cart", badge: cartCount },
    { href: "/order-tracking", icon: User, label: "Orders" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-black/8 transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ href, icon: Icon, label, badge, onClick }) => {
          const active = isActive(href) && href !== "#";
          const cls = cn(
            "flex flex-col items-center gap-0.5 px-3 py-1.5 relative transition-colors",
            active ? "text-black" : "text-brand-gray-400"
          );
          const inner = (
            <>
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                {badge && badge > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-black text-white text-[9px] flex items-center justify-center leading-none">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </div>
              <span className={cn(
                "text-[9px] uppercase tracking-wider leading-none",
                active ? "font-semibold" : "font-normal"
              )}>
                {label}
              </span>
            </>
          );
          return onClick ? (
            <button key={label} onClick={onClick} className={cls}>{inner}</button>
          ) : (
            <Link key={href + label} href={href} className={cls}>{inner}</Link>
          );
        })}
      </div>
    </nav>
  );
}
