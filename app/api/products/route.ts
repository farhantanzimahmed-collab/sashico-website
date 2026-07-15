import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supabase = await createClient();

    let query = supabase.from("products").select("*").eq("is_active", true);

    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const featured = searchParams.get("featured");
    const newArrival = searchParams.get("new");
    const bestSeller = searchParams.get("bestseller");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sort = searchParams.get("sort") || "newest";

    if (category) query = query.ilike("category", `%${category}%`);
    if (search) query = query.ilike("name", `%${search}%`);
    if (featured === "true") query = query.eq("is_featured", true);
    if (newArrival === "true") query = query.eq("is_new_arrival", true);
    if (bestSeller === "true") query = query.eq("is_best_seller", true);

    if (sort === "newest") query = query.order("created_at", { ascending: false });
    else if (sort === "price_asc") query = query.order("price", { ascending: true });
    else if (sort === "price_desc") query = query.order("price", { ascending: false });

    const { data, error } = await query.limit(limit);
    if (error) throw error;

    return NextResponse.json({ products: data }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
