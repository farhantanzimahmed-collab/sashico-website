import type { Metadata } from "next";

// "order-tracking" page is a client component, so its metadata lives here
export const metadata: Metadata = {
  title: "Track Your Order",
  description: "Track your Sashico order status with your order number and phone number.",
  alternates: { canonical: "/order-tracking" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
