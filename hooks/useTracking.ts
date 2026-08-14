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
      // Pass eventId into track() so Meta Pixel fires exactly once with dedup ID
      track({
        type: "ViewContent",
        eventId,
        data: { content_ids: [productId], content_name: productName, content_category: category, value: price },
      });
      sendCAPI("ViewContent", eventId, {
        content_ids: [productId],
        content_name: productName,
        content_category: category,
        value: price,
        currency: "BDT",
      });
    },
    [track]
  );

  const trackAddToCart = useCallback(
    (productId: string, productName: string, price: number, quantity: number) => {
      const eventId = `atc_${productId}_${Date.now()}`;
      // Pass eventId into track() so Meta Pixel fires exactly once with dedup ID
      track({
        type: "AddToCart",
        eventId,
        data: {
          content_ids: [productId],
          content_name: productName,
          value: price * quantity,
          num_items: quantity,
        },
      });
      sendCAPI("AddToCart", eventId, {
        content_ids: [productId],
        content_name: productName,
        value: price * quantity,
        currency: "BDT",
        num_items: quantity,
      });
    },
    [track]
  );

  const trackBeginCheckout = useCallback(
    (value: number, numItems: number) => {
      const eventId = `checkout_${Date.now()}`;
      track({ type: "InitiateCheckout", data: { value, num_items: numItems } });
      sendCAPI("InitiateCheckout", eventId, { value, currency: "BDT", num_items: numItems });
    },
    [track]
  );

  const trackPurchase = useCallback(
    (orderId: string, value: number, numItems: number, userData?: { email?: string; phone?: string; name?: string }) => {
      const eventId = `purchase_${orderId}`;
      track({
        type: "Purchase",
        data: { order_id: orderId, value, num_items: numItems },
      });
      // Fire pixel with eventId for deduplication
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "Purchase", {
          value,
          currency: "BDT",
          num_items: numItems,
          order_id: orderId,
        }, { eventID: eventId });
      }
      sendCAPI("Purchase", eventId, {
        value,
        currency: "BDT",
        num_items: numItems,
        order_id: orderId,
      }, userData || {});
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
