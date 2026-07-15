import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Returns & Exchanges",
  description: "Sashico return and exchange policy — 7-day hassle-free returns.",
};

export const revalidate = 300;

const DEFAULT = {
  heading: "Return & Exchange Policy",
  body: `<h2>Return Window</h2>
<p>We accept returns within <strong>7 days</strong> of delivery for unworn, unwashed items with tags attached.</p>

<h2>How to Return</h2>
<p>Email <a href="mailto:hello@sashico.com">hello@sashico.com</a> with your order number and reason. We'll send return instructions within 24 hours.</p>

<h2>Refunds</h2>
<p>Refunds are processed within 48 hours of receiving the returned item.</p>

<h2>Non-Returnable Items</h2>
<p>Sale items are final sale and cannot be returned or exchanged.</p>`,
};

async function getContent() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("page_content").select("content").eq("page_slug", "returns").single();
    return (data?.content as typeof DEFAULT) || DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export default async function ReturnsPage() {
  const c = await getContent();
  return (
    <div className="pt-24 sm:pt-28 pb-20">
      <div className="bg-brand-black text-white py-14 sm:py-20">
        <div className="container-xl max-w-3xl">
          <p className="label-xs text-brand-gray-500 mb-4">Policy</p>
          <h1 className="display-heading text-[clamp(2rem,7vw,5rem)] text-white leading-none">{c.heading}</h1>
        </div>
      </div>
      <div className="container-xl max-w-3xl py-12 sm:py-16">
        <div
          className="font-sans space-y-4
            [&_h2]:text-xs [&_h2]:font-sans [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:text-brand-black [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:first:mt-0 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-brand-gray-100
            [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-brand-gray-600
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-sm [&_li]:text-brand-gray-600
            [&_a]:text-brand-black [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:font-semibold [&_strong]:text-brand-black"
          dangerouslySetInnerHTML={{ __html: c.body }}
        />
      </div>
    </div>
  );
}
