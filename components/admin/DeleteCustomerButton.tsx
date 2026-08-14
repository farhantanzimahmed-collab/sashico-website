"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeleteCustomerButton({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    const res = await fetch("/api/admin/customers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: customerId }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      alert("Failed to delete customer.");
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-2xs uppercase tracking-wider font-sans text-red-600 hover:text-red-800 font-semibold transition-colors"
        >
          {loading ? "Deleting…" : "Confirm"}
        </button>
        <span className="text-brand-gray-300">|</span>
        <button
          onClick={() => setConfirming(false)}
          className="text-2xs uppercase tracking-wider font-sans text-brand-gray-400 hover:text-brand-black transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Delete ${customerName}`}
      className="text-brand-gray-300 hover:text-red-500 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
