"use client";

import { useCallback } from "react";
import { getAttribution, getFbCookies } from "@/lib/attribution";

// Fire server-side CAPI event (alongside browser pixel for deduplication)
async function sendCAPI(
  eventName: string,
  eventId: string,
  customData: Record<string, unknown> = {},
  userData: Record<string, string> = {}
) {
  try {
    const { fbc, fbp } = getFbCookies();
    // Meta's `contents` format: id, quantity, item_price only (names are GA4-only)
    if (Array.isArray(customData.contents)) {
      customData = {
        ...customData,
        contents: (customData.contents as TrackingContent[]).map(({ id, quantity, item_price }) => ({ id, quantity, item_price })),
      };
    }
    await fetch("/api/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        customData,
        userData,
        fbc,
        fbp,
        eventSourceUrl: typeof window !== "undefined" ? window.location.href : "",
      }),
    });
  } catch {
    // silently fail — browser pixel still fires
  }
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    ttq?: { track: (...args: unknown[]) => void };
    snaptr?: (...args: unknown[]) => void;
  }
}

/** One line item in Meta's `contents` format — `id` must match the catalog feed's g:id (product.id). */
export interface TrackingContent {
  id: string;
  quantity: number;
  item_price: number;
  /** GA4 only (stripped before Meta) */
  name?: string;
  category?: string;
}

interface TrackingEvent {
  type:
    | "PageView"
    | "ViewContent"
    | "AddToCart"
    | "InitiateCheckout"
    | "Purchase"
    | "Lead"
    | "Contact"
    | "CompleteRegistration";
  /** Pass eventID to fire Meta Pixel with deduplication support (server-side CAPI uses the same ID). */
  eventId?: string;
  data?: {
    content_ids?: string[];
    content_type?: "product";
    contents?: TrackingContent[];
    content_name?: string;
    content_category?: string;
    value?: number;
    currency?: string;
    num_items?: number;
    order_id?: string;
  };
}

// Pixel scripts load after hydration (afterInteractive / lazyOnload), so events fired
// on mount — ViewContent on a product page, InitiateCheckout on a direct checkout
// load — used to find no fbq/gtag/ttq yet and were silently dropped. Wait for the
// global instead (up to 15s) so the event still goes out once the script is ready.
function whenReady(isReady: () => boolean, fire: () => void, timeoutMs = 15000) {
  if (typeof window === "undefined") return;
  if (isReady()) return fire();
  const started = Date.now();
  const timer = window.setInterval(() => {
    if (isReady()) {
      window.clearInterval(timer);
      fire();
    } else if (Date.now() - started > timeoutMs) {
      window.clearInterval(timer);
    }
  }, 200);
}

