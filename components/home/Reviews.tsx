import Image from "next/image";
import { Star } from "lucide-react";
import { Review } from "@/lib/types";

interface ReviewsProps {
  reviews: Review[];
}

function Stars({ rating, dark = false }: { rating: number; dark?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {Array(5).fill(0).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating
            ? dark ? "fill-white text-white" : "fill-black text-black"
            : dark ? "text-white/20" : "text-brand-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function Reviews({ reviews }: ReviewsProps) {
  // Real, approved reviews only — the section stays hidden until the first one is approved
  const display = reviews.filter((r) => r.comment || r.images?.length);
  if (display.length === 0) return null;
  const avg = display.reduce((s, r) => s + (r.rating || 0), 0) / display.length;

  return (
    <section className="py-20 lg:py-28 bg-brand-gray-50">
      <div className="container-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14 pb-8 border-b border-black/10">
          <div>
            <p className="label-xs text-brand-gray-500 mb-3">What they say</p>
            <h2 className="display-heading text-[clamp(2.5rem,6vw,5rem)] text-black leading-none">
              COMMUNITY<br />REVIEWS
            </h2>
          </div>
          <div className="text-right">
            <p className="display-heading text-[4rem] text-black leading-none">{avg.toFixed(1)}</p>
            <Stars rating={Math.round(avg)} />
            <p className="label-xs text-brand-gray-500 mt-2">{display.length} Review{display.length === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {display.slice(0, 4).map((review) => (
            <div
              key={review.id}
              className="bg-white p-6 flex flex-col gap-4 border border-black/8 rounded-lg hover:border-black/20 transition-colors duration-200"
            >
              <Stars rating={review.rating || 5} />
              {!!review.images?.length && (
                <div className="relative aspect-square w-full overflow-hidden rounded">
                  <Image src={review.images[0]} alt={`Photo from ${review.customer_name}`} fill sizes="(max-width: 640px) 90vw, 25vw" className="object-cover" />
                </div>
              )}
              {review.comment && (
                <p className="text-sm text-brand-gray-600 leading-relaxed flex-1 line-clamp-5">
                  &ldquo;{review.comment}&rdquo;
                </p>
              )}
              <div className="pt-4 border-t border-black/8">
                <p className="label-xs text-black">{review.customer_name}</p>
                {review.verified && (
                  <p className="text-[10px] text-brand-gray-500 mt-0.5 uppercase tracking-wider">Verified Buyer</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
