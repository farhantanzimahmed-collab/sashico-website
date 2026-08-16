import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // Serve AVIF first (best compression), fallback to WebP
    formats: ["image/avif", "image/webp"],
    // 30-day cache on Next.js optimized images (was 24h)
    minimumCacheTTL: 2592000,
    // Mobile-first breakpoints: include 390/430 for modern phones
    deviceSizes: [390, 430, 640, 828, 1080, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    dangerouslyAllowSVG: false,
  },

  compress: true,
  poweredByHeader: false,

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  // Long-term browser caching for static public assets.
  // Vercel defaults to max-age=0 for /public — override to 1 year.
  // Safe because filenames are stable (logo.png, promo-70-off.png etc.)
  async headers() {
    return [
      // Static image files — 1-year immutable browser cache.
      // Vercel defaults to max-age=0 for /public; these overrides fix that.
      { source: "/:file*.png",  headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:file*.jpg",  headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:file*.jpeg", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:file*.gif",  headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:file*.svg",  headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:file*.ico",  headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:file*.webp", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:file*.avif", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:file*.mp4",  headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:file*.woff2",headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      {
        // Next.js static chunks — already content-hashed, 1-year cache
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Security + performance headers on all HTML responses
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options",        value: "SAMEORIGIN" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
