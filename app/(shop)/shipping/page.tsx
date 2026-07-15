import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Learn about Sashico shipping times, rates, and delivery details.",
};

export const revalidate = 300;

const DEFAULT = {
  heading: "Shipping Policy",
  body: `<h2>Shipping Rates</h2>
<p>Dhaka: <strong>৳80</strong> flat rate. Outside Dhaka: <strong>৳130</strong> flat rate. Free shipping on orders above <strong>৳2,000</strong>.</p>

<h2>Delivery Times</h2>
<p>Dhaka: 2–4 business days. Outside Dhaka: 4–6 business days. Remote areas may take up to 10 business days.</p>

<h2>Order Tracking</h2>
<p>Once your order ships, you'll receive an SMS with a tracking number and courier details.</p>

<h2>International Shipping</h2>
<p>Currently we ship within Bangladesh only. International shipping is planned for the future.</p>`,
};

async function getContent() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("page_content").select("content").eq("page_slug", "shipping").single();
    return (data?.content as typeof DEFAULT) || DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export default async function ShippingPage() {
  const c = await getContent();
  return (
    <div className="pt-24 sm:pt-28 pb-20">
      <div className="bg-brand-black text-white py-14 sm:py-20">
        <div className="container-xl max-w-3xl">
          <p className="label-xs text-brand-gray-500 mb-4">Delivery</p>
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
