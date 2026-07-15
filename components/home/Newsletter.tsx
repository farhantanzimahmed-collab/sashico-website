"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "success" : "error");
      if (res.ok) setEmail("");
    } catch {
      setState("error");
    }
  }

  return (
    <section className="bg-black py-24 lg:py-32">
      <div className="container-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — headline */}
          <div>
            <p className="label-xs text-white/55 mb-6">Stay in the loop</p>
            <h2 className="display-heading text-[clamp(3.5rem,8vw,7rem)] text-white leading-none">
              GET<br />EARLY<br />ACCESS
            </h2>
          </div>

          {/* Right — form */}
          <div>
            <p className="text-sm text-white/50 leading-relaxed mb-10 max-w-sm">
              Subscribe for early access to new drops, exclusive member offers, and behind-the-scenes content. No spam, ever.
            </p>

            {state === "success" ? (
              <div className="border border-white/20 rounded-lg px-8 py-5 inline-block">
                <p className="label-xs text-white/70">You&apos;re on the list. Thank you.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex border-b border-white/20 focus-within:border-white transition-colors">
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-transparent py-4 text-sm text-white placeholder:text-white/30 focus:outline-none"
                    style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
                  />
                  <button
                    type="submit"
                    disabled={state === "loading"}
                    aria-label="Subscribe to newsletter"
                    className="pl-6 py-4 text-white/60 hover:text-white transition-colors disabled:opacity-40 flex-shrink-0"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
                {state === "error" && (
                  <p className="text-xs text-red-400">Something went wrong. Try again.</p>
                )}
                <p className="text-xs text-white/60">Unsubscribe at any time.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
