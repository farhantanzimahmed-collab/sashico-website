import type { Metadata } from "next";

// "checkout" page is a client component, so its metadata lives here
export const metadata: Metadata = {
  title: "Checkout",
  // Personal, session-specific page — keep out of search results
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
