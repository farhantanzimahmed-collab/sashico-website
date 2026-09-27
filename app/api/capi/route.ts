import { NextRequest, NextResponse } from "next/server";
import { sendMetaEvent, requestContext } from "@/lib/meta/capi";

// Browser → server relay for Meta CAPI (ViewContent, AddToCart, InitiateCheckout).
// Purchase is sent directly from /api/orders when the order is saved.
export async function POST(req: NextRequest) {
  if (!process.env.META_CAPI_TOKEN) {
    return NextResponse.json({ ok: false, error: "No CAPI token" }, { status: 500 });
  }

  try {
    const { eventName, eventId, userData = {}, customData = {}, eventSourceUrl, fbc, fbp } = await req.json();

    if (!eventName) {
      return NextResponse.json({ ok: false, error: "eventName required" }, { status: 400 });
    }

    const { ok, data } = await sendMetaEvent({
      eventName,
      eventId,
      eventSourceUrl,
      customData,
      userData,
      fbc,
      fbp,
      ...requestContext(req.headers),
    });

    if (!ok) return NextResponse.json({ ok: false, error: data }, { status: 500 });
    return NextResponse.json({ ok: true, result: data });
  } catch (err) {
    console.error("CAPI route error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
