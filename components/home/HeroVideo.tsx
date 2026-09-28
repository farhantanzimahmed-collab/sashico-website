"use client";

import { useEffect, useRef } from "react";

interface HeroVideoProps {
  /** Admin-configured video URL (Settings → Hero → Video) */
  src: string;
}

// The bundled home reel ships in two sizes + a poster frame. Any other URL set in
// admin is played as-is.
const REEL_720 = "/videos/home-reel-720.mp4";
const REEL_540 = "/videos/home-reel-540.mp4";
const REEL_POSTER = "/videos/home-reel-poster.jpg";

export default function HeroVideo({ src }: HeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const isBundledReel = src === REEL_720 || src === REEL_540;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Respect reduced-motion and data-saver: keep the still poster frame
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduceMotion || saveData) return;

    // Attach the source only after the page has loaded, so the reel never
    // competes with the page itself for bandwidth (poster shows meanwhile)
    const start = () => {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      video.src = isBundledReel ? (desktop ? REEL_720 : REEL_540) : src;
      video.play().catch(() => {
        // Autoplay blocked (e.g. iOS Low Power Mode) — poster stays visible
      });
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, [src, isBundledReel]);

  return (
    <>
      {/* Desktop only: soft blurred frame of the reel fills the wide background */}
      {isBundledReel && (
        <div
          aria-hidden
          className="absolute inset-0 hidden lg:block bg-cover bg-center scale-110"
          style={{ backgroundImage: "url(/videos/home-reel-blur.jpg)" }}
        />
      )}
      <div aria-hidden className="absolute inset-0 hidden lg:block bg-black/45" />

      {/* Mobile: full-bleed vertical reel. Desktop: tall 9:16 panel on the right. */}
      <video
        ref={ref}
        poster={isBundledReel ? REEL_POSTER : undefined}
        muted
        loop
        playsInline
        preload="none"
        aria-label="Sashico lookbook reel"
        className="absolute inset-0 h-full w-full object-cover
                   lg:inset-auto lg:right-[7vw] lg:top-[calc(50%+3rem)] lg:-translate-y-1/2
                   lg:h-[74vh] lg:w-auto lg:aspect-[9/16] lg:rounded-xl lg:shadow-2xl lg:ring-1 lg:ring-white/10"
      />

      {/* Mobile readability: darken only the lower part where the headline sits */}
      <div aria-hidden className="absolute inset-0 lg:hidden bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
    </>
  );
}
