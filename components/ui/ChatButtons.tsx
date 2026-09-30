"use client";

import { whatsappLink, messengerLink } from "@/lib/contact";
import { useTracking } from "@/hooks/useTracking";

interface ChatButtonsProps {
  /** Pre-typed WhatsApp message */
  message: string;
  /** Messenger ref, e.g. the product slug — shows in the page inbox */
  refTag?: string;
  label?: string;
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.43 9.43 0 01-4.8-1.31l-.35-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 01-1.45-5.02c0-5.2 4.24-9.43 9.45-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 012.76 6.67c0 5.2-4.24 9.43-9.43 9.43zm8.03-17.46A11.3 11.3 0 0012.04.72C5.78.72.68 5.8.68 12.06c0 2 .52 3.95 1.52 5.67L.58 23.28l5.68-1.49a11.3 11.3 0 005.78 1.47h.01c6.26 0 11.36-5.09 11.36-11.35 0-3.03-1.18-5.88-3.34-8.02z"/>
  </svg>
);
const MessengerIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M12 .8C5.7.8.8 5.4.8 11.6c0 3.2 1.3 6 3.5 8V23l3.3-1.8c.9.3 1.9.4 2.9.4 6.3 0 11.2-4.6 11.2-10.8S18.3.8 12 .8zm1.1 14.6l-2.9-3.1-5.6 3.1 6.2-6.6 3 3.1 5.5-3.1-6.2 6.6z"/>
  </svg>
);

export default function ChatButtons({ message, refTag, label = "Questions before you order?" }: ChatButtonsProps) {
  const { track } = useTracking();
  const onClick = () => track({ type: "Contact" });
  const btn = "flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-brand-gray-200 px-4 py-3 text-xs uppercase tracking-wider text-black hover:border-black transition-colors";
  return (
    <div>
      <p className="label-xs text-brand-gray-500 mb-2">{label}</p>
      <div className="flex gap-3">
        <a href={whatsappLink(message)} target="_blank" rel="noopener noreferrer" onClick={onClick} className={btn}>
          <span className="text-[#128C4B]"><WhatsAppIcon /></span> WhatsApp
        </a>
        <a href={messengerLink(refTag)} target="_blank" rel="noopener noreferrer" onClick={onClick} className={btn}>
          <span className="text-[#0866FF]"><MessengerIcon /></span> Messenger
        </a>
      </div>
    </div>
  );
}
