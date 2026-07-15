import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/Sidebar";

async function checkAdminAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return adminUser ? user : null;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page doesn't need auth check
  const user = await checkAdminAuth();

  return (
    <div className="flex min-h-screen bg-brand-gray-50">
      {user && <AdminSidebar />}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
