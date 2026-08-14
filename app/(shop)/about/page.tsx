import { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { SiteSettings } from "@/lib/types";
import { getImageUrl } from "@/lib/utils";
import Newsletter from "@/components/home/Newsletter";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Sashico — the Bangladeshi streetwear brand redefining embroidery-based fashion.",
};

export const revalidate = 300;

const DEFAULT_CONTENT = {
  heading: "Embroidery Is Our Language",
  subheading: "Born from Bangladesh",
  body: "Sashico emerged from a simple belief: that Bangladesh's rich textile heritage deserves a place in the global streetwear conversation. We are a Dhaka-based fashion label that blends the ancient art of embroidery with the bold aesthetic of contemporary street culture.\n\nOur name — Sashico — draws inspiration from the Japanese art of Sashiko, a functional embroidery technique known for its beauty and durability. We see this as a metaphor for everything we do: purposeful, lasting, and beautiful.",
  values: [
    { title: "Craftsmanship", description: "Every piece is hand-crafted with meticulous attention to detail. Our artisans bring decades of embroidery expertise to each garment." },
    { title: "Authenticity", description: "We stay true to our roots — Bangladeshi craftsmanship, local materials, and designs that tell real stories." },
    { title: "Community", description: "Sashico is more than a brand. It's a community of individuals who wear their identity with pride." },
  ],
};

type Content = typeof DEFAULT_CONTENT;

async function getData() {
  const supabase = await createClient();
  const [settingsRes, pageRes] = await Promise.all([
    supabase.from("site_settings").select("about_title,about_content,about_image").eq("id", 1).single(),
    supabase.from("page_content").select("content").eq("page_slug", "about").single(),
  ]);
  return {
    settings: settingsRes.data as Pick<SiteSettings, "about_title" | "about_content" | "about_image"> | null,
    content: (pageRes.data?.content as Content) || DEFAULT_CONTENT,
  };
}

export default async function AboutPage() {
  const { settings, content } = await getData();
  const values = content.values || DEFAULT_CONTENT.values;

  return (
    <>
      {/* Hero */}
      <div className="pt-24 sm:pt-28 bg-brand-black text-white">
        <div className="container-xl py-14 sm:py-20">
          <p className="label-xs text-brand-gray-500 mb-4 sm:mb-6">Who We Are</p>
          <h1 className="display-heading text-[clamp(2.5rem,9vw,7rem)] text-white leading-none max-w-3xl">
            {content.heading}
          </h1>
        </div>
      </div>

      {/* Brand Story */}
      <section className="py-16 sm:py-24 lg:py-28">
        <div className="container-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <p className="label-xs text-brand-gray-400 mb-4">Our Story</p>
              <h2 className="display-heading text-[clamp(1.8rem,4vw,3rem)] text-brand-black leading-tight mb-6 sm:mb-8">
                {content.subheading || settings?.about_title || "Born from Bangladesh"}
              </h2>
              <div className="space-y-4 text-sm text-brand-gray-600 font-sans leading-relaxed">
                {(content.body || settings?.about_content || "").split("\n\n").filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
            <div className="relative aspect-[4/5] bg-brand-black overflow-hidden lg:-mt-0 mt-4">
              {settings?.about_image ? (
                <Image
                  src={getImageUrl(settings.about_image)}
                  alt="Sashico brand story"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <video
                  src="/sashico-brand.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-24 bg-brand-black">
        <div className="container-xl">
          <p className="label-xs text-brand-gray-500 mb-4 text-center">What We Stand For</p>
          <h2 className="display-heading text-[clamp(2rem,5vw,4rem)] text-white text-center leading-tight mb-12 sm:mb-16">Our Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-brand-gray-800">
            {values.map((v) => (
              <div key={v.title} className="bg-brand-black p-8 sm:p-10 hover:bg-brand-gray-900 transition-colors">
                <h3 className="font-sans text-base font-semibold text-white mb-4">{v.title}</h3>
                <p className="text-sm text-brand-gray-400 font-sans leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 sm:py-20 bg-brand-gray-50">
        <div className="container-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { number: "100%", label: "Handcrafted" },
              { number: "BD", label: "Made in Bangladesh" },
              { number: "2024", label: "Year Founded" },
              { number: "∞", label: "Passion for Craft" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="display-heading text-[2.5rem] sm:text-[3.5rem] text-brand-black leading-none">{stat.number}</p>
                <p className="label-xs text-brand-gray-500 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Newsletter />
    </>
  );
}
