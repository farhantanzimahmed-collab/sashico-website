// Direct human chat channels (Bangladeshi COD shoppers often ask before ordering).
// WhatsApp: international format without "+". Messenger: Facebook page username.
export const WHATSAPP_NUMBER = "8801628340463";
export const MESSENGER_PAGE = "Sashico.20";

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function messengerLink(ref?: string): string {
  return `https://m.me/${MESSENGER_PAGE}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
}
