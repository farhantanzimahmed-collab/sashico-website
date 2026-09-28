import type { Metadata } from "next";

// "wishlist" page is a client component, so its metadata lives here
export const metadata: Metadata = {
  title: "Wishlist",
  // Personal, session-specific page — keep out of search results
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
