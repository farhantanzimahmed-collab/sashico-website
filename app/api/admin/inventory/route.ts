import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin, serviceClient } from "@/lib/adminAuth";

// POST { productId, size, master } — set master stock for one size.
// Only size + master are written; the database keeps live reserved/sold and
// recalculates available, so an order placed meanwhile is never overwritten.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { productId, size, master } = await req.json();
  const value = Math.floor(Number(master));
  if (!productId || !size || !Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "Enter a whole number 0 or more" }, { status: 400 });
  }
  const db = serviceClient();
  const { data: p } = await db.from("products").select("sizes").eq("id", productId).single();
  if (!p) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const sizes = (p.sizes as { size: string; stock: number; master?: number; reserved?: number }[]).map((s) => ({
    size: s.size,
    master: s.size === size ? value : s.master ?? s.stock + (s.reserved ?? 0),
  }));
  const { data, error } = await db.from("products").update({ sizes }).eq("id", productId).select("sizes").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("catalog", "max");
  return NextResponse.json({ ok: true, sizes: data.sizes });
}
