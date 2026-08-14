import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Single delete by ID
  if (body.id) {
    const { error } = await supabase.from("customers").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Bulk delete by date range
  if (body.dateFrom && body.dateTo) {
    const from = new Date(body.dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(body.dateTo);
    to.setHours(23, 59, 59, 999);

    const { error, count } = await supabase
      .from("customers")
      .delete({ count: "exact" })
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString());

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, deleted: count ?? 0 });
  }

  return NextResponse.json({ error: "id or dateFrom+dateTo required" }, { status: 400 });
}
