"use client";

import dynamic from "next/dynamic";

const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), { ssr: false });
const MobileBottomNav = dynamic(() => import("@/components/layout/MobileBottomNav"), { ssr: false });

export default function ClientWidgets() {
  return (
    <>
      <MobileBottomNav />
      <ChatWidget />
    </>
  );
}
