import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "Find your perfect fit with the Sashico size guide.",
};

export const revalidate = 300;

const DEFAULT = {
  heading: "Size Guide",
  body: "All measurements in centimeters. When in doubt, size up for a relaxed streetwear fit.",
  rows: [
    { size: "XS",  chest: "84–88",   waist: "70–74",   hips: "88–92",   shoulder: "41" },
    { size: "S",   chest: "88–92",   waist: "74–78",   hips: "92–96",   shoulder: "43" },
    { size: "M",   chest: "92–96",   waist: "78–82",   hips: "96–100",  shoulder: "45" },
    { size: "L",   chest: "96–100",  waist: "82–86",   hips: "100–104", shoulder: "47" },
    { size: "XL",  chest: "100–106", waist: "86–92",   hips: "104–110", shoulder: "49" },
    { size: "XXL", chest: "106–112", waist: "92–98",   hips: "110–116", shoulder: "51" },
    { size: "3XL", chest: "112–118", waist: "98–104",  hips: "116–122", shoulder: "53" },
  ],
};

type Content = typeof DEFAULT;

async function getContent(): Promise<Content> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("page_content").select("content").eq("page_slug", "size-guide").single();
    return (data?.content as Content) || DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export default async function SizeGuidePage() {
  const c = await getContent();
  const rows = c.rows || DEFAULT.rows;

  return (
    <div className="pt-24 sm:pt-28 pb-20">
      <div className="bg-brand-black text-white py-14 sm:py-20">
        <div className="container-xl max-w-5xl">
          <p className="label-xs text-brand-gray-500 mb-4">Fit & Measurements</p>
          <h1 className="display-heading text-[clamp(2rem,8vw,6rem)] text-white leading-none">{c.heading}</h1>
        </div>
      </div>

      <div className="container-xl max-w-5xl py-12 sm:py-16 space-y-12">
        {c.body && <p className="text-sm text-brand-gray-600 font-sans leading-relaxed max-w-2xl">{c.body}</p>}

        {/* Size table */}
        <div>
          <h2 className="label-xs text-brand-black mb-4">Measurements (cm)</h2>
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-sm font-sans border border-brand-gray-100 min-w-[420px]">
              <thead>
                <tr className="bg-brand-gray-50">
                  {["Size", "Chest", "Waist", "Hips", "Shoulder"].map((h) => (
                    <th key={h} className="px-3 sm:px-5 py-3 text-left label-xs text-brand-gray-500 border-b border-brand-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.size} className={i % 2 === 0 ? "bg-white" : "bg-brand-gray-50"}>
                    <td className="px-3 sm:px-5 py-3 font-semibold text-brand-black">{row.size}</td>
                    <td className="px-3 sm:px-5 py-3 text-brand-gray-600">{row.chest}</td>
                    <td className="px-3 sm:px-5 py-3 text-brand-gray-600">{row.waist}</td>
                    <td className="px-3 sm:px-5 py-3 text-brand-gray-600">{row.hips}</td>
                    <td className="px-3 sm:px-5 py-3 text-brand-gray-600">{row.shoulder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-brand-gray-400 font-sans mt-3">All measurements in centimeters (cm).</p>
        </div>

        {/* Fit tips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Chest", tip: "Measure around the fullest part of your chest, under your armpits, with arms at your sides." },
            { title: "Waist", tip: "Measure around the narrowest part of your natural waist, usually just above your belly button." },
            { title: "Hips", tip: "Stand with your feet together and measure around the fullest part of your hips." },
          ].map((t) => (
            <div key={t.title} className="bg-brand-gray-50 p-5 border border-brand-gray-100">
              <p className="label-xs text-brand-black mb-2">{t.title}</p>
              <p className="text-xs font-sans text-brand-gray-600 leading-relaxed">{t.tip}</p>
            </div>
          ))}
        </div>

        <div className="bg-brand-black text-white p-6 sm:p-8">
          <p className="label-xs text-brand-gray-400 mb-2">Our Fit</p>
          <p className="text-sm font-sans text-white leading-relaxed">
            Sashico garments are designed with a <strong className="text-white">relaxed, slightly oversized silhouette</strong> — true to contemporary streetwear. If you're between sizes, we always recommend <strong className="text-white">sizing up</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
