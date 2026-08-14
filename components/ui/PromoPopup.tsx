"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

// Show once per session (disappears after closing, comes back on new tab/visit)
const SESSION_KEY = "sashico_promo_seen";

export default function PromoPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay slightly so page renders first
    const timer = setTimeout(() => {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        setVisible(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    sessionStorage.setItem(SESSION_KEY, "1");
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

        {/* Promo image */}
        <Image
          src="/promo-70-off.png"
          alt="Sashico — Up to 70% off all items"
          width={2160}
          height={2160}
          className="w-full h-auto block"
          priority
        />

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
