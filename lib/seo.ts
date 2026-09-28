/**
 * Single source of truth for Sashico's brand/entity signals — titles, descriptions
 * and Schema.org JSON-LD. Keep every page consistent: same name, logo, country,
 * description and social profiles, so search engines resolve "Sashico" to one brand.
 */
import type { Product, SiteSettings } from "@/lib/types";
import { getImageUrl } from "@/lib/utils";

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://sashico.net").replace(/\/$/, "");
export const BRAND = "Sashico";
export const SITE_TITLE = "Sashico — Premium Streetwear in Bangladesh";
export const SITE_DESCRIPTION =
  "Discover Sashico, a Bangladesh-based streetwear brand creating premium T-shirts, hoodies and contemporary urban apparel.";
// Square wordmark (635×635) — Google's logo guideline wants ≥112px, legible on white
export const LOGO_URL = `${SITE_URL}/sashico-logo.jpg`;
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

const ORG_ID = `${SITE_URL}/#organization`;
const BRAND_ID = `${SITE_URL}/#brand`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Only real social profile URLs — admin fields can hold other links by mistake. */
export function socialProfiles(settings?: SiteSettings | null): string[] {
  const candidates = [
    settings?.instagram_url,
    settings?.facebook_url,
    settings?.tiktok_url,
    settings?.youtube_url,
  ];
  return candidates.filter((u): u is string =>
    !!u && /^https:\/\/(www\.)?(instagram|facebook|tiktok|youtube)\.com\//i.test(u)
  );
}

/** Bangladesh local number → +880 international format for schema telephone. */
function intlPhone(phone?: string | null): string | undefined {
  const d = phone?.replace(/\D/g, "");
  if (!d) return undefined;
  if (d.length === 11 && d.startsWith("01")) return `+88${d}`;
  return d.startsWith("880") ? `+${d}` : undefined;
}

/** Site-wide graph: the store (Organization), its Brand, and the WebSite. */
export function siteJsonLd(settings?: SiteSettings | null) {
  const sameAs = socialProfiles(settings);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": ORG_ID,
        name: BRAND,
        alternateName: ["Sashico Bangladesh", "Sashico Clothing"],
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: LOGO_URL, width: 635, height: 635 },
        image: OG_IMAGE,
        description: SITE_DESCRIPTION,
        slogan: "Wear the Culture",
        brand: { "@id": BRAND_ID },
        email: settings?.contact_email || undefined,
        telephone: intlPhone(settings?.contact_phone),
        address: {
          "@type": "PostalAddress",
          addressLocality: "Dhaka",
          addressCountry: "BD",
        },
        areaServed: { "@type": "Country", name: "Bangladesh" },
        knowsAbout: ["Streetwear", "Embroidered clothing", "T-shirts", "Hoodies", "Urban apparel"],
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        "@type": "Brand",
        "@id": BRAND_ID,
        name: BRAND,
        url: SITE_URL,
        logo: LOGO_URL,
        description: "Bangladesh-based premium streetwear and embroidered clothing brand.",
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: BRAND,
        alternateName: ["Sashico Bangladesh", "sashico.net"],
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": ORG_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/shop?search={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function categoryLabel(category: string): string {
  return category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Singular, natural product nouns for generated copy ("an embroidered T-shirt")
const CATEGORY_NOUN: Record<string, string> = {
  "t-shirts": "T-shirt", shirts: "shirt", hoodies: "hoodie", sweatshirts: "sweatshirt",
  jackets: "jacket", bags: "bag", accessories: "accessory",
};

export function productInStock(p: Pick<Product, "sizes" | "stock_quantity">): boolean {
  return p.sizes?.length ? p.sizes.some((s) => Number(s.stock) > 0) : Number(p.stock_quantity) > 0;
}

/** Admin auto-saves meta_title as "Name | Sashico" — strip it so the title template doesn't double the brand. */
export function productTitle(p: Pick<Product, "name" | "meta_title">): string {
  return (p.meta_title || p.name).replace(/\s*[|–—-]\s*Sashico\s*$/i, "").trim() || p.name;
}

/** Real description if written; otherwise a factual one (the admin default "X by Sashico" is too thin). */
export function productDescription(p: Pick<Product, "name" | "description" | "meta_description" | "category" | "price" | "discount_price">): string {
  const stripped = (s?: string | null) => (s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const meta = stripped(p.meta_description);
  const thin = !meta || meta.toLowerCase() === `${p.name} by sashico`.toLowerCase();
  if (!thin) return meta.slice(0, 300);
  const own = stripped(p.description);
  if (own) return own.slice(0, 300);
  const price = p.discount_price ?? p.price;
  const noun = CATEGORY_NOUN[p.category] ?? "streetwear";
  return `${p.name} by Sashico — premium embroidered ${noun} from Bangladesh. ৳${price.toLocaleString("en-US")} with cash on delivery nationwide.`;
}

export function productJsonLd(p: Product, reviewSummary?: { rating: number; count: number }) {
  const url = `${SITE_URL}/shop/${p.slug}`;
  const price = p.discount_price ?? p.price;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    url,
    sku: p.slug.toUpperCase(),
    description: productDescription(p),
    image: p.images.map(getImageUrl),
    category: categoryLabel(p.category),
    brand: { "@type": "Brand", "@id": BRAND_ID, name: BRAND },
    ...(p.sizes?.length ? { size: p.sizes.map((s) => s.size) } : {}),
    offers: {
      "@type": "Offer",
      url,
      price: price.toFixed(2),
      priceCurrency: "BDT",
      availability: productInStock(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": ORG_ID },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "BD",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 3,
        returnMethod: "https://schema.org/ReturnByMail",
      },
    },
    ...(reviewSummary && reviewSummary.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.rating.toFixed(1),
            reviewCount: reviewSummary.count,
          },
        }
      : {}),
  };
}

/** Safe JSON-LD serialisation (escapes "<" so content can't close the script tag). */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
