"use client";

import { useEffect, useRef } from "react";

export default function LivingWeave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SPACING = 9;
    const AMP = 3.2;
    const FREQ = 0.038;
    const SPEED = 0.016;
    let t = 0;
    let raf: number;

    function isDark() {
      return (
        document.documentElement.getAttribute("data-theme") === "dark" ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches &&
          document.documentElement.getAttribute("data-theme") !== "light")
      );
    }

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += SPEED;

      const dark = isDark();

      // Horizontal warp threads
      ctx.strokeStyle = dark
        ? "rgba(220,200,160,0.055)"
        : "rgba(40,30,10,0.048)";
      ctx.lineWidth = 0.6;

      for (let y = 0; y < H + SPACING; y += SPACING) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 2) {
          const wave =
            Math.sin(x * FREQ + t + y * 0.075) * AMP +
            Math.sin(x * FREQ * 1.65 + t * 1.25) * AMP * 0.38;
          const py = y + wave;
          x === 0 ? ctx.moveTo(x, py) : ctx.lineTo(x, py);
        }
        ctx.stroke();
      }

      // Vertical weft threads
      ctx.strokeStyle = dark
        ? "rgba(220,200,160,0.028)"
        : "rgba(40,30,10,0.024)";

      for (let x = 0; x < W + SPACING; x += SPACING) {
        ctx.beginPath();
        for (let y = 0; y <= H; y += 2) {
          const wave =
            Math.sin(y * FREQ + t * 0.75 + x * 0.055) * AMP * 0.55;
          const px = x + wave;
          y === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
        }
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    }

    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  );
}
