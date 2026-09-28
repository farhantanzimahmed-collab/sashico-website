// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require("@supabase/supabase-js");
import { buildProductImageMap, downloadFile, DriveFile } from "./driveHelper";
import { readMasterSheet } from "./sheetsHelper";

export interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  imagesUploaded: number;
  skipped: number;
  errors: string[];
  log: string[];
}

/*
 * Ownership rules (so the daily sync never undoes admin-panel work):
 *  - Admin panel owns everything customers see: photos + their order, name,
 *    description, prices, category, flags, active/inactive, SEO fields.
 *  - The master sheet owns inventory: sizes + stock of existing products.
 *  - A product code is created from the sheet only the FIRST time it is ever
 *    seen. Codes already seen are remembered, so a product deleted in admin
 *    is never re-created just because its row is still in the sheet.
 */
const KNOWN_CODES_FILE = "google-sync-known-codes.json";

async function readKnownCodes(supabase: ReturnType<typeof createClient>): Promise<Set<string> | null> {
  const { data, error } = await supabase.storage.from("sashico-config").download(KNOWN_CODES_FILE);
  if (error || !data) return null;
  try {
    const parsed = JSON.parse(await data.text());
    return new Set<string>(Array.isArray(parsed.codes) ? parsed.codes : []);
  } catch {
    return null;
  }
}

async function writeKnownCodes(supabase: ReturnType<typeof createClient>, codes: Set<string>) {
  const blob = new Blob([JSON.stringify({ codes: [...codes].sort(), updated_at: new Date().toISOString() })], {
    type: "application/json",
  });
  await supabase.storage.from("sashico-config").upload(KNOWN_CODES_FILE, blob, {
    contentType: "application/json",
    upsert: true,
  });
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

  log("📋 Reading Sashico master sheet (Inventory + Product Costing)...");
  let products;
  try {
    products = await readMasterSheet(sheetId);
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

  // First run with these rules: treat every code currently in the sheet as already
  // known — rows whose product was deleted in admin must not come back.
  const storedCodes = await readKnownCodes(supabase);
  const knownCodes = storedCodes ?? new Set<string>(products.map((p) => p.product_code));
  if (!storedCodes) log("🧷 First run with admin-owned rules — remembering all current sheet codes");

  for (const product of products) {
    result.processed++;
    const code = product.product_code;
    const slug = slugify(code); // slug = product code (e.g. ss-t-001) — stable unique key
    log(`\n🔄 [${code}] ${product.name}`);

    try {
      const { data: existing } = await supabase
        .from("products")
        .select("id, images, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        // Inventory only — never touch what the admin panel manages
        const update: Record<string, unknown> = {
          sizes: product.sizes,
          stock_quantity: product.total_stock,
          updated_at: new Date().toISOString(),
        };

        // Only fill photos if the product has none at all on the site
        const driveFiles = imageMap.get(code) ?? [];
        if (!(existing.images?.length) && driveFiles.length) {
          const urls: string[] = [];
          for (let i = 0; i < driveFiles.length; i++) {
            const url = await uploadImage(supabase, driveFiles[i], code, i);
            if (url) { urls.push(url); result.imagesUploaded++; }
          }
          if (urls.length) { update.images = urls; log(`  📸 Added ${urls.length} photo(s) (product had none)`); }
        }

        const { error } = await supabase.from("products").update(update).eq("slug", slug);
        if (error) throw new Error(error.message);
        knownCodes.add(code);
        result.updated++;
        log(`  ✅ Stock updated (photos/details left as set in admin)`);
        continue;
      }

      if (knownCodes.has(code)) {
        // Seen before but no longer on the site → deleted in admin. Respect that.
        result.skipped++;
        log(`  ⏭️  Not re-created — product was removed in the admin panel`);
        continue;
      }

      // Brand-new code → create it once, with its Drive photos
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

      const catSlug = slugify(product.category);
      const category: Category | undefined = categoryMap.get(catSlug) ??
        catList.find(c =>
          c.name.toLowerCase().includes(product.category.toLowerCase())
        );

      const record: Record<string, unknown> = {
        name:             product.name || code,
        slug,
        description:      product.description,
        price:            product.price,
        discount_price:   product.sale_price,
        category:         product.category || "uncategorized",
        category_id:      category?.id ?? null,
        images:           imageUrls,
        sizes:            product.sizes,
        stock_quantity:   product.total_stock,
        is_active:        product.is_active,
        is_featured:      product.is_featured,
        is_new_arrival:   product.is_new_arrival,
        is_best_seller:   product.is_best_seller,
        meta_title:       product.meta_title || product.name,
        meta_description: product.meta_description,
        updated_at:       new Date().toISOString(),
        product_code:     code,
      };

      const { error } = await supabase.from("products").insert(record);
      if (error) {
        // If product_code column missing, retry without it
        if (error.message.includes("product_code")) {
          const r2 = { ...record }; delete r2.product_code;
          const { error: e2 } = await supabase.from("products").insert(r2);
          if (e2) throw new Error(e2.message);
        } else {
          throw new Error(error.message);
        }
      }
      knownCodes.add(code);
      result.created++;
      log(`  ✅ Created (new product code)`);
    } catch (e: any) {
      result.skipped++;
      result.errors.push(`[${code}] ${e.message}`);
      log(`  ❌ Error: ${e.message}`);
    }
  }

  await writeKnownCodes(supabase, knownCodes);

  log(`\n✅ Sync complete — ${result.created} created, ${result.updated} stock-updated, ${result.imagesUploaded} images uploaded, ${result.skipped} skipped`);
  return result;
}
