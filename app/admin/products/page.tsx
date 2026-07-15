import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Product } from "@/lib/types";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { Plus, Edit, Package } from "lucide-react";
import DeleteProductButton from "./DeleteProductButton";

export const revalidate = 0;

async function getProducts() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return (data as Product[]) || [];
}

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-sans text-2xl font-bold text-brand-black">Products</h1>
          <p className="text-sm text-brand-gray-500 font-sans mt-1">
            {products.length} total products
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-brand-black text-brand-white px-5 py-3 text-2xs uppercase tracking-widest font-sans font-medium hover:bg-brand-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white border border-brand-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-gray-100 bg-brand-gray-50">
                {["Product", "Category", "Price", "Stock", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-2xs uppercase tracking-wider text-brand-gray-400 font-sans font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Package className="h-10 w-10 text-brand-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-brand-gray-400 font-sans">
                      No products yet. Add your first product.
                    </p>
                    <Link
                      href="/admin/products/new"
                      className="mt-4 inline-block text-2xs uppercase tracking-widest font-sans text-brand-black underline underline-offset-4"
                    >
                      Add Product
                    </Link>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-brand-gray-50 hover:bg-brand-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-12 flex-shrink-0 bg-brand-gray-100">
                          {product.images[0] && (
                            <Image
                              src={getImageUrl(product.images[0])}
                              alt={product.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-sans font-medium text-brand-black line-clamp-1">
                            {product.name}
                          </p>
                          <p className="text-2xs text-brand-gray-400 font-sans">
                            {product.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-sans text-brand-gray-600">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 text-sm font-sans font-medium text-brand-black">
                      {product.discount_price ? (
                        <div>
                          <span className="text-brand-black">{formatPrice(product.discount_price)}</span>
                          <span className="text-brand-gray-400 line-through ml-2 text-xs">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-sans">
                      <span
                        className={
                          product.stock_quantity === 0
                            ? "text-red-600"
                            : product.stock_quantity <= 5
                            ? "text-orange-600"
                            : "text-brand-gray-700"
                        }
                      >
                        {product.stock_quantity} units
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-2xs font-sans px-2 py-1 uppercase tracking-wider ${
                          product.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-brand-gray-100 text-brand-gray-600"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 justify-end">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="text-brand-gray-400 hover:text-brand-black transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <DeleteProductButton productId={product.id} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
