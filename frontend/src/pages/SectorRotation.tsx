import React from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

export default function SectorRotation() {
  const sectorsUS = [
    { symbol: "XLK", name: "Technology", quadrant: "Leading", rs: "Strong (+7.2% 1M)", slope: "Positive", priceAction: "Above 50DMA/200DMA", volume: "Confirming", status: "Leadership" },
    { symbol: "XLF", name: "Financials", quadrant: "Lagging", rs: "Weak (-1.5% 1M)", slope: "Negative", priceAction: "Below 50DMA", volume: "Neutral", status: "Lagging" },
    { symbol: "XLE", name: "Energy", quadrant: "Weakening", rs: "Moderate (+0.4% 1M)", slope: "Negative", priceAction: "Below 50DMA", volume: "Above Average", status: "Distribution" },
    { symbol: "XLI", name: "Industrials", quadrant: "Improving", rs: "Strong (+3.1% 1M)", slope: "Positive", priceAction: "Crossing 50DMA", volume: "Confirming", status: "Accumulation" },
    { symbol: "XLB", name: "Materials", quadrant: "Lagging", rs: "Weak (-2.4% 1M)", slope: "Negative", priceAction: "Below 50DMA", volume: "Neutral", status: "Avoid" },
    { symbol: "XLRE", name: "Real Estate", quadrant: "Leading", rs: "Strong (+12.4% 3M)", slope: "Positive", priceAction: "Above 50DMA/200DMA", volume: "Confirming", status: "Crowded" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Sector Rotation Dashboard</h2>
          <p className="text-sm text-gray-500">Track industrial and cyclical sectors leadership rotations across global (US) and domestic (India) indices.</p>
        </div>
      </div>

      {/* RRG Summary Alert */}
      <div className="p-3 bg-brand-blue/5 border border-brand-blue/10 rounded-lg flex gap-2 text-xs text-brand-blue">
        <RefreshCw className="w-4 h-4 mt-0.5 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
        <p className="leading-relaxed">
          <strong>Rotation Summary:</strong> Industrials and Technology are showing positive RS slope, leading the capital draw, while Financials and Materials have slipped into Lagging quadrants.
        </p>
      </div>

      {/* US Sectors Grid */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-md font-heading font-semibold text-white mb-4">Global Sector Rotations (S&P 500 ETFs)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-gray-800 text-gray-500 uppercase">
              <tr>
                <th className="py-2.5">ETF Ticker</th>
                <th>Sector Name</th>
                <th>RRG Quadrant</th>
                <th>RS Trend</th>
                <th>RS Slope</th>
                <th>Price vs DMAs</th>
                <th className="text-right">Rotation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {sectorsUS.map((sec) => (
                <tr key={sec.symbol} className="hover:bg-gray-900/30">
                  <td className="py-3 font-semibold text-white">{sec.symbol}</td>
                  <td className="text-gray-400">{sec.name}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                      sec.quadrant === "Leading" ? "bg-brand-green/10 text-brand-green border-brand-green/20" : sec.quadrant === "Improving" ? "bg-brand-blue/10 text-brand-blue border-brand-blue/20" : sec.quadrant === "Weakening" ? "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20" : "bg-brand-red/10 text-brand-red border-brand-red/20"
                    }`}>
                      {sec.quadrant}
                    </span>
                  </td>
                  <td>{sec.rs}</td>
                  <td className={sec.slope === "Positive" ? "text-brand-green" : "text-brand-red"}>
                    {sec.slope}
                  </td>
                  <td>{sec.priceAction}</td>
                  <td className={`text-right font-bold ${
                    sec.status === "Leadership" || sec.status === "Accumulation" ? "text-brand-green" : sec.status === "Crowded" ? "text-brand-yellow" : "text-brand-red"
                  }`}>
                    {sec.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
