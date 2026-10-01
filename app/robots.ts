import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sashico.net";

  return {
    rules: [
      // Meta's AI/web-indexing crawler (not ads) hit the site in 100+ request bursts
      // and exhausted the hosting plan's 20 concurrent-request limit. Ads crawlers
      // (facebookexternalhit, meta-externalads) stay allowed — ads need them.
      { userAgent: "meta-externalagent", disallow: "/" },
      {
        userAgent: "*",
        allow: ["/", "/api/meta/feed"],
        disallow: ["/admin/", "/api/", "/checkout/success"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
