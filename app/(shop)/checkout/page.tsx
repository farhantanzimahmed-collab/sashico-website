"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { ShieldCheck, Truck, Banknote } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { useTracking } from "@/hooks/useTracking";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

const schema = z.object({
  full_name:   z.string().min(2, "Full name is required"),
  email:       z.string().email("Valid email required"),
  phone:       z.string().min(11, "Valid phone number required"),
  street:      z.string().min(5, "Street address is required"),
  city:        z.string().min(2, "City is required"),
  district:    z.string().min(2, "District is required"),
  postal_code: z.string().optional(),
  notes:       z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { trackPurchase } = useTracking();
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const total = getTotalPrice();
  const SHIPPING_THRESHOLD = 2000;
  const SHIPPING_COST = 80;
  const finalShipping = total >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const grandTotal = total + finalShipping;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // Wait for Zustand to hydrate cart from localStorage before checking empty
  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true));
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0 && !orderPlaced) router.push("/cart");
  }, [hydrated, items.length, orderPlaced, router]);

  if (!hydrated) return (
    <div className="pt-28 min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-brand-black border-t-transparent rounded-full" />
    </div>
  );

  if (items.length === 0 && !orderPlaced) return null;

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name:    data.full_name,
          customer_email:   data.email,
          customer_phone:   data.phone,
          shipping_address: { street: data.street, city: data.city, district: data.district, postal_code: data.postal_code, country: "Bangladesh" },
          items: items.map((i) => ({
            product_id:    i.product_id,
            product_name:  i.product_name,
            product_slug:  i.product_slug,
            product_image: i.product_image,
            size:          i.size,
            quantity:      i.quantity,
            unit_price:    i.unit_price,
            total_price:   i.total_price,
          })),
          subtotal:        total,
          shipping_cost:   finalShipping,
          discount_amount: 0,
          total_amount:    grandTotal,
          payment_method:  "cod",
          notes:           data.notes || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to place order");
      }

      const { order } = await res.json();
      trackPurchase(order.order_number, grandTotal, items.reduce((s, i) => s + i.quantity, 0));
      setOrderPlaced(true);
      clearCart();
      router.push(`/checkout/success?order=${order.order_number}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-32 pb-20">
      <div className="container-xl max-w-5xl">
        {/* Header */}
        <div className="mb-10 pb-6 border-b border-brand-gray-100">
          <p className="label-xs text-brand-gray-400 mb-2">Almost there</p>
          <h1 className="display-heading text-[clamp(2.5rem,5vw,4rem)] text-brand-black">CHECKOUT</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
          {/* Left — form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact */}
            <div className="space-y-4">
              <h2 className="label-xs text-brand-black border-b border-brand-gray-100 pb-3">Contact Information</h2>
              <Input label="Full Name" {...register("full_name")} error={errors.full_name?.message} placeholder="Your full name" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Email" type="email" {...register("email")} error={errors.email?.message} placeholder="your@email.com" />
                <Input label="Phone" type="tel" {...register("phone")} error={errors.phone?.message} placeholder="01XXXXXXXXX" />
              </div>
            </div>

            {/* Shipping */}
            <div className="space-y-4">
              <h2 className="label-xs text-brand-black border-b border-brand-gray-100 pb-3">Delivery Address</h2>
              <Input label="Street Address" {...register("street")} error={errors.street?.message} placeholder="House/Flat, Road, Area" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" {...register("city")} error={errors.city?.message} placeholder="Dhaka" />
                <Input label="District" {...register("district")} error={errors.district?.message} placeholder="Dhaka" />
              </div>
              <Input label="Postal Code (Optional)" {...register("postal_code")} placeholder="1200" />
            </div>

            {/* Payment — COD only */}
            <div className="space-y-4">
              <h2 className="label-xs text-brand-black border-b border-brand-gray-100 pb-3">Payment Method</h2>
              <div className="flex items-center gap-4 border border-brand-black p-4 bg-brand-gray-50">
                <div className="h-10 w-10 bg-brand-black flex items-center justify-center flex-shrink-0">
                  <Banknote className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-sans font-semibold text-brand-black">Cash on Delivery</p>
                  <p className="text-xs font-sans text-brand-gray-500 mt-0.5">Pay when your order is delivered to your door</p>
                </div>
                <div className="ml-auto">
                  <div className="h-4 w-4 rounded-full border-2 border-brand-black bg-brand-black flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block label-xs text-brand-gray-600">Order Notes (Optional)</label>
              <textarea
                {...register("notes")}
                rows={3}
                placeholder="Any special delivery instructions..."
                className="w-full border border-brand-gray-200 px-4 py-3 text-sm font-sans placeholder:text-brand-gray-300 focus:border-brand-black focus:outline-none resize-none transition-colors"
              />
            </div>

            {/* Trust */}
            <div className="flex gap-8 text-xs text-brand-gray-400 font-sans">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Secure Checkout</div>
              <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> Fast Delivery</div>
            </div>

            <Button type="submit" loading={submitting} fullWidth size="xl">
              Place Order · {formatPrice(grandTotal)}
            </Button>
          </form>

          {/* Right — order summary */}
          <div>
            <div className="border border-brand-gray-100 p-6 sticky top-28">
              <h2 className="label-xs text-brand-black mb-6 pb-4 border-b border-brand-gray-100">Order Summary</h2>

              <div className="space-y-5 mb-6">
                {items.map((item) => (
                  <div key={`${item.product_id}-${item.size}`} className="flex gap-4">
                    <div className="relative w-14 h-[4.5rem] flex-shrink-0 bg-brand-gray-100">
                      <Image src={getImageUrl(item.product_image)} alt={item.product_name} fill sizes="56px" className="object-cover" />
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-brand-black text-white text-[9px] flex items-center justify-center font-sans">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans text-brand-black line-clamp-2 leading-snug">{item.product_name}</p>
                      <p className="label-xs text-brand-gray-400 mt-1">Size: {item.size}</p>
                    </div>
                    <span className="text-sm font-sans font-medium text-brand-black flex-shrink-0">{formatPrice(item.total_price)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm font-sans border-t border-brand-gray-100 pt-4">
                <div className="flex justify-between text-brand-gray-600">
                  <span>Subtotal</span><span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-brand-gray-600">
                  <span>Shipping</span>
                  <span className={finalShipping === 0 ? "text-green-600 font-medium" : ""}>{finalShipping === 0 ? "Free" : formatPrice(finalShipping)}</span>
                </div>
                {finalShipping > 0 && (
                  <p className="text-xs text-brand-gray-400">Add {formatPrice(SHIPPING_THRESHOLD - total)} more for free shipping</p>
                )}
                <div className="flex justify-between font-semibold text-brand-black border-t border-brand-gray-100 pt-3 text-base">
                  <span>Total</span><span>{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-brand-gray-50 border border-brand-gray-100">
                <p className="text-xs text-brand-gray-500 font-sans text-center">
                  Cash on Delivery · Pay at your door
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
