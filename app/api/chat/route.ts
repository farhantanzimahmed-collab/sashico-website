import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_PROMPT = `You are Sashico's friendly customer support assistant. Sashico is a premium embroidery streetwear brand handcrafted in Bangladesh.

BRAND INFO:
- Name: Sashico
- Based in Dhaka, Bangladesh
- Speciality: Premium hand-stitched embroidery on streetwear (T-shirts, Hoodies, Jackets, Accessories)
- Founded with a mission to merge Bangladeshi embroidery craft with modern streetwear

SHIPPING POLICY:
- Standard delivery: 3-5 business days inside Dhaka
- Outside Dhaka: 5-7 business days
- Shipping cost: ৳80 inside Dhaka, ৳140 outside Dhaka
- FREE shipping on orders above ৳2,000

PAYMENT:
- Cash on Delivery (COD) only — pay when the item arrives at your door
- No online payment required

RETURN & EXCHANGE POLICY:
- Returns accepted within 7 days of delivery
- Free exchange on size issues
- Item must be unused, unwashed, with tags attached
- Contact: hello@sashico.com to initiate a return

SIZING:
- We follow standard BD sizing: XS, S, M, L, XL, XXL, 3XL
- A detailed size guide is available at /size-guide on the website
- When in doubt, size up — our pieces have a relaxed streetwear fit

CONTACT:
- Email: hello@sashico.com
- Phone: +880 1628340463
- Address: Dhaka, Bangladesh
- Facebook: https://www.facebook.com/Sashico.20

FAQ:
- Q: How do I track my order? A: Share your order number (e.g. SCO-2026-XXXX) and I can look it up for you.
- Q: Can I cancel an order? A: Yes, contact us before the order ships.
- Q: Do you ship outside Bangladesh? A: Currently Bangladesh only.
- Q: How long does embroidery last? A: Our embroidery is stitched to last — wash inside-out on cold, gentle cycle.
- Q: Can I exchange a size? A: Yes, free size exchange within 7 days of delivery.

GUIDELINES:
- Be warm, helpful, and concise
- Answer in the same language the customer uses (Bengali or English)
- If asked about a specific product on the current page, describe it from the page context provided
- For order tracking: look up the order number and report status, items, and estimated delivery
- Recommend related products when it feels natural
- Never make up prices or stock levels — use the product data provided
- Keep responses brief (2-4 sentences max unless more detail is needed)
- Sign off warmly but don't repeat greetings`;

export async function POST(req: NextRequest) {
  try {
    const { message, history, pageContext } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: "I'm not available right now. Please email us at hello@sashico.com and we'll get back to you shortly!"
      });
    }

    const supabase = await createClient();

    // Fetch products for context
    let productContext = "";
    try {
      const { data: products } = await supabase
        .from("products")
        .select("id,name,slug,price,discount_price,category,stock_quantity,sizes,description")
        .eq("is_active", true)
        .limit(30);

      if (products && products.length > 0) {
        productContext = "\n\nALL PRODUCTS:\n" + products
          .map((p) => {
            const price = p.discount_price ? `৳${p.discount_price} (was ৳${p.price})` : `৳${p.price}`;
            const stock = p.stock_quantity === 0 ? "[OUT OF STOCK]" : `[${p.stock_quantity} in stock]`;
            const sizes = Array.isArray(p.sizes) ? p.sizes.map((s: any) => s.size).join(", ") : "";
            return `- ${p.name} (${p.category}) — ${price} ${stock}${sizes ? ` Sizes: ${sizes}` : ""} URL: /shop/${p.slug}`;
          })
          .join("\n");
      }
    } catch {
      // silently skip
    }

    // Order tracking: detect order number in message
    let orderContext = "";
    const orderMatch = message.match(/SCO[-\s]?\d{4}[-\s]?\w+/i);
    if (orderMatch) {
      try {
        const orderNum = orderMatch[0].replace(/\s/g, "").toUpperCase();
        const { data: order } = await supabase
          .from("orders")
          .select("order_number,customer_name,order_status,payment_status,total_amount,items,created_at,tracking_number")
          .or(`order_number.eq.${orderNum},order_number.ilike.%${orderNum}%`)
          .single();

        if (order) {
          const itemsList = Array.isArray(order.items)
            ? order.items.map((i: any) => `${i.product_name} × ${i.quantity} (Size: ${i.size})`).join(", ")
            : "";
          orderContext = `\n\nORDER LOOKUP RESULT for ${order.order_number}:
- Customer: ${order.customer_name}
- Status: ${order.order_status}
- Payment: ${order.payment_status}
- Total: ৳${order.total_amount}
- Items: ${itemsList}
- Placed: ${new Date(order.created_at).toLocaleDateString("en-BD")}
${order.tracking_number ? `- Tracking: ${order.tracking_number}` : ""}`;
        } else {
          orderContext = `\n\nORDER LOOKUP: Order "${orderNum}" not found.`;
        }
      } catch {
        // silently skip
      }
    }

    // Page context from widget
    let pageContextStr = "";
    if (pageContext) {
      pageContextStr = `\n\nCURRENT PAGE CONTEXT:\n${typeof pageContext === "string" ? pageContext : JSON.stringify(pageContext)}`;
    }

    const fullSystemPrompt = SYSTEM_PROMPT + productContext + orderContext + pageContextStr;

    // Build conversation contents for Gemini
    const contents: { role: string; parts: { text: string }[] }[] = [];

    // Add history (alternating user/model)
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-10);
      for (const msg of recent) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add current user message
    contents.push({ role: "user", parts: [{ text: message }] });

    const body = {
      system_instruction: { parts: [{ text: fullSystemPrompt }] },
      contents,
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.7,
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini API error:", data);
      return NextResponse.json({
        reply: "Sorry, I'm having trouble right now. Email us at hello@sashico.com and we'll help you out!"
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({
      reply: "Sorry, I'm having trouble right now. Email us at hello@sashico.com and we'll help you out!"
    });
  }
}
