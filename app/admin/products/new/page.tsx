import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <Link
          href="/admin/products"
          className="flex items-center gap-1.5 text-2xs uppercase tracking-widest font-sans text-brand-gray-500 hover:text-brand-black transition-colors mb-4"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Products
        </Link>
        <h1 className="font-sans text-2xl font-bold text-brand-black">
          Add New Product
        </h1>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
