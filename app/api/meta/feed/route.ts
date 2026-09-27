import { createClient } from "@supabase/supabase-js";
import { getImageUrl } from "@/lib/utils";
import type { Product } from "@/lib/types";

/**
 * Meta Commerce Manager product feed (RSS 2.0 + g: namespace).
 * Commerce Manager → Catalog → Data sources → Scheduled feed → this URL (hourly).
 *
 * `g:id` MUST equal the content_ids sent by the Pixel/CAPI (product.id) —
 * that match is what lets catalog ads retarget the exact products people viewed.
 */

// Regenerate at most every 15 min — Meta fetches hourly, admin edits show up on the next fetch
export const revalidate = 900;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sashico.net";
const BRAND = "Sashico";

// Google product taxonomy (Meta accepts it) — improves delivery/relevance
const GOOGLE_CATEGORY: Record<string, string> = {
  "t-shirts": "Apparel & Accessories > Clothing > Shirts & Tops",
  shirts: "Apparel & Accessories > Clothing > Shirts & Tops",
  sweatshirts: "Apparel & Accessories > Clothing > Shirts & Tops",
  hoodies: "Apparel & Accessories > Clothing > Shirts & Tops",
  jackets: "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets",
  bags: "Apparel & Accessories > Handbags, Wallets & Cases > Handbags",
  accessories: "Apparel & Accessories > Clothing Accessories",
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function categoryLabel(category: string): string {
  return category.replace(/-/g, " ");
}

function totalStock(p: Product): number {
  return p.sizes?.length
    ? p.sizes.reduce((sum, s) => sum + (Number(s.stock) || 0), 0)
    : Number(p.stock_quantity) || 0;
}

// Meta rejects items without a description — fall back to a factual one
function description(p: Product): string {
  const own = stripHtml(p.description || "");
  if (own) return own.slice(0, 9999);
  const sizes = p.sizes?.filter((s) => s.stock > 0).map((s) => s.size) ?? [];
  return (
    `${p.name} — premium embroidery ${categoryLabel(p.category)} by ${BRAND}, crafted in Bangladesh.` +
    (sizes.length ? ` Available sizes: ${sizes.join(", ")}.` : "") +
    " Cash on delivery all over Bangladesh."
  );
}

function discountLabel(p: Product): string {
  if (!p.discount_price || p.discount_price >= p.price) return "full price";
  const pct = Math.round((1 - p.discount_price / p.price) * 100);
  if (pct >= 60) return "60%+ off";
  if (pct >= 40) return "40-59% off";
  return "under 40% off";
}

function item(p: Product): string {
  const [main, ...extra] = p.images.map(getImageUrl);
  const stock = totalStock(p);
  const onSale = p.discount_price != null && p.discount_price < p.price;
  const tags = [
    p.is_new_arrival && "new arrival",
    p.is_best_seller && "best seller",
    p.is_featured && "featured",
  ].filter(Boolean).join(", ");

  const fields: [string, string | number | undefined][] = [
    ["g:id", p.id],
    ["g:title", p.name.slice(0, 200)],
    ["g:description", description(p)],
    ["g:link", `${SITE_URL}/shop/${p.slug}`],
    ["g:image_link", main],
    ["g:availability", stock > 0 ? "in stock" : "out of stock"],
    ["g:inventory", stock],
    ["g:condition", "new"],
    ["g:price", `${p.price.toFixed(2)} BDT`],
    ["g:sale_price", onSale ? `${p.discount_price!.toFixed(2)} BDT` : undefined],
    ["g:brand", BRAND],
    ["g:google_product_category", GOOGLE_CATEGORY[p.category]],
    ["g:product_type", categoryLabel(p.category)],
    ["g:age_group", "adult"],
    ["g:gender", "unisex"],
    // Custom labels → product sets in Commerce Manager (e.g. "t-shirts", "60%+ off")
    ["g:custom_label_0", p.category],
    ["g:custom_label_1", discountLabel(p)],
    ["g:custom_label_2", tags || undefined],
  ];

  const lines = fields
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `      <${k}>${esc(String(v))}</${k}>`);
  // Up to 10 extra angles — catalog ads can rotate them in carousels
  for (const url of extra.slice(0, 10)) {
    lines.push(`      <g:additional_image_link>${esc(url)}</g:additional_image_link>`);
  }
  return `    <item>\n${lines.join("\n")}\n    </item>`;
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    // 5xx makes Meta keep the last good feed instead of wiping the catalog
    return new Response("Feed temporarily unavailable", { status: 503 });
  }

  // Items without an image are rejected by Meta — leave them out
  const products = ((data ?? []) as Product[]).filter((p) => p.images?.length > 0);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${BRAND} Product Catalog</title>
    <link>${SITE_URL}</link>
    <description>${BRAND} — premium embroidery streetwear from Bangladesh</description>
${products.map(item).join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
}
