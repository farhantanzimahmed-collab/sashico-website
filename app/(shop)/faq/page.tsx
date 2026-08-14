"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DEFAULT_CONTENT = {
  heading: "Frequently Asked Questions",
  categories: [
    {
      name: "Orders",
      items: [
        { q: "How do I place an order?", a: "Browse our shop, select your product and size, and click Add to Cart. Proceed to checkout and fill in your delivery details." },
        { q: "What payment methods do you accept?", a: "We accept Cash on Delivery (COD). Pay when the order arrives at your door — no upfront payment required." },
        { q: "Can I modify or cancel my order?", a: "Orders can be modified or cancelled within 1 hour of placement. Contact us at sashicofficial2020@gmail.com immediately." },
      ],
    },
    {
      name: "Shipping",
      items: [
        { q: "How long does delivery take?", a: "Dhaka deliveries: 2–4 business days. Outside Dhaka: 4–6 business days." },
        { q: "Do you offer free shipping?", a: "Yes! Orders above ৳2,000 qualify for free shipping nationwide. Below that, a flat ৳80 fee applies." },
        { q: "Do you ship internationally?", a: "Currently we ship within Bangladesh only. International shipping is planned for the future." },
      ],
    },
    {
      name: "Products",
      items: [
        { q: "How is the sizing?", a: "Our garments have a relaxed, contemporary fit. Check our Size Guide for measurements. When between sizes, size up." },
        { q: "Are your embroideries hand-stitched?", a: "Yes. All embroidery is crafted by skilled Bangladeshi artisans using a combination of hand and machine techniques." },
        { q: "How should I care for my garment?", a: "Machine wash cold (30°C max) inside out. Do not bleach. Iron on low heat away from embroidery." },
      ],
    },
    {
      name: "Returns & Exchanges",
      items: [
        { q: "What is your return policy?", a: "We accept returns within 7 days of delivery for unworn, unwashed items with tags intact." },
        { q: "How do I initiate a return?", a: "Email sashicofficial2020@gmail.com with your order number and reason. We'll send return instructions within 24 hours." },
      ],
    },
  ],
};

type Content = typeof DEFAULT_CONTENT;
type Category = Content["categories"][number];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = `faq-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="border-b border-brand-gray-100">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="flex items-center justify-between w-full py-4 sm:py-5 text-left gap-4"
      >
        <p className="text-sm font-sans font-medium text-brand-black leading-snug">{q}</p>
        <ChevronDown className={cn("h-4 w-4 text-brand-gray-400 flex-shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && <p id={id} className="pb-5 text-sm font-sans text-brand-gray-600 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function FAQPage() {
  const [content, setContent] = useState<Content>(DEFAULT_CONTENT);

  useEffect(() => {
    fetch("/api/page-content?slug=faq")
      .then((r) => r.json())
      .then((d) => { if (d?.content) setContent((prev) => ({ ...prev, ...d.content })); })
      .catch(() => {});
  }, []);

  const categories = (content.categories || DEFAULT_CONTENT.categories) as Category[];

  return (
    <div className="pt-24 sm:pt-28 pb-20">
      <div className="bg-brand-black text-white py-14 sm:py-20">
        <div className="container-xl max-w-3xl">
          <p className="label-xs text-brand-gray-500 mb-4">Help</p>
          <h1 className="display-heading text-[clamp(2rem,8vw,6rem)] text-white leading-none">{content.heading}</h1>
        </div>
      </div>

      <div className="container-xl max-w-3xl py-12 sm:py-16 space-y-10 sm:space-y-14">
        {categories.map((section) => (
          <div key={section.name}>
            <h2 className="label-xs text-brand-black mb-4 sm:mb-6 pb-3 border-b border-brand-gray-100">{section.name}</h2>
            <div>
              {section.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        <div className="bg-brand-gray-50 p-6 sm:p-8 text-center border border-brand-gray-100">
          <h3 className="font-sans text-base font-semibold text-brand-black mb-2">Still have questions?</h3>
          <p className="text-sm text-brand-gray-600 font-sans mb-5">We're here to help. Reach out and we'll get back to you within a few hours.</p>
          <Link href="/contact" className="btn-primary">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
