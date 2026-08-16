"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";
import { Product, Category, ProductColor } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { slugify, AVAILABLE_SIZES } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  discount_price: z.coerce.number().optional().nullable(),
  category: z.string().min(1, "Category is required"),
  stock_quantity: z.coerce.number().min(0),
  is_featured: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  is_best_seller: z.boolean().default(false),
  is_active: z.boolean().default(true),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ProductFormProps {
  product?: Product;
  mode: "create" | "edit";
}

export default function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [images, setImages] = useState<string[]>(product?.images || []);
  const [sizes, setSizes] = useState<{ size: string; stock: number }[]>(product?.sizes || []);
  const [colors, setColors] = useState<ProductColor[]>(product?.colors || []);
  const [stitchCount, setStitchCount] = useState<string>(product?.stitch_count?.toString() || "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [newColor, setNewColor] = useState({ name: "", hex: "#000000" });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name || "",
      slug: product?.slug || "",
      description: product?.description || "",
      price: product?.price || 0,
      discount_price: product?.discount_price || null,
      category: product?.category || "",
      stock_quantity: product?.stock_quantity || 0,
      is_featured: product?.is_featured || false,
      is_new_arrival: product?.is_new_arrival || false,
      is_best_seller: product?.is_best_seller || false,
      is_active: product?.is_active ?? true,
      meta_title: product?.meta_title || "",
      meta_description: product?.meta_description || "",
    },
  });

  useEffect(() => {
    supabase.from("categories").select("*").eq("is_active", true).order("display_order").then(({ data }) => {
      if (data) setCategories(data as Category[]);
    });
  }, []);

  const nameValue = watch("name");

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    register("name").onChange(e);
    if (mode === "create") {
      setValue("slug", slugify(val));
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    // Sort files by filename numerically so 1.png → 2.jpeg → 10.png
    // regardless of what order the OS/browser returns them from the file picker.
    const files = Array.from(e.target.files || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
    if (files.length === 0) return;

    setUploading(true);
    const uploaded: string[] = [];

    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "products");

        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Unknown error");
        uploaded.push(json.url);
      } catch (err: any) {
        toast.error(`"${file.name}" failed: ${err.message}`);
      }
    }

    if (uploaded.length > 0) {
      setImages((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length !== 1 ? "s" : ""} uploaded`);
    }

    setUploading(false);
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  }

  function handleDragEnd() {
    setDragIdx(null);
  }

  function toggleSize(size: string) {
    setSizes((prev) => {
      const exists = prev.find((s) => s.size === size);
      if (exists) return prev.filter((s) => s.size !== size);
      return [...prev, { size, stock: 10 }];
    });
  }

  function updateSizeStock(size: string, stock: number) {
    setSizes((prev) =>
      prev.map((s) => (s.size === size ? { ...s, stock } : s))
    );
  }

  function addColor() {
    if (!newColor.name.trim()) return;
    setColors((prev) => [...prev, { name: newColor.name.trim(), hex: newColor.hex }]);
    setNewColor({ name: "", hex: "#000000" });
  }

  function removeColor(i: number) {
    setColors((prev) => prev.filter((_, idx) => idx !== i));
  }

  const hasNewProductCols = product !== undefined ? "colors" in (product as any) : true;

  async function saveWithFallback(payload: any) {
    const op = mode === "create"
      ? () => supabase.from("products").insert(payload)
      : () => supabase.from("products").update(payload).eq("id", product!.id);
    const { error } = await op();
    if (error && (error.message.includes("colors") || error.message.includes("stitch_count") || error.code === "42703")) {
      const { colors: _c, stitch_count: _s, ...safe } = payload;
      const { error: e2 } = mode === "create"
        ? await supabase.from("products").insert(safe)
        : await supabase.from("products").update(safe).eq("id", product!.id);
      if (e2) throw e2;
    } else if (error) {
      throw error;
    }
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const payload: any = {
        ...data,
        images,
        sizes,
        ...(hasNewProductCols ? { colors, stitch_count: stitchCount ? parseInt(stitchCount) : null } : {}),
        discount_price: data.discount_price || null,
        updated_at: new Date().toISOString(),
      };

      await saveWithFallback(payload);
      toast.success(mode === "create" ? "Product created successfully!" : "Product updated successfully!");
      router.push("/admin/products");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
              Product Details
            </h3>
            <Input
              label="Product Name"
              {...register("name", { onChange: handleNameChange })}
              error={errors.name?.message}
              placeholder="e.g. Classic Embroidery T-Shirt"
            />
            <Input
              label="Slug (URL)"
              {...register("slug")}
              error={errors.slug?.message}
              placeholder="classic-embroidery-t-shirt"
              hint="This will be used in the product URL"
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">
                Description
              </label>
              <textarea
                {...register("description")}
                rows={5}
                placeholder="Describe the product in detail..."
                className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans text-brand-black placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none resize-none transition-colors"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
              Pricing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price (৳)"
                type="number"
                step="0.01"
                {...register("price")}
                error={errors.price?.message}
                placeholder="1500"
              />
              <Input
                label="Sale Price (৳)"
                type="number"
                step="0.01"
                {...register("discount_price")}
                error={errors.discount_price?.message}
                placeholder="Optional"
                hint="Leave empty for no discount"
              />
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
              Inventory
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">
                  Category
                </label>
                {categories.length > 0 ? (
                  <select
                    {...register("category")}
                    className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans text-brand-black focus:border-brand-black focus:outline-none appearance-none"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    {...register("category")}
                    error={errors.category?.message}
                    placeholder="T-Shirts"
                  />
                )}
                {errors.category && <p className="mt-1 text-xs text-red-500 font-sans">{errors.category.message}</p>}
              </div>
              <Input
                label="Total Stock"
                type="number"
                {...register("stock_quantity")}
                error={errors.stock_quantity?.message}
                placeholder="0"
              />
            </div>

            {/* Sizes */}
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">
                Sizes & Stock
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {AVAILABLE_SIZES.map((size) => {
                  const selected = sizes.find((s) => s.size === size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-3 py-2 text-xs font-sans font-medium border transition-all duration-150 ${
                        selected
                          ? "bg-brand-black text-white border-brand-black"
                          : "border-brand-gray-200 text-brand-gray-600 hover:border-brand-black"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {sizes.length > 0 && (
                <div className="space-y-2">
                  {sizes.map((s) => (
                    <div key={s.size} className="flex items-center gap-3">
                      <span className="text-xs font-sans font-medium text-brand-gray-700 w-8">
                        {s.size}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={s.stock}
                        onChange={(e) => updateSizeStock(s.size, parseInt(e.target.value) || 0)}
                        className="w-24 border border-brand-gray-200 px-3 py-1.5 text-xs font-sans focus:border-brand-black focus:outline-none"
                      />
                      <span className="text-xs text-brand-gray-400 font-sans">units</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Color Swatches */}
          <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
              Color Swatches
            </h3>
            {colors.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {colors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 border border-brand-gray-200 px-3 py-2">
                    <div className="h-5 w-5 rounded-full border border-brand-gray-200 flex-shrink-0" style={{ background: c.hex }} />
                    <span className="text-sm font-sans text-brand-gray-700">{c.name}</span>
                    <button type="button" onClick={() => removeColor(i)} className="text-brand-gray-300 hover:text-red-500 transition-colors ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Color Name"
                  value={newColor.name}
                  onChange={(e) => setNewColor((c) => ({ ...c, name: e.target.value }))}
                  placeholder="e.g. Midnight Black"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">Hex</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColor.hex}
                    onChange={(e) => setNewColor((c) => ({ ...c, hex: e.target.value }))}
                    className="h-[46px] w-10 border border-brand-gray-200 p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    value={newColor.hex}
                    onChange={(e) => setNewColor((c) => ({ ...c, hex: e.target.value }))}
                    className="w-24 border border-brand-gray-200 bg-white px-3 py-3 text-sm font-sans font-mono focus:border-brand-black focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addColor}
                className="flex items-center gap-1.5 border border-brand-gray-200 px-4 py-3 text-sm font-sans hover:border-brand-black transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" /> Add Color
              </button>
            </div>
          </div>

          {/* Embroidery Stitch Count */}
          <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
              Embroidery Details
            </h3>
            <Input
              label="Stitch Count (optional)"
              type="number"
              value={stitchCount}
              onChange={(e) => setStitchCount(e.target.value)}
              placeholder="e.g. 15000"
              hint="Total number of embroidery stitches in this design"
            />
          </div>

          {/* Images */}
          <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider mb-1">
                Product Images
              </h3>
              <p className="text-xs text-brand-gray-400 font-sans">Upload multiple images at once — hold Ctrl/Cmd to select several files. Drag to reorder. First image = main product photo.</p>
            </div>

            {/* Upload button — prominent, at top */}
            <label className={`flex items-center justify-center gap-3 w-full border-2 border-dashed py-4 cursor-pointer transition-colors ${uploading ? "border-brand-gray-200 bg-brand-gray-50" : "border-brand-gray-300 hover:border-brand-black hover:bg-brand-gray-50"}`}>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImageUpload} disabled={uploading} />
              {uploading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-brand-black border-t-transparent rounded-full flex-shrink-0" />
                  <p className="text-sm font-sans text-brand-gray-500">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-brand-gray-400 flex-shrink-0" />
                  <p className="text-sm font-sans text-brand-gray-600 font-medium">Click to upload images <span className="text-brand-gray-400 font-normal">(select multiple at once)</span></p>
                </>
              )}
            </label>

            {/* Image grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={img + idx}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`relative aspect-[3/4] bg-brand-gray-50 group cursor-grab active:cursor-grabbing border-2 transition-all ${
                      dragIdx === idx ? "border-brand-black opacity-50" : "border-transparent"
                    }`}
                  >
                    <Image
                      src={img.startsWith("http") ? img : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${img}`}
                      alt={`Product image ${idx + 1}`}
                      fill
                      sizes="120px"
                      className="object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-brand-black text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {idx === 0 && (
                      <div className="absolute bottom-0 inset-x-0 bg-brand-black py-1 text-center">
                        <p className="text-2xs text-white font-sans">★ Main</p>
                      </div>
                    )}
                    {idx > 0 && (
                      <div className="absolute top-1.5 left-1.5 bg-black/50 px-1.5 py-0.5">
                        <p className="text-[9px] text-white font-sans">{idx + 1}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-2xs text-brand-gray-400 font-sans">
              Recommended: 800×1067px portrait (3:4 ratio). JPG or PNG. {images.length > 0 && `${images.length} image${images.length !== 1 ? "s" : ""} uploaded.`}
            </p>
          </div>

          {/* SEO */}
          <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
              SEO (Optional)
            </h3>
            <Input
              label="Meta Title"
              {...register("meta_title")}
              placeholder="Leave empty to auto-generate"
            />
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">
                Meta Description
              </label>
              <textarea
                {...register("meta_description")}
                rows={2}
                placeholder="Leave empty to auto-generate"
                className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans text-brand-black placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none resize-none"
                maxLength={160}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
              Status
            </h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("is_active")} className="h-4 w-4 accent-brand-black" />
              <span className="text-sm font-sans text-brand-gray-700">Active (visible in store)</span>
            </label>
          </div>

          {/* Labels */}
          <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
              Labels
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...register("is_featured")} className="h-4 w-4 accent-brand-black" />
                <span className="text-sm font-sans text-brand-gray-700">Featured Product</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...register("is_new_arrival")} className="h-4 w-4 accent-brand-black" />
                <span className="text-sm font-sans text-brand-gray-700">New Arrival</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" {...register("is_best_seller")} className="h-4 w-4 accent-brand-black" />
                <span className="text-sm font-sans text-brand-gray-700">Best Seller</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button type="submit" loading={saving} fullWidth size="lg">
              {mode === "create" ? "Create Product" : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
