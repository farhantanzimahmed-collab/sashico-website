import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { SiteSettings } from "@/lib/types";
import { getImageUrl } from "@/lib/utils";

interface HeroProps {
  settings: SiteSettings;
  featuredImages?: (string | null)[];
}

export default function Hero({ settings, featuredImages = [] }: HeroProps) {
  const heroVideo = settings.hero_video || "";
  const heroCoverImage = settings.hero_cover_image || "";
  const heroMode = settings.hero_mode || (heroVideo ? "video" : "multi_image");

  const panels = Array(4).fill(null).map((_, i) => featuredImages[i] ?? null);
  const firstImage = panels.find(Boolean) ?? null;

  const rawTitle = settings.hero_title || "Wear the Culture";
  const words = rawTitle.split(" ");

  return (
    <section className="relative h-screen min-h-[600px] w-full overflow-hidden bg-black">

      {/* ── Background ─────────────────────────────────────── */}
      {heroMode === "video" && heroVideo ? (
        <div className="absolute inset-0">
          <video
            src={heroVideo}
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
        </div>

      ) : heroMode === "single_image" && heroCoverImage ? (
        <div className="absolute inset-0">
          <Image
            src={getImageUrl(heroCoverImage)}
            alt={settings.hero_title || "Hero"}
            fill priority sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </div>

      ) : (
        <>
          {/* Mobile: single image */}
          <div className="absolute inset-0 sm:hidden">
            {firstImage ? (
              <Image
                src={getImageUrl(firstImage)}
                alt="Collection"
                fill priority sizes="100vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-brand-gray-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/15 to-black/75" />
          </div>

          {/* Tablet: 2 panels */}
          <div className="absolute inset-0 hidden sm:flex lg:hidden">
            {panels.slice(0, 2).map((img, i) => (
              <div key={i} className="relative flex-1 overflow-hidden">
                {img ? (
                  <Image
                    src={getImageUrl(img)}
                    alt={`Collection ${i + 1}`}
                    fill priority sizes="50vw"
                    className="object-cover scale-100 hover:scale-[1.03] transition-transform duration-700"
                  />
                ) : (
                  <div className={`absolute inset-0 ${i === 0 ? "bg-brand-gray-900" : "bg-brand-gray-800"}`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />
              </div>
            ))}
          </div>

          {/* Desktop: 4 panels */}
          <div className="absolute inset-0 hidden lg:flex">
            {panels.map((img, i) => (
              <div key={i} className="relative flex-1 overflow-hidden group">
                {img ? (
                  <Image
                    src={getImageUrl(img)}
                    alt={`Collection ${i + 1}`}
                    fill priority sizes="25vw"
                    className="object-cover scale-100 group-hover:scale-[1.03] transition-transform duration-700"
                  />
                ) : (
                  <div className={`absolute inset-0 ${
                    i === 0 ? "bg-brand-gray-900" :
                    i === 1 ? "bg-brand-gray-800" :
                    i === 2 ? "bg-[#111]" : "bg-brand-gray-900"
                  }`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/65" />
              </div>
            ))}
          </div>

          <div className="absolute inset-0 bg-black/30" />
        </>
      )}

      {/* ── Main content ───────────────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-end w-full h-full container-xl pb-16 lg:pb-24" style={{ animation: "hero-fade-up 0.8s ease-out 0.1s both" }}>
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-6 bg-white/40" />
            <p className="label-xs text-white/55">Premium Streetwear · Bangladesh</p>
          </div>

          <h1 className="display-heading text-white leading-none mb-10">
            {/* First word — solid white */}
            <span
              className="block"
              style={{ fontSize: "clamp(3rem, 10vw, 9rem)" }}
            >
              {words[0]?.toUpperCase()}
            </span>
            {/* Remaining words — elegant outline treatment */}
            <span
              className="block"
              style={{
                fontSize: "clamp(3rem, 10vw, 9rem)",
                WebkitTextStroke: "1px rgba(255,255,255,0.35)",
                color: "transparent",
              }}
            >
              {words.slice(1).join(" ").toUpperCase() || "THE CULTURE"}
            </span>
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <Link href="/shop" className="btn-primary">
              {settings.hero_cta_text || "Shop Collection"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/about"
              className="label-xs text-white/55 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              Our Story <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute right-8 bottom-10 hidden lg:flex flex-col items-center gap-2 z-10">
        <div className="h-12 w-px bg-gradient-to-b from-white/0 to-white/20" />
        <p className="label-xs text-white/20" style={{ writingMode: "vertical-lr" }}>Scroll</p>
      </div>
    </section>
  );
}
