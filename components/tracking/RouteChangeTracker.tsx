"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useTracking } from "@/hooks/useTracking";

function RouteChangeTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackPageView } = useTracking();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the very first mount — the base pixel script in TrackingScripts
    // already fires one PageView for the initial load. Only re-fire on
    // subsequent client-side (SPA) navigations, which the base script never sees.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    trackPageView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}

export default function RouteChangeTracker() {
  return (
    <Suspense fallback={null}>
      <RouteChangeTrackerInner />
    </Suspense>
  );
}
