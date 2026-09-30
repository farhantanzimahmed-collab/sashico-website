/** Human-readable "where did this order come from" for admin. */
export interface OrderAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  fbclid?: string;
  landing_page?: string;
}

export function sourceLabel(a?: OrderAttribution | null): { channel: string; campaign: string | null; ad: string | null } {
  if (!a || (!a.utm_source && !a.fbclid)) return { channel: "Direct / organic", campaign: null, ad: null };
  const src = (a.utm_source || "").toLowerCase();
  const paid = /paid|cpc|ads?$/i.test(a.utm_medium || "") || !!a.fbclid;
  const channel =
    /facebook|fb|instagram|ig|meta/.test(src) || (a.fbclid && !src)
      ? paid ? (/instagram|ig/.test(src) ? "Instagram ad" : "Meta ad") : "Facebook / Instagram"
      : /google/.test(src) ? (paid ? "Google ad" : "Google")
      : a.utm_source || "Other";
  return { channel, campaign: a.utm_campaign || null, ad: a.utm_content || null };
}
