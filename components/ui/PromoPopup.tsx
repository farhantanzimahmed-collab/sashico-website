"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

// Show once per session (disappears after closing, comes back on new tab/visit)
const SESSION_KEY = "sashico_promo_seen";

export default function PromoPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return;
    }

    // Open on the visitor's first scroll (or desktop exit-intent), not on a load
    // timer. A timed popup became the page's Largest Contentful Paint and pushed
    // mobile LCP to ~8s; after interaction it can't affect LCP, and the image is
    // pre-fetched during idle time so it still appears instantly.
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      cleanup();
      setVisible(true);
    };
    const onScroll = () => { if (window.scrollY > 150) open(); };
    const onMouseOut = (e: MouseEvent) => { if (!e.relatedTarget && e.clientY <= 0) open(); };
    function cleanup() {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onMouseOut);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onMouseOut);

    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb) : setTimeout(cb, 2500);
    idle(() => {
      const img = new window.Image();
      img.src = "/_next/image?url=%2Fpromo-70-off.png&w=640&q=75";
    });

    return cleanup;
  }, []);

  function close() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      {/* Modal — stop propagation so clicking image doesn't close */}
      <div
        className="relative w-full max-w-[min(92vw,480px)] sm:max-w-[520px] animate-popup"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Skip / close button */}
        <button
          onClick={close}
          aria-label="Close promotion"
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-100 transition-colors"
        >
          <X className="h-4 w-4 text-black" />
        </button>

        {/* Promo image — click goes to shop */}
        <Link href="/shop" onClick={close}>
          <Image
            src="/promo-70-off.png"
            alt="Sashico — Up to 70% off all items"
            width={2160}
            height={2160}
            sizes="(max-width: 560px) 92vw, 520px"
            className="w-full h-auto block cursor-pointer"
          />
        </Link>

        {/* Skip text below image */}
        <button
          onClick={close}
          className="mt-3 w-full text-center text-xs text-white/60 hover:text-white transition-colors tracking-widest uppercase"
        >
          Skip →
        </button>
      </div>

      <style>{`
        @keyframes popup-in {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .animate-popup {
          animation: popup-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </div>
  );
}
