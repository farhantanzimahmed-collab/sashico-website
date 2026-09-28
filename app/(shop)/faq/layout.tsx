import type { Metadata } from "next";

// "faq" page is a client component, so its metadata lives here
export const metadata: Metadata = {
  title: "FAQ — Orders, Delivery & Exchanges",
  description:
    "Answers to common questions about shopping Sashico streetwear in Bangladesh: cash on delivery, delivery times, sizing, exchanges and free shipping over ৳2,000.",
  alternates: { canonical: "/faq" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
