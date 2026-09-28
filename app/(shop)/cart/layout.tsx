import type { Metadata } from "next";

// "cart" page is a client component, so its metadata lives here
export const metadata: Metadata = {
  title: "Your Cart",
  // Personal, session-specific page — keep out of search results
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
