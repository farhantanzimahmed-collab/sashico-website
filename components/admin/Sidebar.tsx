"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Megaphone,
  Settings,
  LogOut,
  ExternalLink,
  FileText,
  Tag,
  Mail,
  MessageSquare,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
  { href: "/admin/contacts", label: "Messages", icon: MessageSquare },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/telegram", label: "Telegram Bot", icon: Send },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-brand-black text-brand-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-brand-gray-800">
        <Link href="/admin" className="block">
          <Image
            src="/sashico-logo-white.png"
            alt="Sashico"
            width={346}
            height={103}
            className="h-8 w-auto object-contain mb-2"
          />
          <p className="text-2xs uppercase tracking-widest text-brand-gray-500 font-sans">
            Admin Panel
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-sans font-medium transition-colors duration-200 rounded",
                isActive
                  ? "bg-brand-gray-800 text-brand-white"
                  : "text-brand-gray-400 hover:text-brand-white hover:bg-brand-gray-800"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="px-4 py-6 border-t border-brand-gray-800 space-y-1">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-sans text-brand-gray-400 hover:text-brand-white hover:bg-brand-gray-800 transition-colors rounded"
        >
          <ExternalLink className="h-4 w-4" />
          View Store
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-sans text-brand-gray-400 hover:text-brand-white hover:bg-brand-gray-800 transition-colors rounded w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
