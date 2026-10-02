import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminAuth";
import { listCities, listZones, listAreas } from "@/lib/courier/pathao";

// Pathao city/zone/area lists rarely change. Every successful lookup is saved to
// private storage, and served from there when Pathao can't be reached — so the
// booking form still fills in even during a Pathao/network outage.
const cachePath = (type: string, id?: number) => `pathao-locations/${type}${id ? `-${id}` : ""}.json`;

async function readCache(path: string) {
  const { data } = await serviceClient().storage.from("sashico-config").download(path);
  if (!data) return null;
  try { return JSON.parse(await data.text()); } catch { return null; }
}
async function writeCache(path: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value)], { type: "application/json" });
  await serviceClient().storage.from("sashico-config").upload(path, blob, { contentType: "application/json", upsert: true });
}

// GET ?type=cities | zones&id=<city_id> | areas&id=<zone_id>
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type") || "";
  const id = Number(req.nextUrl.searchParams.get("id")) || undefined;
  if (!["cities", "zones", "areas"].includes(type) || (type !== "cities" && !id)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const path = cachePath(type, id);
  // Cities/zones almost never change → serve the saved copy and don't spend Pathao's
  // rate limit on them (it 429s / drops the server when called too often).
  if (type !== "areas") {
    const cached = await readCache(path);
    if (cached) return NextResponse.json(cached, { headers: { "X-Pathao-Cache": "hit" } });
  }
  try {
    const fresh = type === "cities" ? await listCities() : type === "zones" ? await listZones(id!) : await listAreas(id!);
    writeCache(path, fresh).catch(() => {});
    return NextResponse.json(fresh);
  } catch (e) {
    const cached = await readCache(path);
    if (cached) return NextResponse.json(cached, { headers: { "X-Pathao-Cache": "stale" } });
    return NextResponse.json({ error: `Pathao is not reachable right now — ${(e as Error).message}` }, { status: 503 });
  }
}
