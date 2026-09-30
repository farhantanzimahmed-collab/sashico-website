import { formatPrice } from "@/lib/utils";

// Must match checkout's SHIPPING_THRESHOLD (free delivery at ৳2,000 and above)
export const FREE_SHIPPING_THRESHOLD = 2000;

/** "Add ৳350 more for free delivery" bar — nudges order value past the threshold. */
export default function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  return (
    <div className="bg-brand-cream p-4" role="status">
      <p className="text-xs font-sans text-brand-gray-700">
        {remaining > 0 ? (
          <>Add <strong>{formatPrice(remaining)}</strong> more for <strong>free delivery</strong></>
        ) : (
          <>🎉 You&apos;ve unlocked <strong>free delivery</strong></>
        )}
      </p>
      <div className="mt-2 h-1 bg-brand-gray-200" aria-hidden>
        <div className="h-full bg-brand-black transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
