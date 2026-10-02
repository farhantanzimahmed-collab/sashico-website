/**
 * FREE Carry Bag: 1 per order when the PRODUCT subtotal (delivery not counted)
 * is ৳600 or more. The gift is the SS-DB-005 Embroidery Carry Bag, so each free
 * bag is reserved from that product's stock like any other item.
 */
export const CARRY_BAG_THRESHOLD = 600;
export const CARRY_BAG_PRODUCT_ID = "6bb46001-313b-4d7f-9a5d-3153e0f1ad3f";
export const CARRY_BAG_SLUG = "ss-db-005";
export const CARRY_BAG_IMAGE =
  "https://kkvybxtgpczbomjesfxs.supabase.co/storage/v1/object/public/products/products/SS-DB-005/cover.jpg";

export interface GiftItem {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_gift: true;
}

export const carryBagGift = (): GiftItem => ({
  product_id: CARRY_BAG_PRODUCT_ID,
  product_name: "FREE Carry Bag (Gift)",
  product_slug: CARRY_BAG_SLUG,
  product_image: CARRY_BAG_IMAGE,
  size: "FREE SIZE",
  quantity: 1,
  unit_price: 0,
  total_price: 0,
  is_gift: true,
});

export const qualifiesForCarryBag = (productSubtotal: number) => productSubtotal >= CARRY_BAG_THRESHOLD;
export const isGift = (item: { is_gift?: boolean }) => item?.is_gift === true;
