"use client";

import { useCallback } from "react";

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
  const track = useCallback(({ type, data = {} }: TrackingEvent) => {
    const eventData = {
      currency: "BDT",
      ...data,
    };

    // Meta Pixel
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", type, eventData);
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
    (productId: string, productName: string, price: number, category: string) =>
      track({
        type: "ViewContent",
        data: {
          content_ids: [productId],
          content_name: productName,
          content_category: category,
          value: price,
        },
      }),
    [track]
  );

  const trackAddToCart = useCallback(
    (productId: string, productName: string, price: number, quantity: number) =>
      track({
        type: "AddToCart",
        data: {
          content_ids: [productId],
          content_name: productName,
          value: price * quantity,
          num_items: quantity,
        },
      }),
    [track]
  );

  const trackBeginCheckout = useCallback(
    (value: number, numItems: number) =>
      track({
        type: "InitiateCheckout",
        data: { value, num_items: numItems },
      }),
    [track]
  );

  const trackPurchase = useCallback(
    (orderId: string, value: number, numItems: number) =>
      track({
        type: "Purchase",
        data: { order_id: orderId, value, num_items: numItems },
      }),
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
