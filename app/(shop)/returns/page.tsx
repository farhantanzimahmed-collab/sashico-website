import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Returns & Exchanges",
  description: "Sashico refund, exchange and return policy — contact us within 72 hours of receiving your order.",
};

export const revalidate = 300;

const DEFAULT = {
  heading: "Refund, Exchange & Return Policy",
  body: `<p>At <strong>SASHICO</strong>, customer satisfaction is always our top priority. If you receive a product that you are not fully satisfied with, you may request a return, exchange, replacement, or refund, subject to the following conditions.</p>

<h2>Return &amp; Exchange Conditions</h2>
<ul>
  <li>You must inform us within <strong>72 hours of receiving the product</strong> to request a return or exchange.</li>
  <li>The product must be returned in the <strong>same condition</strong> in which it was received.</li>
  <li>Items must be <strong>unused, unworn, unaltered, and free from any damage caused by the customer</strong>.</li>
  <li>The product must be returned with its <strong>original packaging</strong>.</li>
  <li>A valid <strong>invoice or proof of purchase</strong> is required for any return, exchange, or refund request.</li>
  <li>All exchanges are subject to <strong>product availability</strong>.</li>
  <li>An order can only be <strong>exchanged once</strong>.</li>
</ul>

<h2>Delivery Charges</h2>
<ul>
  <li>For returns and exchanges, the <strong>original delivery charge is non-refundable</strong>.</li>
  <li>Delivery charges may apply for exchanges and replacements.</li>
  <li>However, if a replacement is required due to an <strong>incorrect, defective, or damaged product sent by SASHICO</strong>, we will bear the delivery cost for both collecting the product and sending the replacement.</li>
</ul>

<h2>Refund Policy</h2>
<ul>
  <li>Refunds are only applicable in cases where there is a <strong>valid and reasonable justification</strong>.</li>
  <li>Once a refund request is approved, the refund process may take approximately <strong>7–10 working days</strong> to complete.</li>
</ul>

<h2>Need Help With a Return?</h2>
<p>For any <strong>return, exchange, replacement, or refund-related queries</strong>, please contact us directly on <a href="https://wa.me/8801628340463" target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
<p>When contacting us, please provide your <strong>Invoice Number or Order Contact Number</strong> so that we can quickly verify and assist with your request.</p>`,
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
