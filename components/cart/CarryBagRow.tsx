import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { CARRY_BAG_IMAGE, CARRY_BAG_THRESHOLD, qualifiesForCarryBag } from "@/lib/carryBag";

/** Shows the free carry bag line (subtotal ≥ ৳600) or how much more is needed. */
export default function CarryBagRow({ subtotal, compact = false }: { subtotal: number; compact?: boolean }) {
  if (subtotal <= 0) return null;
  if (!qualifiesForCarryBag(subtotal)) {
    return (
      <p className="text-xs font-sans text-brand-gray-600 bg-brand-cream px-4 py-3">
        Add <strong>{formatPrice(CARRY_BAG_THRESHOLD - subtotal)}</strong> more to get a <strong>FREE Carry Bag</strong> 🎁
      </p>
    );
  }
  return (
    <div className={`flex gap-4 items-center ${compact ? "" : "py-2"}`}>
      <div className="relative h-16 w-14 shrink-0 bg-brand-gray-50 overflow-hidden">
        <Image src={CARRY_BAG_IMAGE} alt="Free carry bag" fill sizes="56px" className="object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-black">FREE Carry Bag 🎁</p>
        <p className="text-xs text-brand-gray-500">Gift with orders of ৳{CARRY_BAG_THRESHOLD}+ · added automatically</p>
      </div>
      <p className="text-sm font-medium text-green-700 whitespace-nowrap">
        FREE <span className="text-xs text-brand-gray-500 line-through ml-1">{formatPrice(100)}</span>
      </p>
    </div>
  );
}
