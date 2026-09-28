import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

async function requireAdmin() {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;
  const { data } = await createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();
  return data ? user : null;
}

// Called by the admin panel after a product is saved/deleted so the storefront,
// sitemap and Meta feed show the change immediately instead of after the
// 2–15 minute cache windows.
export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidateTag("catalog", "max");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
