import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin, serviceClient } from "@/lib/adminAuth";

// POST { id, action: "approve" | "hide" | "delete" }
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, action } = await req.json();
  const db = serviceClient();
  const { error } =
    action === "delete"
      ? await db.from("reviews").delete().eq("id", id)
      : await db.from("reviews").update({ is_approved: action === "approve" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("catalog", "max"); // homepage + product pages show the change right away
  return NextResponse.json({ ok: true });
}
