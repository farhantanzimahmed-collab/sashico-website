import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: buckets, error: listErr } = await admin.storage.listBuckets();
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

    const bucket = buckets?.find((b) => b.name === "products");

    if (!bucket) {
      const { error: ce } = await admin.storage.createBucket("products", { public: true });
      if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "created", public: true });
    }

    if (!bucket.public) {
      const { error: ue } = await admin.storage.updateBucket("products", { public: true });
      if (ue) return NextResponse.json({ error: ue.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "made_public", was_public: false });
    }

    return NextResponse.json({ ok: true, action: "already_public", public: bucket.public });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
