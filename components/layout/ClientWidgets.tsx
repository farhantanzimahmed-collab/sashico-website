"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), { ssr: false });
const MobileBottomNav = dynamic(() => import("@/components/layout/MobileBottomNav"), { ssr: false });

export default function ClientWidgets() {
  // Capture UTM params + fbclid on every page load
  useEffect(() => {
    captureAttribution();
  }, []);

  return (
    <>
      <MobileBottomNav />
      <ChatWidget />
    </>
  );
}
