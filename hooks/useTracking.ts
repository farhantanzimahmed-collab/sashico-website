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

export function useTracking() {
  const track = useCallback(({ type, data = {}, eventId }: TrackingEvent) => {
    const eventData = {
      currency: "BDT",
      ...data,
    };

    // Meta Pixel — fire once, with eventId when provided for CAPI deduplication
    if (typeof window !== "undefined" && window.fbq) {
      if (eventId) {
        window.fbq("track", type, eventData, { eventID: eventId });
      } else {
        window.fbq("track", type, eventData);
      }
    }

    // Google Analytics 4
    if (typeof window !== "undefined" && window.gtag) {
      const gaEventMap: Record<string, string> = {
        PageView: "page_view",
        ViewContent: "view_item",
        AddToCart: "add_to_cart",
        InitiateCheckout: "begin_checkout",
        Purchase: "purchase",
        Lead: "generate_lead",
        Contact: "contact",
      };
      const gaEvent = gaEventMap[type] || type.toLowerCase();
      window.gtag("event", gaEvent, eventData);
    }

    // Google Tag Manager via dataLayer
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({
        event: type,
        ...eventData,
      });
    }

    // TikTok Pixel
    if (typeof window !== "undefined" && window.ttq) {
      window.ttq.track(type, eventData);
    }
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
