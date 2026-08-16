import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Sashico privacy policy — how we collect, use, and protect your information.",
};

export const revalidate = 3600;

const DEFAULT = {
  heading: "Privacy Policy",
  body: `<h2>Information We Collect</h2>
<p>We collect only the information necessary to process your orders: name, email, phone number, and delivery address.</p>

<h2>How We Use Your Information</h2>
<p>Your information is used solely to fulfil orders, send order updates, and improve your shopping experience. We never sell your data to third parties.</p>

<h2>Cookies</h2>
<p>We use essential cookies to maintain your shopping cart. We may also use analytics cookies to understand site usage.</p>

<h2>Contact</h2>
<p>For privacy concerns, email <a href="mailto:sashicofficial2020@gmail.com">sashicofficial2020@gmail.com</a>.</p>`,
};

async function getContent() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("page_content").select("content").eq("page_slug", "privacy").single();
    return (data?.content as typeof DEFAULT) || DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export default async function PrivacyPage() {
  const c = await getContent();
  return (
    <div className="pt-24 sm:pt-28 pb-20">
      <div className="bg-brand-black text-white py-14 sm:py-20">
        <div className="container-xl max-w-3xl">
          <p className="label-xs text-brand-gray-500 mb-4">Legal</p>
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
