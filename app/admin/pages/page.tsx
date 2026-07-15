import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";

const PAGES = [
  { slug: "about",    label: "About Us",         desc: "Brand story, values, team section" },
  { slug: "contact",  label: "Contact Us",        desc: "Email, phone, address, business hours" },
  { slug: "faq",      label: "FAQ",               desc: "Frequently asked questions by category" },
  { slug: "size-guide", label: "Size Guide",      desc: "Measurement chart and fit advice" },
  { slug: "shipping", label: "Shipping Policy",   desc: "Rates, delivery times, coverage" },
  { slug: "returns",  label: "Return Policy",     desc: "Return window, process, refund info" },
  { slug: "privacy",  label: "Privacy Policy",    desc: "Data collection and usage policy" },
  { slug: "terms",    label: "Terms of Service",  desc: "Website usage terms and conditions" },
];

export default function AdminPagesIndex() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-sans font-bold text-brand-black">Pages</h1>
        <p className="text-sm text-brand-gray-500 font-sans mt-1">Edit content for all static pages. Changes go live immediately.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAGES.map((page) => (
          <Link
            key={page.slug}
            href={`/admin/pages/${page.slug}`}
            className="bg-white border border-brand-gray-100 p-6 hover:border-brand-black transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="h-10 w-10 bg-brand-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-black transition-colors">
                <FileText className="h-4 w-4 text-brand-gray-400 group-hover:text-white transition-colors" />
              </div>
              <ArrowRight className="h-4 w-4 text-brand-gray-300 group-hover:text-brand-black transition-colors mt-0.5 flex-shrink-0" />
            </div>
            <div className="mt-4">
              <p className="text-sm font-sans font-semibold text-brand-black">{page.label}</p>
              <p className="text-xs font-sans text-brand-gray-400 mt-1 leading-relaxed">{page.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
