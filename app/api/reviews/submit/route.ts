import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { serviceClient } from "@/lib/adminAuth";
import { verifyReviewToken } from "@/lib/reviews";
import { notifyNewReview } from "@/lib/telegram/notificationService";

const MAX_PHOTOS = 3;
const MAX_BYTES = 12 * 1024 * 1024;

// POST multipart: token, product_id, rating, comment, name, photos[] (≤3)
export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const orderId = verifyReviewToken(String(fd.get("token") || ""));
    if (!orderId) return NextResponse.json({ error: "This review link isn't valid" }, { status: 403 });

    const productId = String(fd.get("product_id") || "");
    const rating = Math.round(Number(fd.get("rating")));
    const comment = String(fd.get("comment") || "").trim().slice(0, 1000) || null;
    if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "Please choose 1–5 stars" }, { status: 400 });

    const db = serviceClient();
    const { data: order } = await db.from("orders").select("id, order_status, customer_name, customer_email, items").eq("id", orderId).single();
    if (!order || order.order_status !== "delivered") {
      return NextResponse.json({ error: "Reviews open once your order is delivered" }, { status: 400 });
    }
    const inOrder = (order.items as { product_id: string }[]).some((i) => i.product_id === productId);
    if (!inOrder) return NextResponse.json({ error: "This item isn't in your order" }, { status: 400 });

    const { data: dup, error: dupErr } = await db.from("reviews").select("id").eq("order_id", orderId).eq("product_id", productId).maybeSingle();
    if (dupErr) return NextResponse.json({ error: "Reviews with photos are being switched on — please try again later" }, { status: 503 });
    if (dup) return NextResponse.json({ error: "You've already reviewed this item — thank you!" }, { status: 409 });

    // Photos → web-friendly WebP (≤1200px), stored in the public products bucket
    const images: string[] = [];
    const files = fd.getAll("photos").filter((f): f is File => f instanceof File).slice(0, MAX_PHOTOS);
    for (const file of files) {
      if (file.size > MAX_BYTES || !file.type.startsWith("image/")) continue;
      try {
        const webp = await sharp(Buffer.from(await file.arrayBuffer()))
          .rotate() // respect phone orientation
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        const path = `reviews/${orderId}/${randomUUID()}.webp`;
        const { error } = await db.storage.from("products").upload(path, webp, { contentType: "image/webp" });
        if (!error) images.push(db.storage.from("products").getPublicUrl(path).data.publicUrl);
      } catch {
        // unreadable image — skip it, keep the review
      }
    }

    const name = String(fd.get("name") || "").trim().slice(0, 60) || String(order.customer_name || "Customer").split(" ")[0];
    const { error } = await db.from("reviews").insert({
      product_id: productId,
      order_id: orderId,
      customer_name: name,
      customer_email: order.customer_email,
      rating,
      comment,
      images,
      verified: true,
      is_approved: false, // shown after a check in Admin → Reviews
    });
    if (error) throw error;

    const { data: product } = await db.from("products").select("name").eq("id", productId).single();
    notifyNewReview(name, rating, product?.name ?? "Product", comment).catch(() => {});
    return NextResponse.json({ ok: true, photos: images.length });
  } catch (e) {
    console.error("[review:submit]", e);
    return NextResponse.json({ error: "Could not save your review — please try again" }, { status: 500 });
  }
}
