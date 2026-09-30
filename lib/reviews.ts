import { createHmac, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review } from "@/lib/types";

// Public fields only — never select customer_email into pages
const BASE_COLS = "id,product_id,customer_name,rating,comment,is_approved,created_at";
const PHOTO_COLS = `${BASE_COLS},images,verified`;

/** Approved reviews, with photos when the photo columns exist (falls back before the migration). */
export async function fetchApprovedReviews(db: SupabaseClient, opts: { productId?: string; limit?: number } = {}): Promise<Review[]> {
  const run = (cols: string) => {
    let q = db.from("reviews").select(cols).eq("is_approved", true).order("created_at", { ascending: false });
    if (opts.productId) q = q.eq("product_id", opts.productId);
    if (opts.limit) q = q.limit(opts.limit);
    return q;
  };
  let { data, error } = await run(PHOTO_COLS);
  if (error) ({ data, error } = await run(BASE_COLS));
  return ((data as unknown) as Review[]) || [];
}

// ── Review links: /review/<orderId>.<signature> — unguessable, no login needed ──
function secret(): string {
  return process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}
function sign(orderId: string): string {
  return createHmac("sha256", secret()).update(`review:${orderId}`).digest("hex").slice(0, 24);
}
export function reviewToken(orderId: string): string {
  return `${orderId}.${sign(orderId)}`;
}
export function reviewUrl(orderId: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL || "https://sashico.net"}/review/${reviewToken(orderId)}`;
}
/** Returns the order id if the token is genuine, else null. */
export function verifyReviewToken(token: string): string | null {
  const [orderId, sig] = decodeURIComponent(token).split(".");
  if (!orderId || !sig || !/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const expected = sign(orderId);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? orderId : null;
}
