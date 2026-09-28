"use client";

import { useEffect, useRef, useState } from "react";

interface HeroVideoProps {
  /** Admin-configured video URL (Settings → Hero → Video) */
  src: string;
}

// The bundled home reel ships as two cuts of the same footage:
//  - phones:  full vertical 9:16 reel (540p)
//  - desktop: a landscape band cut from the original 1080p (faces + outfits),
//    so it fills a wide screen edge-to-edge without upscaling a vertical video
// Any other URL set in admin is played as-is on all screens.
const REEL = {
  mobile: "/videos/home-reel-540.mp4",
  mobilePoster: "/videos/home-reel-poster.jpg",
  desktop: "/videos/home-reel-desktop.mp4",
  desktopPoster: "/videos/home-reel-desktop-poster.jpg",
};

export default function HeroVideo({ src }: HeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const isBundledReel = src.startsWith("/videos/home-reel");

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Respect reduced-motion and data-saver: keep the still poster frame
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduceMotion || saveData) return;

    // Attach the source only after the page has loaded so the reel never
    // competes with the page itself for bandwidth (poster shows meanwhile)
    const start = () => {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      video.src = isBundledReel ? (desktop ? REEL.desktop : REEL.mobile) : src;
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
      {/* Poster: right crop per screen, visible until the first video frame plays */}
      {isBundledReel && (
        <picture>
          <source media="(min-width: 1024px)" srcSet={REEL.desktopPoster} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={REEL.mobilePoster}
            alt=""
            aria-hidden
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      )}

      {/* Full-bleed on every screen size */}
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="none"
        aria-label="Sashico lookbook reel"
        onPlaying={() => setPlaying(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          playing || !isBundledReel ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Readability: darker behind the headline (bottom on phones, left on desktop) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 lg:bg-gradient-to-r lg:from-black/70 lg:via-black/25 lg:to-black/10"
      />
    </>
  );
}
