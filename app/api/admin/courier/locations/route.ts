import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listCities, listZones, listAreas } from "@/lib/courier/pathao";

// GET ?type=cities | zones&id=<city_id> | areas&id=<zone_id>
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type");
  const id = Number(req.nextUrl.searchParams.get("id"));
  try {
    if (type === "cities") return NextResponse.json(await listCities());
    if (type === "zones" && id) return NextResponse.json(await listZones(id));
    if (type === "areas" && id) return NextResponse.json(await listAreas(id));
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
