// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@supabase/supabase-js");
import { buildProductImageMap, downloadFile, DriveFile } from "./driveHelper";
import { readSheetProducts, parseSizes } from "./sheetsHelper";

export interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  imagesUploaded: number;
  skipped: number;
  errors: string[];
  log: string[];
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function getExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  return ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
}

async function uploadImage(
  supabase: ReturnType<typeof createClient>,
  file: DriveFile,
  productCode: string,
  index: number
): Promise<string | null> {
  try {
    const buffer = await downloadFile(file.id);
    const ext = getExtension(file.name);
    const filename = index === 0 ? `cover.${ext}` : `image-${index}.${ext}`;
    const path = `products/${productCode}/${filename}`;

    const { error } = await supabase.storage
      .from("products")
      .upload(path, buffer, {
        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        upsert: true,
      });

    if (error) return null;

    const { data } = supabase.storage.from("products").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export async function runGoogleSync(
  sheetId: string,
  driveFolderId: string,
  onLog?: (msg: string) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    processed: 0, created: 0, updated: 0, imagesUploaded: 0,
    skipped: 0, errors: [], log: [],
  };

  const log = (msg: string) => {
    result.log.push(msg);
    onLog?.(msg);
  };

  const supabase = getAdminSupabase();

  log("📋 Reading Google Sheet...");
  let products;
  try {
    products = await readSheetProducts(sheetId);
  } catch (e: any) {
    result.errors.push(`Sheet read failed: ${e.message}`);
    log(`❌ Sheet read failed: ${e.message}`);
    return result;
  }
  log(`✅ Found ${products.length} products in sheet`);

  log("📁 Scanning Google Drive folder...");
  let imageMap: Map<string, DriveFile[]>;
  try {
    imageMap = await buildProductImageMap(driveFolderId);
  } catch (e: any) {
    result.errors.push(`Drive scan failed: ${e.message}`);
    log(`❌ Drive scan failed: ${e.message}`);
    return result;
  }
  log(`✅ Found images for ${imageMap.size} product codes in Drive`);

  // Load categories from DB
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug");
  type Category = { id: string; name: string; slug: string };
  const catList: Category[] = categories ?? [];
  const categoryMap = new Map<string, Category>(catList.map(c => [c.slug, c]));

  for (const product of products) {
    result.processed++;
    const code = product.product_code;
    log(`\n🔄 [${code}] ${product.name}`);

    try {
      // Upload images
      const driveFiles = imageMap.get(code) ?? [];
      const imageUrls: string[] = [];

      if (driveFiles.length > 0) {
        log(`  📸 Uploading ${driveFiles.length} image(s)...`);
        for (let i = 0; i < driveFiles.length; i++) {
          const url = await uploadImage(supabase, driveFiles[i], code, i);
          if (url) {
            imageUrls.push(url);
            result.imagesUploaded++;
          } else {
            log(`  ⚠️  Image ${i + 1} upload failed`);
          }
        }
      } else {
        log(`  ⚠️  No images found in Drive for ${code}`);
      }

      // Find category
      const catSlug = slugify(product.category);
      const category: Category | undefined = categoryMap.get(catSlug) ??
        catList.find(c =>
          c.name.toLowerCase().includes(product.category.toLowerCase())
        );

      // Parse sizes & compute total stock
      const sizes = parseSizes(product.sizes_raw);
      const totalStock = sizes.reduce((sum, s) => sum + s.stock, 0);

      // Build product record
      const slug = slugify(`${product.name}-${code}`);
      const record = {
        product_code:     code,
        name:             product.name || code,
        slug,
        description:      product.description,
        price:            product.price,
        discount_price:   product.sale_price,
        category:         product.category || "uncategorized",
        category_id:      category?.id ?? null,
        images:           imageUrls,
        sizes:            sizes,
        stock_quantity:   totalStock,
        is_active:        product.is_active,
        is_featured:      product.is_featured,
        is_new_arrival:   product.is_new_arrival,
        is_best_seller:   product.is_best_seller,
        meta_title:       product.meta_title || product.name,
        meta_description: product.meta_description,
        updated_at:       new Date().toISOString(),
      };

      // Check if product exists
      const { data: existing } = await supabase
        .from("products")
        .select("id, images")
        .eq("product_code", code)
        .single();

      if (existing) {
        // Update but keep existing images if no new ones uploaded
        const finalImages = imageUrls.length > 0 ? imageUrls : (existing.images ?? []);
        const { error } = await supabase
          .from("products")
          .update({ ...record, images: finalImages })
          .eq("product_code", code);

        if (error) throw new Error(error.message);
        result.updated++;
        log(`  ✅ Updated`);
      } else {
        const { error } = await supabase.from("products").insert(record);
        if (error) {
          // Slug conflict — make it unique
          if (error.message.includes("slug")) {
            const { error: e2 } = await supabase
              .from("products")
              .insert({ ...record, slug: `${slug}-${Date.now()}` });
            if (e2) throw new Error(e2.message);
          } else {
            throw new Error(error.message);
          }
        }
        result.created++;
        log(`  ✅ Created`);
      }
    } catch (e: any) {
      result.skipped++;
      result.errors.push(`[${code}] ${e.message}`);
      log(`  ❌ Error: ${e.message}`);
    }
  }

  log(`\n✅ Sync complete — ${result.created} created, ${result.updated} updated, ${result.imagesUploaded} images uploaded, ${result.skipped} skipped`);
  return result;
}
