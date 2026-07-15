import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import { Product } from "@/lib/types";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) notFound();

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
          Edit Product
        </h1>
        <p className="text-sm text-brand-gray-500 font-sans mt-1">
          {product.name}
        </p>
      </div>
      <ProductForm product={product as Product} mode="edit" />
    </div>
  );
}
