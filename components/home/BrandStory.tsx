import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { SiteSettings } from "@/lib/types";
import { getImageUrl } from "@/lib/utils";

interface BrandStoryProps {
  settings: SiteSettings;
}

export default function BrandStory({ settings }: BrandStoryProps) {
  return (
    <section className="bg-black text-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">

        {/* Image panel */}
        <div className="relative aspect-[4/3] lg:aspect-auto min-h-[400px] bg-brand-gray-900">
          {settings.about_image ? (
            <Image
              src={getImageUrl(settings.about_image)}
              alt="Sashico brand story"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover opacity-75"
            />
          ) : (
            <div aria-hidden="true" className="brand-story-sco absolute inset-0 flex items-center justify-center" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50 hidden lg:block" />
        </div>

        {/* Text panel */}
        <div className="flex flex-col justify-center px-10 lg:px-16 py-20 lg:py-24">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-6 h-px bg-white/25" />
            <p className="label-xs text-white/55">Our Story</p>
          </div>

          <h2 className="display-heading text-[clamp(2.5rem,5vw,4.5rem)] text-white leading-none mb-8">
            {(settings.about_title || "CRAFTED WITH INTENTION").toUpperCase()}
          </h2>

          <p className="text-sm text-white/60 leading-relaxed max-w-md mb-6">
            {settings.about_content ||
              "Sashico was born from a deep reverence for the art of embroidery — a craft woven into Bangladesh's cultural identity for centuries. We take that heritage into the modern streetwear space."}
          </p>
          <p className="text-sm text-white/60 leading-relaxed max-w-md mb-12">
            Every stitch tells a story. Every piece carries the weight of tradition and the spirit of street culture — a collision that results in something entirely new.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-12 pt-10 border-t border-white/10">
            {[
              { value: "100%", label: "Handcrafted" },
              { value: "BD", label: "Made Local" },
              { value: "∞", label: "Premium Only" },
            ].map((s) => (
              <div key={s.label}>
                <p className="display-heading text-[2.2rem] text-white leading-none">{s.value}</p>
                <p className="label-xs text-white/55 mt-2">{s.label}</p>
              </div>
            ))}
          </div>

          <Link
            href="/about"
            className="inline-flex items-center gap-3 label-xs text-white/55 hover:text-white transition-colors group"
          >
            Read Full Story
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
