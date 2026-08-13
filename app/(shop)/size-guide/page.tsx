import { Metadata } from "next";
import { getSizeChart } from "@/lib/size-charts";

export const metadata: Metadata = {
  title: "Size Guide",
  description: "Find your perfect fit with the Sashico size guide.",
};

const CATEGORIES = ["T-Shirts", "Polo", "Cuban Shirts", "Winter"] as const;

export default function SizeGuidePage() {
  return (
    <div className="pt-24 sm:pt-28 pb-20">
      {/* Hero */}
      <div className="bg-brand-black text-white py-14 sm:py-20">
        <div className="container-xl max-w-5xl">
          <p className="label-xs text-brand-gray-500 mb-4">Fit & Measurements</p>
          <h1 className="display-heading text-[clamp(2rem,8vw,6rem)] text-white leading-none">Size Guide</h1>
        </div>
      </div>

      <div className="container-xl max-w-5xl py-12 sm:py-16 space-y-14">
        <p className="text-sm text-brand-gray-600 leading-relaxed max-w-2xl">
          All measurements are in inches. When in doubt, size up — our pieces have a relaxed streetwear fit.
        </p>

        {/* One table per category */}
        {CATEGORIES.map((cat) => {
          const chart = getSizeChart(cat);
          if (!chart) return null;
          return (
            <div key={cat}>
              <h2 className="display-heading text-[1.4rem] text-black leading-none mb-6">
                {chart.label.toUpperCase()}
              </h2>
              <div className="overflow-x-auto -mx-5 sm:mx-0">
                <table className="w-full text-sm border border-brand-gray-100 min-w-[380px]">
                  <thead>
                    <tr className="bg-brand-gray-50">
                      {chart.headers.map((h) => (
                        <th
                          key={h}
                          className="px-4 sm:px-6 py-3 text-left label-xs text-brand-gray-500 border-b border-brand-gray-100"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chart.rows.map((row, i) => (
                      <tr key={row.size} className={i % 2 === 0 ? "bg-white" : "bg-brand-gray-50"}>
                        <td className="px-4 sm:px-6 py-3 font-semibold text-brand-black">{row.size}</td>
                        <td className="px-4 sm:px-6 py-3 text-brand-gray-600">{row.length}</td>
                        <td className="px-4 sm:px-6 py-3 text-brand-gray-600">{row.chest}</td>
                        <td className="px-4 sm:px-6 py-3 text-brand-gray-600">{row.sleeve}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-brand-gray-400 mt-2">All measurements in inches.</p>
            </div>
          );
        })}

        {/* Fit note */}
        <div className="bg-brand-black text-white p-6 sm:p-8">
          <p className="label-xs text-brand-gray-400 mb-2">Our Fit</p>
          <p className="text-sm text-white leading-relaxed">
            Sashico garments are designed with a{" "}
            <strong className="text-white">relaxed, slightly oversized silhouette</strong> — true to
            contemporary streetwear. If you&apos;re between sizes, always{" "}
            <strong className="text-white">size up</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
