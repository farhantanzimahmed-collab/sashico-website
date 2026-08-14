import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const PIXEL_ID = process.env.META_PIXEL_ID || "1974979363218444";
const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;
const GRAPH_API = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;

function hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!ACCESS_TOKEN) {
    return NextResponse.json({ ok: false, error: "No CAPI token" }, { status: 500 });
  }

  try {
    const { eventName, eventId, userData = {}, customData = {}, eventSourceUrl, fbc, fbp } = await req.json();

    if (!eventName) {
      return NextResponse.json({ ok: false, error: "eventName required" }, { status: 400 });
    }

    // Hash any PII
    const hashedUserData: Record<string, string> = {};
    if (userData.email)  hashedUserData.em  = hash(userData.email);
    if (userData.phone)  hashedUserData.ph  = hash(userData.phone.replace(/\D/g, ""));
    if (userData.name)   {
      const parts = userData.name.trim().split(" ");
      hashedUserData.fn = hash(parts[0]);
      if (parts.length > 1) hashedUserData.ln = hash(parts.slice(1).join(" "));
    }

    // Client IP and user agent from request headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "";
    const ua = req.headers.get("user-agent") || "";

    const event: Record<string, unknown> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: eventSourceUrl || "https://sashico.vercel.app",
      user_data: {
        ...hashedUserData,
        client_ip_address: ip,
        client_user_agent: ua,
        ...(fbc  ? { fbc }  : {}),
        ...(fbp  ? { fbp }  : {}),
      },
      custom_data: customData,
    };

    if (eventId) event.event_id = eventId;

    const res = await fetch(`${GRAPH_API}?access_token=${ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [event] }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("CAPI error:", data);
      return NextResponse.json({ ok: false, error: data }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result: data });
  } catch (err) {
    console.error("CAPI route error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
