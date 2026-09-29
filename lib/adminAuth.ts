import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Returns the signed-in user if they're in admin_users, otherwise null. */
export async function requireAdmin() {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;
  const { data } = await serviceClient()
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();
  return data ? user : null;
}
