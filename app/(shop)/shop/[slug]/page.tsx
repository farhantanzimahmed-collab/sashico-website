import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient as supabaseCreateClient } from "@supabase/supabase-js";
import ImageGallery from "@/components/product/ImageGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductSection from "@/components/home/ProductSection";
import { Product, Review } from "@/lib/types";
import { Star } from "lucide-react";
import { formatDate } from "@/lib/utils";

// Product pages are public (no auth needed) — plain client avoids cookies() in SSG context
function createPublicClient() {
  return supabaseCreateClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).replace(/\s+/g, "-").toLowerCase().trim();
  const supabase = createPublicClient();
  const { data: product } = await supabase
    .from("products")
    .select("name, description, meta_title, meta_description, images")
    .eq("slug", cleanSlug)
    .single();

  if (!product) return { title: "Product Not Found" };

  return {
    title: product.meta_title || product.name,
    description:
      product.meta_description ||
      product.description ||
      `Shop ${product.name} at Sashico`,
    openGraph: {
      title: product.name,
      description: product.description || "",
      images: product.images?.length ? [product.images[0]] : [],
    },
  };
}

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("products")
      .select("slug")
      .eq("is_active", true)
      .limit(100);
    return (data || []).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const PRODUCT_COLS = "id,name,slug,price,discount_price,category,category_id,images,sizes,colors,stitch_count,stock_quantity,is_featured,is_new_arrival,is_best_seller,is_active,description,meta_title,meta_description,created_at,updated_at";

  // Normalize slug: URL-decode and replace spaces with hyphens
  const cleanSlug = decodeURIComponent(slug).replace(/\s+/g, "-").toLowerCase().trim();

  const [productRes, reviewsRes] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_COLS)
      .eq("slug", cleanSlug)
      .eq("is_active", true)
      .single(),
    supabase
      .from("reviews")
      .select("id,product_id,customer_name,rating,comment,is_approved,created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: false }),
  ]);

  if (!productRes.data) notFound();

  const product = productRes.data as Product;
  const allReviews = (reviewsRes.data as Review[]) || [];
  const productReviews = allReviews.filter((r) => r.product_id === product.id);

  // Fetch related products
  const { data: relatedData } = await supabase
    .from("products")
    .select(PRODUCT_COLS)
    .eq("category", product.category)
    .eq("is_active", true)
    .neq("id", product.id)
    .limit(4);

  const relatedProducts = (relatedData as Product[]) || [];
  const avgRating =
    productReviews.length > 0
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
      : 0;

  // JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    offers: {
      "@type": "Offer",
      price: product.discount_price || product.price,
      priceCurrency: "BDT",
      availability:
        product.stock_quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
    aggregateRating:
      productReviews.length > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: productReviews.length,
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pt-28">
        <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8 py-10">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-2xs uppercase tracking-wider font-sans text-brand-gray-400">
            <a href="/" className="hover:text-brand-black transition-colors">
              Home
            </a>
            <span>/</span>
            <a href="/shop" className="hover:text-brand-black transition-colors">
              Shop
            </a>
            <span>/</span>
            <span className="text-brand-black">{product.name}</span>
          </nav>

          {/* Product Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            <ImageGallery images={product.images} productName={product.name} />
            <ProductInfo product={product} />
          </div>

          {/* Reviews */}
          {productReviews.length > 0 && (
            <div className="mt-20 pt-16 border-t border-brand-gray-100">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="font-serif text-display-sm text-brand-black">
                    Customer Reviews
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex gap-0.5">
                      {Array(5).fill(0).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.round(avgRating)
                              ? "text-brand-black fill-brand-black"
                              : "text-brand-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-sans text-brand-gray-600">
                      {avgRating.toFixed(1)} / 5 ({productReviews.length} reviews)
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {productReviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-brand-gray-50 p-6 space-y-3"
                  >
                    <div className="flex gap-0.5">
                      {Array(5).fill(0).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.rating
                              ? "text-brand-black fill-brand-black"
                              : "text-brand-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-brand-gray-700 font-sans leading-relaxed">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-2xs uppercase tracking-wider text-brand-black font-sans font-medium">
                        {review.customer_name}
                      </p>
                      <p className="text-2xs text-brand-gray-400 font-sans">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-brand-gray-100">
            <ProductSection
              title="You May Also Like"
              products={relatedProducts}
              viewAllHref={`/shop?category=${product.category.toLowerCase()}`}
            />
          </div>
        )}
      </div>
    </>
  );
}
