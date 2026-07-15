"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is admin
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", data.user.id)
        .single();

      if (adminError || !adminUser) {
        await supabase.auth.signOut();
        throw new Error("You don't have admin access.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="font-serif text-3xl font-bold tracking-[0.3em] uppercase text-brand-white mb-2">
            SASHICO
          </p>
          <p className="text-2xs uppercase tracking-widest text-brand-gray-500 font-sans">
            Admin Portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-2xs uppercase tracking-wider text-brand-gray-400 font-sans">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sashico.com"
              className="w-full bg-brand-gray-900 border border-brand-gray-700 px-4 py-3 text-sm font-sans text-brand-white placeholder:text-brand-gray-600 focus:border-brand-gray-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-2xs uppercase tracking-wider text-brand-gray-400 font-sans">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-brand-gray-900 border border-brand-gray-700 px-4 py-3 text-sm font-sans text-brand-white placeholder:text-brand-gray-600 focus:border-brand-gray-400 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-white text-brand-black py-4 text-2xs uppercase tracking-widest font-sans font-medium hover:bg-brand-cream transition-colors disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="mt-8 text-center text-2xs text-brand-gray-600 font-sans">
          Forgot password?{" "}
          <a href="mailto:support@sashico.com" className="text-brand-gray-400 hover:text-brand-white transition-colors underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
