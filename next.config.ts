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
    // Serve AVIF first (best compression), fallback to WebP — large gains on mobile
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,          // 24h cache instead of 1h
    // Mobile-first breakpoints: include 390/430 for modern phones
    deviceSizes: [390, 430, 640, 828, 1080, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    // Limit concurrent image optimisations to reduce cold-start latency
    dangerouslyAllowSVG: false,
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
