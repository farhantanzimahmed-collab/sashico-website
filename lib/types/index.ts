export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  category: string;
  category_id: string | null;
  images: string[];
  sizes: ProductSize[];
  colors?: ProductColor[];
  stitch_count?: number | null;
  stock_quantity: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_active: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface ProductSize {
  size: string;
  stock: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  address: ShippingAddress | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  district: string;
  postal_code?: string;
  country: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  payment_method: "cod" | "bkash" | "nagad" | "card";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  order_status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface MarketingSettings {
  id: number;
  meta_pixel_id: string | null;
  meta_pixel_enabled: boolean;
  ga4_id: string | null;
  ga4_enabled: boolean;
  gtm_id: string | null;
  gtm_enabled: boolean;
  tiktok_pixel_id: string | null;
  tiktok_pixel_enabled: boolean;
  snapchat_pixel_id: string | null;
  snapchat_pixel_enabled: boolean;
  linkedin_partner_id: string | null;
  linkedin_enabled: boolean;
  updated_at: string;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string | null;
  hero_video: string | null;
  hero_cta_text: string;
  about_title: string;
  about_content: string;
  about_image: string | null;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  shipping_cost: number;
  free_shipping_threshold: number;
  currency: string;
  currency_symbol: string;
  announcement_bar_text: string | null;
  announcement_bar_enabled: boolean;
  announcement_bar_bg_color?: string | null;
  announcement_bar_text_color?: string | null;
  font_family?: string | null;
  logo_url?: string | null;
  hero_image_1?: string | null;
  hero_image_2?: string | null;
  hero_image_3?: string | null;
  hero_image_4?: string | null;
  hero_mode?: string | null;
  hero_cover_image?: string | null;
  updated_at: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: "admin" | "super_admin";
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  subscribed_at: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PageContent {
  id: number;
  page_slug: string;
  page_title: string;
  content: Record<string, unknown>;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string;
}

export type ProductFilterOptions = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  sortBy?: "newest" | "price_asc" | "price_desc" | "popular";
  search?: string;
  page?: number;
  limit?: number;
};
