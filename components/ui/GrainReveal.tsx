"use client";

import { useEffect, useRef, useState } from "react";

interface GrainRevealProps {
  children: React.ReactNode;
  delay?: number; // ms delay before starting
}

export default function GrainReveal({ children, delay = 0 }: GrainRevealProps) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);
  const [phase, setPhase] = useState<"wait" | "animating" | "done">("wait");

  // Observe when section enters viewport
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect();
          setTimeout(() => setPhase("animating"), delay);
        }
      },
      { threshold: 0.06 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  // Run grain canvas animation
  useEffect(() => {
    if (phase !== "animating") return;
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const W = wrap.offsetWidth;
    const H = wrap.offsetHeight;

    // Render at 1/6 resolution, scale up with pixelated rendering for perf
    const SCALE = 1 / 6;
    const cw = Math.ceil(W * SCALE);
    const ch = Math.ceil(H * SCALE);
    canvas.width  = cw;
    canvas.height = ch;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    (canvas.style as any).imageRendering = "pixelated";

    const ctx = canvas.getContext("2d")!;

    // Match the site background (white default, dark if data-theme=dark)
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark" ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches &&
        document.documentElement.getAttribute("data-theme") !== "light");
    const [r, g, b] = isDark ? [12, 11, 10] : [255, 255, 255];

    let frame = 0;
    const TOTAL = 55;

    function draw() {
      frame++;
      const progress = frame / TOTAL;
      const img = ctx.createImageData(cw, ch);
      const d   = img.data;

      for (let i = 0; i < d.length; i += 4) {
        d[i]     = r;
        d[i + 1] = g;
        d[i + 2] = b;
        // Pixel "clears" probabilistically as progress increases
        const cleared = Math.random() < progress * 1.4;
        d[i + 3] = cleared ? 0 : Math.max(0, Math.floor(255 * (1 - progress * 1.1)));
      }

      ctx.putImageData(img, 0, 0);

      if (frame < TOTAL) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        setPhase("done");
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {children}
      {phase !== "done" && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
