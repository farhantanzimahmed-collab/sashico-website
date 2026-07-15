import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("page_content")
      .select("content")
      .eq("page_slug", slug)
      .single();

    return NextResponse.json({ content: data?.content || null }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ content: null });
  }
}
