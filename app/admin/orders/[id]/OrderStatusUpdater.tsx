"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

const ORDER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

interface OrderStatusUpdaterProps {
  orderId: string;
  currentStatus: string;
  currentPayment: string;
}

export default function OrderStatusUpdater({
  orderId,
  currentStatus,
  currentPayment,
}: OrderStatusUpdaterProps) {
  const [orderStatus, setOrderStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPayment);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleUpdate() {
    setSaving(true);
    const update: Record<string, string> = {
      order_status: orderStatus,
      payment_status: paymentStatus,
    };
    if (trackingNumber.trim()) update.tracking_number = trackingNumber.trim();

    const { error } = await supabase
      .from("orders")
      .update(update)
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order");
    } else {
      toast.success("Order updated successfully");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">
            Order Status
          </label>
          <select
            value={orderStatus}
            onChange={(e) => setOrderStatus(e.target.value)}
            className="w-full border border-brand-gray-200 bg-white px-3 py-2.5 text-sm font-sans text-brand-black focus:border-brand-black focus:outline-none"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">
            Payment Status
          </label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="w-full border border-brand-gray-200 bg-white px-3 py-2.5 text-sm font-sans text-brand-black focus:border-brand-black focus:outline-none"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">
          Tracking Number (Optional)
        </label>
        <input
          type="text"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number"
          className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans text-brand-black placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none"
        />
      </div>
      <Button onClick={handleUpdate} loading={saving} size="md">
        Update Order
      </Button>
    </div>
  );
}
