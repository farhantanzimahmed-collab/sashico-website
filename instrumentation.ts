export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      const { data: buckets } = await admin.storage.listBuckets();
      const bucket = buckets?.find((b) => b.name === "products");
      if (!bucket) {
        await admin.storage.createBucket("products", { public: true });
        console.log("[init] Created public products bucket");
      } else if (!bucket.public) {
        await admin.storage.updateBucket("products", { public: true });
        console.log("[init] Made products bucket public");
      }
    } catch (e) {
      console.warn("[init] bucket setup skipped:", e);
    }
  }
}
