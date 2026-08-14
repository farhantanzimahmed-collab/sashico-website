import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function requireAuth() {
  const auth = await createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  return user;
}

export async function GET() {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getServiceClient();
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const bucket = buckets?.find((b) => b.name === "products");
  if (!bucket) {
    const { error: ce } = await admin.storage.createBucket("products", { public: true });
    if (ce) return NextResponse.json({ ok: false, error: `bucket create failed: ${ce.message}` }, { status: 500 });
    return NextResponse.json({ ok: true, created: true });
  }
  if (!bucket.public) {
    await admin.storage.updateBucket("products", { public: true });
  }
  return NextResponse.json({ ok: true, bucket: "products", public: bucket.public });
}

async function ensureBucketPublic() {
  const admin = getServiceClient();
  const { data: buckets } = await admin.storage.listBuckets();
  const bucket = buckets?.find((b) => b.name === "products");
  if (!bucket) {
    await admin.storage.createBucket("products", { public: true });
  } else if (!bucket.public) {
    await admin.storage.updateBucket("products", { public: true });
  }
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Ensure bucket is public before every upload
  try { await ensureBucketPublic(); } catch { /* continue */ }

  // Parse file
  let file: File | null = null;
  let folder = "products";
  try {
    const form = await req.formData();
    file = form.get("file") as File | null;
    folder = (form.get("folder") as string | null) || "products";
  } catch (e: any) {
    return NextResponse.json({ error: `form parse error: ${e.message}` }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = getServiceClient();
  const { data, error } = await admin.storage
    .from("products")
    .upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error("[upload] supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${data.path}`;
  return NextResponse.json({ url, path: data.path });
}
