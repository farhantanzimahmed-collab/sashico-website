// Runs before every Vercel build to ensure the storage bucket is public.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log("[storage-init] Env vars missing, skipping.");
  process.exit(0);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

try {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw error;

  const bucket = buckets?.find((b) => b.name === "products");

  if (!bucket) {
    const { error: ce } = await admin.storage.createBucket("products", { public: true });
    if (ce) throw ce;
    console.log("[storage-init] Created public 'products' bucket.");
  } else if (!bucket.public) {
    const { error: ue } = await admin.storage.updateBucket("products", { public: true });
    if (ue) throw ue;
    console.log("[storage-init] Made 'products' bucket public.");
  } else {
    console.log("[storage-init] 'products' bucket already public. OK.");
  }
} catch (err) {
  console.warn("[storage-init] Warning:", err?.message || err);
}
