"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function DeleteProductButton({ productId }: { productId: string }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      toast.error("Failed to delete product");
    } else {
      toast.success("Product deleted");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleDelete}
      className={`transition-colors ${
        confirming
          ? "text-red-600 animate-pulse"
          : "text-brand-gray-400 hover:text-red-500"
      }`}
      title={confirming ? "Click again to confirm delete" : "Delete product"}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
