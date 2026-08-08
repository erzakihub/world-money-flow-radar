import React from "react";
import { Search, Compass, AlertCircle, CheckCircle2 } from "lucide-react";

export default function EarlyBullDetector() {
  const candidates = [
    { name: "Nifty IT", type: "India Sector", stage: "Stage 2: Early Accumulation", flow: "FPI Neutral, DII Net Buying", rs: "Improving (+2.4% 1M)", rrg: "Improving", price: "Above 50DMA", confidence: "High (82%)", winRate: "72%", fwdReturn: "+8.4%", action: "Early Accumulation", actionColor: "text-brand-blue bg-brand-blue/10 border-brand-blue/20" },
    { name: "S&P Technology (XLK)", type: "US Sector", stage: "Stage 5: Overheated / Crowded", flow: "ETF Inflow Extreme", rs: "Leading (+14.5% 3M)", rrg: "Leading", price: "18% Above 200DMA", confidence: "High (90%)", winRate: "55%", fwdReturn: "+1.2%", action: "Overheated", actionColor: "text-brand-red bg-brand-red/10 border-brand-red/20" },
    { name: "Treasury Bonds (TLT)", type: "Global Asset", stage: "Stage 1: Base Formation", flow: "ETF Outflows Slowing", rs: "Lagging (-1.2% 1M)", rrg: "Improving", price: "Crossing 50DMA", confidence: "Medium (65%)", winRate: "62%", fwdReturn: "+4.1%", action: "Watch", actionColor: "text-gray-400 bg-gray-800 border-gray-700" },
    { name: "Nifty Bank", type: "India Sector", stage: "Stage 2: Early Accumulation", flow: "FPI Inflow Beginning", rs: "Improving (+1.8% 1M)", rrg: "Improving", price: "Above 50DMA", confidence: "High (80%)", winRate: "68%", fwdReturn: "+6.8%", action: "Early Accumulation", actionColor: "text-brand-blue bg-brand-blue/10 border-brand-blue/20" },
    { name: "Nifty Realty", type: "India Sector", stage: "Stage 4: Momentum Expansion", flow: "Mutual Fund Buying Spiked", rs: "Leading (+22.1% 3M)", rrg: "Leading", price: "Above 50DMA", confidence: "High (88%)", winRate: "65%", fwdReturn: "+9.2%", action: "Hold", actionColor: "text-brand-green bg-brand-green/10 border-brand-green/20" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Early Bull Market Detector</h2>
          <p className="text-sm text-gray-500">Screen global assets and sectors entering accumulation stages or early-stage trends.</p>
        </div>
      </div>

      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand-green" />
          <span>Early Bull Screening Parameters</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-gray-400">
          <div className="p-3 bg-gray-900/40 rounded border border-gray-800">
            <span className="text-[10px] text-gray-500 uppercase block">Regime Alignment</span>
            <span className="text-white font-semibold mt-1 block">Liquidity &gt; +20</span>
          </div>
          <div className="p-3 bg-gray-900/40 rounded border border-gray-800">
            <span className="text-[10px] text-gray-500 uppercase block">RRG Rotation</span>
            <span className="text-white font-semibold mt-1 block">Lagging to Improving</span>
          </div>
          <div className="p-3 bg-gray-900/40 rounded border border-gray-800">
            <span className="text-[10px] text-gray-500 uppercase block">Moving Average Triggers</span>
            <span className="text-white font-semibold mt-1 block">Price Crosses 50DMA</span>
          </div>
          <div className="p-3 bg-gray-900/40 rounded border border-gray-800">
            <span className="text-[10px] text-gray-500 uppercase block">Flow Convergence</span>
            <span className="text-white font-semibold mt-1 block">Flow turns less negative</span>
          </div>
        </div>
      </div>

      {/* Screen Candidates Table */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-md font-heading font-semibold text-white mb-4">Screener Candidates</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-gray-800 text-gray-500 uppercase">
              <tr>
                <th className="py-2.5">Asset / Sector</th>
                <th>Category</th>
                <th>Uptrend Stage</th>
                <th>RRG Quadrant</th>
                <th>Confidence</th>
                <th>Hist Hit Rate</th>
                <th>Med 6M Fwd Ret</th>
                <th className="text-right">Action Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {candidates.map((c, idx) => (
                <tr key={idx} className="hover:bg-gray-900/30">
                  <td className="py-3 font-semibold text-white">{c.name}</td>
                  <td className="text-gray-400">{c.type}</td>
                  <td>{c.stage}</td>
                  <td>{c.rrg}</td>
                  <td>{c.confidence}</td>
                  <td>{c.winRate}</td>
                  <td className="text-brand-green font-semibold">{c.fwdReturn}</td>
                  <td className="text-right">
                    <span className={`px-2.5 py-0.5 rounded border text-[10px] font-semibold ${c.actionColor}`}>
                      {c.action}
                    </span>
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
