"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: { href: string; label: string }[];
}

export default function MobileMenu({ isOpen, onClose, links }: MobileMenuProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-80 bg-white transition-transform duration-400 ease-in-out lg:hidden flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-black/8">
          <span className="display-heading text-[1.8rem] tracking-[0.12em] text-black">
            SASHICO
          </span>
          <button onClick={onClose} aria-label="Close menu" className="text-brand-gray-400 hover:text-black transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-8 py-10">
          <ul className="space-y-1">
            {links.map((link, i) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="flex items-center justify-between py-4 border-b border-black/8 group"
                >
                  <span className="display-heading text-[2rem] tracking-[0.04em] text-black group-hover:text-brand-gray-500 transition-colors">
                    {link.label.toUpperCase()}
                  </span>
                  <span className="label-xs text-brand-gray-300 group-hover:text-brand-gray-500 transition-colors">
                    0{i + 1}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 space-y-3">
            {[
              { label: "Track Order", href: "/order-tracking" },
              { label: "Size Guide", href: "/size-guide" },
              { label: "Shipping", href: "/shipping" },
              { label: "Returns", href: "/returns" },
              { label: "FAQ", href: "/faq" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="block label-xs text-brand-gray-400 hover:text-black transition-colors py-1"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-black/8">
          <p className="label-xs text-brand-gray-400">Dhaka, Bangladesh</p>
          <p className="label-xs text-brand-gray-400 mt-1">hello@sashico.com</p>
        </div>
      </div>
    </>
  );
}
