"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Camera, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Props {
  token: string;
  productId: string;
  productName: string;
  productImage: string;
  defaultName: string;
  alreadyReviewed: boolean;
}

const MAX_PHOTOS = 3;

/** Shrink a phone photo to ≤1600px JPEG before upload (fast on mobile data). */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b || file), "image/jpeg", 0.85));
  } catch {
    return file; // e.g. HEIC on older browsers — the server converts it
  }
}

export default function ReviewForm({ token, productId, productName, productImage, defaultName, alreadyReviewed }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [name, setName] = useState(defaultName);
  const [photos, setPhotos] = useState<{ blob: Blob; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(alreadyReviewed);

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const picked = await Promise.all([...files].slice(0, room).map(downscale));
    setPhotos((prev) => [...prev, ...picked.map((blob) => ({ blob, url: URL.createObjectURL(blob) }))]);
  }

  async function submit() {
    if (!rating) return toast.error("Tap the stars to rate");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("product_id", productId);
      fd.set("rating", String(rating));
      fd.set("comment", comment);
      fd.set("name", name);
      photos.forEach((p, i) => fd.append("photos", p.blob, `photo-${i}.jpg`));
      const res = await fetch("/api/reviews/submit", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send your review");
      setDone(true);
      toast.success("Thank you for your review! 🖤");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-black/8 rounded-lg p-5 sm:p-6">
      <div className="flex gap-4 items-center mb-5">
        <div className="relative h-20 w-16 shrink-0 bg-brand-gray-50 rounded overflow-hidden">
          <Image src={productImage} alt={productName} fill sizes="64px" className="object-cover" />
        </div>
        <p className="text-base text-black">{productName}</p>
      </div>

      {done ? (
        <p className="text-sm text-green-700">✓ Review received — it will appear on the site after a quick check. Thank you!</p>
      ) : (
        <div className="space-y-5">
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} className="p-1">
                <Star className={cn("h-8 w-8 transition-colors", (hover || rating) >= n ? "fill-black text-black" : "text-brand-gray-300")} />
              </button>
            ))}
          </div>

          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
            placeholder="How's the fit, fabric and embroidery?"
            className="w-full border border-brand-gray-200 rounded-lg px-4 py-3 text-sm focus:border-black focus:outline-none" />

          <div>
            <p className="label-xs text-brand-gray-500 mb-2">Add photos (optional, up to {MAX_PHOTOS})</p>
            <div className="flex gap-3 flex-wrap">
              {photos.map((p, i) => (
                <div key={p.url} className="relative h-20 w-20 rounded overflow-hidden border border-black/8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => setPhotos(photos.filter((_, n) => n !== i))}
                    className="absolute top-1 right-1 bg-black text-white rounded-full p-0.5"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="h-20 w-20 rounded border border-dashed border-brand-gray-300 flex flex-col items-center justify-center text-brand-gray-500 cursor-pointer hover:border-black">
                  <Camera className="h-5 w-5" />
                  <span className="text-[10px] mt-1">Add</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Your name (shown with the review)"
            className="w-full border border-brand-gray-200 rounded-lg px-4 py-3 text-sm focus:border-black focus:outline-none" />

          <button type="button" onClick={submit} disabled={busy} className={cn("btn-primary w-full justify-center", busy && "opacity-60")}>
            {busy ? "Sending…" : "Submit review"}
          </button>
        </div>
      )}
    </div>
  );
}