export function useTracking() {
  const track = useCallback(({ type, data = {}, eventId }: TrackingEvent) => {
    const eventData = {
      currency: "BDT",
      ...data,
    };

    // Meta gets its standard `contents` shape only (id, quantity, item_price)
    const metaData = data.contents
      ? { ...eventData, contents: data.contents.map(({ id, quantity, item_price }) => ({ id, quantity, item_price })) }
      : eventData;

    // Meta Pixel — fire once, with eventId when provided for CAPI deduplication
    whenReady(() => !!window.fbq, () => {
      if (eventId) {
        window.fbq!("track", type, metaData, { eventID: eventId });
      } else {
        window.fbq!("track", type, metaData);
      }
    });

    // Google Analytics 4 — ecommerce events need an `items` array (and
    // `transaction_id` for purchases) or GA4's product/revenue reports stay empty.
    // PageView is NOT sent: GA4 enhanced measurement already records SPA page
    // changes, so sending it here double-counted every in-site navigation.
    if (type !== "PageView") {
      whenReady(() => !!window.gtag, () => {
        const gaEventMap: Record<string, string> = {
          ViewContent: "view_item",
          AddToCart: "add_to_cart",
          InitiateCheckout: "begin_checkout",
          Purchase: "purchase",
          Lead: "generate_lead",
          Contact: "contact",
        };
        const gaEvent = gaEventMap[type] || type.toLowerCase();
        const items = data.contents?.map((c) => ({
          item_id: c.id,
          item_name: c.name || data.content_name,
          item_category: c.category || data.content_category,
          price: c.item_price,
          quantity: c.quantity,
        }));
        window.gtag!("event", gaEvent, {
          currency: eventData.currency,
          ...(data.value !== undefined ? { value: data.value } : {}),
          ...(data.order_id ? { transaction_id: data.order_id } : {}),
          ...(items?.length ? { items } : {}),
        });
      });
    }

    // Google Tag Manager via dataLayer
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({
        event: type,
        ...eventData,
      });
    }

    // TikTok Pixel (lazyOnload — loads last)
    whenReady(() => !!window.ttq, () => window.ttq!.track(type, eventData));
  }, []);

  const trackPageView = useCallback(() => track({ type: "PageView" }), [track]);

  const trackProductView = useCallback(
    (productId: string, productName: string, price: number, category: string) => {
      const eventId = `vc_${productId}_${Date.now()}`;
      // content_type + contents let Meta match this event to the catalog item
      const data = {
        content_ids: [productId],
        content_type: "product" as const,
        contents: [{ id: productId, quantity: 1, item_price: price }],
        content_name: productName,
        content_category: category,
        value: price,
      };
      // Pass eventId into track() so Meta Pixel fires exactly once with dedup ID
      track({ type: "ViewContent", eventId, data });
      sendCAPI("ViewContent", eventId, { ...data, currency: "BDT" });
    },
    [track]
  );

  const trackAddToCart = useCallback(
    (productId: string, productName: string, price: number, quantity: number) => {
      const eventId = `atc_${productId}_${Date.now()}`;
      const data = {
        content_ids: [productId],
        content_type: "product" as const,
        contents: [{ id: productId, quantity, item_price: price }],
        content_name: productName,
        value: price * quantity,
        num_items: quantity,
      };
      // Pass eventId into track() so Meta Pixel fires exactly once with dedup ID
      track({ type: "AddToCart", eventId, data });
      sendCAPI("AddToCart", eventId, { ...data, currency: "BDT" });
    },
    [track]
  );

  const trackBeginCheckout = useCallback(
    (value: number, contents: TrackingContent[]) => {
      const eventId = `checkout_${Date.now()}`;
      const data = {
        content_ids: [...new Set(contents.map((c) => c.id))],
        content_type: "product" as const,
        contents,
        value,
        num_items: contents.reduce((s, c) => s + c.quantity, 0),
      };
      // Pass eventId into track() so the browser pixel event carries the same
      // ID as the CAPI event below — required for Meta to dedupe the two.
      track({ type: "InitiateCheckout", eventId, data });
      sendCAPI("InitiateCheckout", eventId, { ...data, currency: "BDT" });
    },
    [track]
  );

  const trackPurchase = useCallback(
    (orderId: string, value: number, contents: TrackingContent[], numItems?: number) => {
      // Stable eventId (keyed to orderId, not Date.now()) — must equal the one
      // /api/orders uses for the server-side CAPI Purchase, so Meta dedupes the
      // pair. CAPI is NOT sent from here: the server already sent it with full
      // customer data the moment the order was saved.
      const eventId = `purchase_${orderId}`;
      track({
        type: "Purchase",
        eventId,
        data: {
          order_id: orderId,
          value,
          content_ids: [...new Set(contents.map((c) => c.id))],
          content_type: "product",
          contents,
          num_items: numItems ?? contents.reduce((s, c) => s + c.quantity, 0),
        },
      });
    },
    [track]
  );

  const trackFormSubmission = useCallback(
    () => track({ type: "Lead" }),
    [track]
  );

  return {
    track,
    trackPageView,
    trackProductView,
    trackAddToCart,
    trackBeginCheckout,
    trackPurchase,
    trackFormSubmission,
  };
}
