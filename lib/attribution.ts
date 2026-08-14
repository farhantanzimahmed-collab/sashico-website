/**
 * Attribution capture — stores UTM params + Facebook click ID (fbclid)
 * on landing so they're available throughout the customer journey.
 *
 * Called once on layout mount. Retrieved at checkout / event fire time.
 */

const KEY = "sashico_attr";

export interface Attribution {
  utm_source?:   string;
  utm_medium?:   string;
  utm_campaign?: string;
  utm_content?:  string;
  utm_term?:     string;
  fbclid?:       string;
  fbc?:          string;   // formatted for Meta CAPI: fb.1.{ts}.{fbclid}
  landing_page?: string;
  captured_at?:  number;
}

/** Read a cookie by name */
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Capture attribution on page load — only overwrites if fbclid present or no prior capture */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid") || undefined;
  const utmSource = params.get("utm_source") || undefined;

  // Only capture if there's something to capture
  if (!fbclid && !utmSource) return;

  const now = Date.now();
  const fbc = fbclid ? `fb.1.${now}.${fbclid}` : undefined;

  const attr: Attribution = {
    utm_source:   utmSource,
    utm_medium:   params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content:  params.get("utm_content") || undefined,
    utm_term:     params.get("utm_term") || undefined,
    fbclid,
    fbc,
    landing_page: window.location.pathname,
    captured_at:  now,
  };

  sessionStorage.setItem(KEY, JSON.stringify(attr));
}

/** Get stored attribution data */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Get fbc + fbp for Meta CAPI */
export function getFbCookies(): { fbc?: string; fbp?: string } {
  // fbp is set automatically by Meta Pixel
  const fbp = getCookie("_fbp");
  // fbc from our attribution or from cookie
  const stored = getAttribution();
  const fbc = stored.fbc || getCookie("_fbc");
  return { fbc, fbp };
}
