import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminAuth";

// POST { id, status }            — mark one cart contacted / recovered / dismissed / open
// POST { ids: string[], action: "delete" } — permanently delete selected carts
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = serviceClient();

  if (body.action === "delete") {
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, 500) : [];
    if (!ids.length) return NextResponse.json({ error: "Nothing selected" }, { status: 400 });
    const { error, count } = await db.from("abandoned_checkouts").delete({ count: "exact" }).in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: count ?? ids.length });
  }

  const { id, status } = body;
  if (!["open", "contacted", "recovered", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Bad status" }, { status: 400 });
  }
  const { error } = await db
    .from("abandoned_checkouts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
