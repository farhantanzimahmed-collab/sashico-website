import type { Metadata } from "next";

// "contact" page is a client component, so its metadata lives here
export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Sashico, the Dhaka-based streetwear brand — questions about orders, sizing, exchanges or collaborations. We reply fast on phone, email and Instagram.",
  alternates: { canonical: "/contact" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
