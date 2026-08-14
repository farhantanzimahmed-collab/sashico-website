import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageEditor from "./PageEditor";

const PAGE_META: Record<string, { label: string; defaults: Record<string, unknown> }> = {
  about: {
    label: "About Us",
    defaults: {
      heading: "Embroidery Is Our Language",
      subheading: "Born from Bangladesh",
      body: "Sashico emerged from a simple belief: that Bangladesh's rich textile heritage deserves a place in the global streetwear conversation. We are a Dhaka-based fashion label that blends the ancient art of embroidery with the bold aesthetic of contemporary street culture.",
      values: [
        { title: "Craftsmanship", description: "Every piece is hand-crafted with meticulous attention to detail. Our artisans bring decades of embroidery expertise to each garment." },
        { title: "Authenticity", description: "We stay true to our roots — Bangladeshi craftsmanship, local materials, and designs that tell real stories." },
        { title: "Community", description: "Sashico is more than a brand. It's a community of individuals who wear their identity with pride." },
      ],
    },
  },
  contact: {
    label: "Contact Us",
    defaults: {
      heading: "Get In Touch",
      body: "Have a question about an order, a product, or just want to say hello — we're here for it.",
      email: "sashicofficial2020@gmail.com",
      phone: "01628340463",
      address: "Dhaka, Bangladesh",
      hours: "Mon–Sat, 10am–6pm",
    },
  },
  faq: {
    label: "FAQ",
    defaults: {
      heading: "Frequently Asked Questions",
      categories: [
        {
          name: "Orders",
          items: [
            { q: "How do I place an order?", a: "Browse our shop, select your product and size, and click Add to Cart. Proceed to checkout and fill in your delivery details." },
            { q: "What payment methods do you accept?", a: "We accept Cash on Delivery (COD). Pay when the order arrives at your door." },
          ],
        },
        {
          name: "Shipping",
          items: [
            { q: "How long does delivery take?", a: "Dhaka deliveries: 2–4 business days. Outside Dhaka: 4–6 business days." },
            { q: "Do you offer free shipping?", a: "Yes! Orders above ৳2,000 qualify for free shipping. Below that, a flat ৳80 fee applies." },
          ],
        },
        {
          name: "Returns & Exchanges",
          items: [
            { q: "What is your return policy?", a: "We accept returns within 7 days of delivery for unworn, unwashed items with tags intact." },
            { q: "How do I initiate a return?", a: "Email sashicofficial2020@gmail.com with your order number and reason for return." },
          ],
        },
      ],
    },
  },
  "size-guide": {
    label: "Size Guide",
    defaults: {
      heading: "Size Guide",
      body: "All measurements in centimeters. When in doubt, size up for a relaxed streetwear fit.",
      rows: [
        { size: "XS",  chest: "84–88",   waist: "70–74",   hips: "88–92",   shoulder: "41" },
        { size: "S",   chest: "88–92",   waist: "74–78",   hips: "92–96",   shoulder: "43" },
        { size: "M",   chest: "92–96",   waist: "78–82",   hips: "96–100",  shoulder: "45" },
        { size: "L",   chest: "96–100",  waist: "82–86",   hips: "100–104", shoulder: "47" },
        { size: "XL",  chest: "100–106", waist: "86–92",   hips: "104–110", shoulder: "49" },
        { size: "XXL", chest: "106–112", waist: "92–98",   hips: "110–116", shoulder: "51" },
        { size: "3XL", chest: "112–118", waist: "98–104",  hips: "116–122", shoulder: "53" },
      ],
    },
  },
  shipping: {
    label: "Shipping Policy",
    defaults: {
      heading: "Shipping Policy",
      body: `<h2>Shipping Rates</h2>
<p>Dhaka: <strong>৳80</strong> flat rate. Outside Dhaka: <strong>৳130</strong> flat rate. Free shipping on orders above <strong>৳2,000</strong>.</p>

<h2>Delivery Times</h2>
<p>Dhaka: 2–4 business days. Outside Dhaka: 4–6 business days. Remote areas may take up to 10 business days.</p>

<h2>Order Tracking</h2>
<p>Once your order ships, you'll receive an SMS with a tracking number and courier details.</p>

<h2>International Shipping</h2>
<p>Currently we ship within Bangladesh only. International shipping is planned for the future.</p>`,
    },
  },
  returns: {
    label: "Return Policy",
    defaults: {
      heading: "Return & Exchange Policy",
      body: `<h2>Return Window</h2>
<p>We accept returns within <strong>7 days</strong> of delivery for unworn, unwashed items with tags attached.</p>

<h2>How to Return</h2>
<p>Email <a href="mailto:sashicofficial2020@gmail.com">sashicofficial2020@gmail.com</a> with your order number and reason. We'll send return instructions within 24 hours.</p>

<h2>Refunds</h2>
<p>Refunds are processed within 48 hours of receiving the returned item.</p>

<h2>Non-Returnable Items</h2>
<p>Sale items are final sale and cannot be returned or exchanged.</p>`,
    },
  },
  privacy: {
    label: "Privacy Policy",
    defaults: {
      heading: "Privacy Policy",
      body: `<h2>Information We Collect</h2>
<p>We collect only the information necessary to process your orders: name, email, phone number, and delivery address.</p>

<h2>How We Use Your Information</h2>
<p>Your information is used solely to fulfil orders, send order updates, and improve your shopping experience. We never sell your data.</p>

<h2>Cookies</h2>
<p>We use essential cookies to maintain your shopping cart. We may also use analytics cookies to understand site usage.</p>

<h2>Contact</h2>
<p>For privacy concerns, email <a href="mailto:sashicofficial2020@gmail.com">sashicofficial2020@gmail.com</a>.</p>`,
    },
  },
  terms: {
    label: "Terms of Service",
    defaults: {
      heading: "Terms of Service",
      body: `<h2>Acceptance of Terms</h2>
<p>By using our website and placing orders, you agree to these terms of service.</p>

<h2>Products & Pricing</h2>
<p>All prices are in Bangladeshi Taka (৳). We reserve the right to change prices without prior notice.</p>

<h2>Orders</h2>
<p>All orders are subject to availability. We reserve the right to cancel any order and issue a full refund.</p>

<h2>Intellectual Property</h2>
<p>All content on this website, including images, text, and designs, is the property of Sashico and may not be reproduced without permission.</p>`,
    },
  },
};

export default async function AdminPageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = PAGE_META[slug];
  if (!meta) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("page_content")
    .select("*")
    .eq("page_slug", slug)
    .single();

  const content = (data?.content as Record<string, unknown>) || meta.defaults;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/pages" className="text-brand-gray-400 hover:text-brand-black transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-sans font-bold text-brand-black">{meta.label}</h1>
          <p className="text-xs font-sans text-brand-gray-400 mt-0.5">/{slug === "size-guide" ? "size-guide" : slug} · Changes go live immediately</p>
        </div>
      </div>

      <div className="bg-white border border-brand-gray-100 p-6">
        <PageEditor
          slug={slug}
          label={meta.label}
          initialContent={content}
          pageId={data?.id ?? null}
        />
      </div>
    </div>
  );
}
