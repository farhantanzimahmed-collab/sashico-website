"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCheck, Package, MapPin, Clock, Phone } from "lucide-react";
import Button from "@/components/ui/Button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "SCO-XXXXXX";

  return (
    <div className="pt-28 pb-24 min-h-screen bg-white">
      <div className="container-xl max-w-2xl">
        {/* Success header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-brand-black flex items-center justify-center">
              <CheckCheck className="h-10 w-10 text-white" strokeWidth={1.5} />
            </div>
          </div>
          <p className="label-xs text-brand-gray-400 mb-3">Order Confirmed</p>
          <h1 className="display-heading text-[clamp(2.5rem,8vw,5rem)] text-brand-black leading-none mb-4">
            THANK YOU!
          </h1>
          <p className="text-sm font-sans text-brand-gray-600 leading-relaxed max-w-md mx-auto">
            Your order has been successfully placed. We&apos;ll start processing it right away and keep you updated.
          </p>
        </div>

        {/* Order number */}
        <div className="bg-brand-gray-50 border border-brand-gray-100 p-6 text-center mb-6">
          <p className="label-xs text-brand-gray-400 mb-2">Your Order Number</p>
          <p className="display-heading text-[2rem] text-brand-black tracking-widest">
            {orderNumber}
          </p>
          <p className="text-xs font-sans text-brand-gray-400 mt-2">
            Save this number to track your order
          </p>
        </div>

        {/* What happens next */}
        <div className="border border-brand-gray-100 p-6 mb-8">
          <h2 className="label-xs text-brand-black mb-5">What happens next?</h2>
          <div className="space-y-4">
            {[
              {
                icon: CheckCheck,
                title: "Order Received",
                desc: "We've received your order and are reviewing it.",
                done: true,
              },
              {
                icon: Package,
                title: "Processing & Packing",
                desc: "Your items will be carefully packed within 1–2 business days.",
                done: false,
              },
              {
                icon: MapPin,
                title: "Out for Delivery",
                desc: "Your order will be shipped via courier to your address.",
                done: false,
              },
              {
                icon: Clock,
                title: "Delivered",
                desc: "Estimated delivery: 3–7 business days within Bangladesh.",
                done: false,
              },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className={`h-8 w-8 flex items-center justify-center flex-shrink-0 ${step.done ? "bg-brand-black" : "bg-brand-gray-100"}`}>
                  <step.icon className={`h-4 w-4 ${step.done ? "text-white" : "text-brand-gray-400"}`} />
                </div>
                <div>
                  <p className={`text-sm font-sans font-medium ${step.done ? "text-brand-black" : "text-brand-gray-500"}`}>
                    {step.title}
                  </p>
                  <p className="text-xs font-sans text-brand-gray-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COD reminder */}
        <div className="bg-brand-black text-white p-5 mb-8 flex items-start gap-4">
          <Phone className="h-5 w-5 text-brand-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-sans font-semibold mb-1">Cash on Delivery</p>
            <p className="text-xs font-sans text-brand-gray-400 leading-relaxed">
              Payment is collected when your order arrives at your door. Please have the exact amount ready for the delivery person.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/shop" className="flex-1">
            <Button fullWidth size="lg">Continue Shopping</Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button fullWidth variant="outline" size="lg">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="pt-28 pb-24 min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-brand-black border-t-transparent rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
