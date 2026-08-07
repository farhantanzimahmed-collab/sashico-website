import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sashico | Premium Embroidery Streetwear";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0f0f0f",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Subtle texture lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.015) 60px, rgba(255,255,255,0.015) 61px)",
            display: "flex",
          }}
        />

        {/* Top border accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #8b0000, #cc2200, #8b0000)",
            display: "flex",
          }}
        />

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "28px",
          }}
        >
          {/* Brand name */}
          <div
            style={{
              fontSize: "96px",
              fontWeight: "700",
              color: "#ffffff",
              letterSpacing: "18px",
              textTransform: "uppercase",
              lineHeight: 1,
              display: "flex",
            }}
          >
            SASHICO
          </div>

          {/* Divider */}
          <div
            style={{
              width: "80px",
              height: "1px",
              background: "rgba(255,255,255,0.3)",
              display: "flex",
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontSize: "22px",
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "6px",
              textTransform: "uppercase",
              fontFamily: "'Arial', sans-serif",
              display: "flex",
            }}
          >
            Premium Embroidery Streetwear
          </div>
        </div>

        {/* Bottom label */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            fontSize: "14px",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "4px",
            fontFamily: "'Arial', sans-serif",
            display: "flex",
          }}
        >
          SASHICO.VERCEL.APP
        </div>

        {/* Bottom border accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #8b0000, #cc2200, #8b0000)",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
