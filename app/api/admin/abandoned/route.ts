import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminAuth";

// POST { id, status } — admin marks a cart contacted / recovered / dismissed
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await req.json();
  if (!["open", "contacted", "recovered", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Bad status" }, { status: 400 });
  }
  const { error } = await serviceClient()
    .from("abandoned_checkouts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
