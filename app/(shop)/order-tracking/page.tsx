"use client";

import { useState } from "react";
import { Search, Package, Truck, CheckCircle, Clock, XCircle, Phone, Hash } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const STATUS_STEPS = [
  { key: "pending",    label: "Order Placed",  icon: Clock },
  { key: "confirmed",  label: "Confirmed",      icon: CheckCircle },
  { key: "processing", label: "Processing",     icon: Package },
  { key: "shipped",    label: "Shipped",        icon: Truck },
  { key: "delivered",  label: "Delivered",      icon: CheckCircle },
];

const STATUS_ORDER = ["pending", "confirmed", "processing", "shipped", "delivered"];

function getStepIndex(status: string) {
  return STATUS_ORDER.indexOf(status);
}

export default function OrderTrackingPage() {
  const [searchBy, setSearchBy] = useState<"order" | "phone">("order");
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const value = searchBy === "order" ? orderNumber.trim() : phone.trim();
    if (!value) return;
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const params = new URLSearchParams();
      if (searchBy === "order") params.set("order", value);
      else params.set("phone", value);

      const res = await fetch(`/api/tracking?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Order not found");
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const currentStep = order ? getStepIndex(order.order_status) : -1;
  const isCancelled = order?.order_status === "cancelled";

  return (
    <div className="pt-32 pb-20">
      <div className="container-xl max-w-2xl">
        <div className="mb-12">
          <p className="label-xs text-brand-gray-400 mb-2">Customer Service</p>
          <h1 className="display-heading text-[clamp(2.5rem,5vw,4rem)] text-brand-black leading-none">
            TRACK ORDER
          </h1>
          <p className="mt-4 text-sm font-sans text-brand-gray-500">
            Enter your order number to see real-time delivery status.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4 mb-10">
          {/* Search mode toggle */}
          <div className="flex border border-brand-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => { setSearchBy("order"); setError(""); setOrder(null); }}
              className={`flex-1 py-3 text-xs font-sans font-medium transition-colors ${
                searchBy === "order"
                  ? "bg-brand-black text-white"
                  : "bg-white text-brand-gray-500 hover:text-brand-black"
              }`}
            >
              Order Number
            </button>
            <button
              type="button"
              onClick={() => { setSearchBy("phone"); setError(""); setOrder(null); }}
              className={`flex-1 py-3 text-xs font-sans font-medium transition-colors border-l border-brand-gray-200 ${
                searchBy === "phone"
                  ? "bg-brand-black text-white"
                  : "bg-white text-brand-gray-500 hover:text-brand-black"
              }`}
            >
              Phone Number
            </button>
          </div>

          {searchBy === "order" ? (
            <Input
              label="Order Number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. SCO-001017"
              autoFocus
            />
          ) : (
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01XXXXXXXXX"
              autoFocus
            />
          )}

          <Button type="submit" loading={loading} size="lg" fullWidth>
            <Search className="h-4 w-4" />
            Track Order
          </Button>
        </form>

        {error && (
          <div className="flex items-center gap-3 border border-red-200 bg-red-50 px-4 py-3 mb-8">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm font-sans text-red-700">{error}</p>
          </div>
        )}

        {order && (
          <div className="space-y-8">
            {/* Order header */}
            <div className="border border-brand-gray-100 p-6">
              <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                <div>
                  <p className="label-xs text-brand-gray-400 mb-1">Order Number</p>
                  <p className="text-lg font-sans font-semibold text-brand-black">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="label-xs text-brand-gray-400 mb-1">Total</p>
                  <p className="text-lg font-sans font-semibold text-brand-black">{formatPrice(order.total_amount)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm font-sans text-brand-gray-500">
                <span>Customer: <strong className="text-brand-black">{order.customer_name}</strong></span>
                <span>Payment: <strong className="text-brand-black uppercase">{order.payment_method}</strong></span>
              </div>
              {order.customer_phone && (
                <p className="mt-2 text-sm font-sans text-brand-gray-500">
                  Phone: <strong className="text-brand-black">{order.customer_phone}</strong>
                </p>
              )}
              {order.tracking_number && (
                <p className="mt-2 text-sm font-sans text-brand-gray-500">
                  Tracking #: <strong className="text-brand-black">{order.tracking_number}</strong>
                </p>
              )}
            </div>

            {/* Status tracker */}
            {isCancelled ? (
              <div className="flex items-center gap-3 border border-red-200 bg-red-50 px-5 py-4">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-sans font-semibold text-red-700">Order Cancelled</p>
                  <p className="text-xs font-sans text-red-500 mt-0.5">This order has been cancelled. Contact support for assistance.</p>
                </div>
              </div>
            ) : (
              <div className="border border-brand-gray-100 p-6">
                <p className="label-xs text-brand-black mb-6">Delivery Status</p>
                <div className="relative">
                  <div className="absolute top-5 left-5 right-5 h-px bg-brand-gray-100" />
                  <div
                    className="absolute top-5 left-5 h-px bg-brand-black transition-all duration-700"
                    style={{ width: currentStep >= 0 ? `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` : "0%" }}
                  />
                  <div className="relative flex justify-between">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= currentStep;
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex flex-col items-center gap-2">
                          <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            done ? "border-brand-black bg-brand-black" : "border-brand-gray-200 bg-white"
                          }`}>
                            <Icon className={`h-4 w-4 ${done ? "text-white" : "text-brand-gray-300"}`} />
                          </div>
                          <p className={`text-2xs font-sans text-center max-w-[60px] leading-tight ${done ? "text-brand-black font-medium" : "text-brand-gray-500"}`}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="border border-brand-gray-100 p-6">
              <p className="label-xs text-brand-black mb-4">Items Ordered</p>
              <div className="space-y-3">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm font-sans">
                    <span className="text-brand-gray-700">{item.product_name} <span className="text-brand-gray-400">× {item.quantity}</span> — Size {item.size}</span>
                    <span className="text-brand-black font-medium">{formatPrice(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping address */}
            <div className="border border-brand-gray-100 p-6">
              <p className="label-xs text-brand-black mb-3">Delivery Address</p>
              <p className="text-sm font-sans text-brand-gray-600 leading-relaxed">
                {order.shipping_address?.street}, {order.shipping_address?.city},{" "}
                {order.shipping_address?.district}
                {order.shipping_address?.postal_code ? `, ${order.shipping_address.postal_code}` : ""}
              </p>
            </div>
          </div>
        )}

        {/* Help text */}
        {!order && !error && (
          <div className="border border-brand-gray-100 p-6 text-center">
            <p className="text-sm font-sans text-brand-gray-500 mb-1">Can&apos;t find your order?</p>
            <p className="text-xs font-sans text-brand-gray-400">
              Check your order confirmation message or{" "}
              <a href="/contact" className="text-brand-black underline underline-offset-2 hover:text-brand-gray-500 transition-colors">
                contact us
              </a>{" "}
              for help.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
