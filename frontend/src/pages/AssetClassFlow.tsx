import React, { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";

export default function AssetClassFlow() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/asset-flow")
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  // Get color for heatmap cells based on value
  const getHeatmapColor = (val: number) => {
    if (val >= 15) return "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40";
    if (val >= 5) return "bg-emerald-950/40 text-emerald-500 border border-emerald-950/20";
    if (val >= 0) return "bg-blue-950/20 text-blue-400 border border-blue-900/10";
    if (val >= -5) return "bg-red-950/20 text-red-500 border border-red-950/10";
    return "bg-red-950/80 text-red-400 border border-red-800/40";
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Asset Class Money Flow</h2>
          <p className="text-sm text-gray-500">Track capital allocation flows and relative strength heatmaps between primary asset classes.</p>
        </div>
      </div>

      {/* Sankey Flow Diagram */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white">Interactive Capital Flow Sankey Map</h3>
        <p className="text-xs text-gray-500 leading-relaxed">Visualizes the path of global liquidity distribution from cash buffers into risk asset markets.</p>
        
        {/* Custom SVG Sankey implementation */}
        <div className="w-full flex justify-center py-4 bg-gray-950/20 rounded-xl p-4 border border-gray-900">
          <svg className="w-full max-w-[900px] h-[340px]" viewBox="0 0 900 340">
            {/* Connection Links */}
            {/* Global Liq -> Cash */}
            <path d="M 120 170 C 230 170, 230 50, 340 50" fill="none" stroke="rgba(41, 182, 246, 0.12)" strokeWidth="36" />
            {/* Global Liq -> Bonds */}
            <path d="M 120 170 C 230 170, 230 110, 340 110" fill="none" stroke="rgba(171, 71, 188, 0.12)" strokeWidth="22" />
            {/* Global Liq -> Equities */}
            <path d="M 120 170 C 230 170, 230 170, 340 170" fill="none" stroke="rgba(0, 230, 118, 0.15)" strokeWidth="52" />
            {/* Global Liq -> Gold */}
            <path d="M 120 170 C 230 170, 230 230, 340 230" fill="none" stroke="rgba(255, 167, 38, 0.12)" strokeWidth="15" />
            {/* Global Liq -> Crypto */}
            <path d="M 120 170 C 230 170, 230 290, 340 290" fill="none" stroke="rgba(171, 71, 188, 0.15)" strokeWidth="12" />

            {/* Equities -> US */}
            <path d="M 380 170 C 490 170, 490 60, 600 60" fill="none" stroke="rgba(0, 230, 118, 0.12)" strokeWidth="30" />
            {/* Equities -> Europe */}
            <path d="M 380 170 C 490 170, 490 130, 600 130" fill="none" stroke="rgba(0, 230, 118, 0.08)" strokeWidth="12" />
            {/* Equities -> India */}
            <path d="M 380 170 C 490 170, 490 200, 600 200" fill="none" stroke="rgba(0, 230, 118, 0.15)" strokeWidth="20" />
            {/* Equities -> China */}
            <path d="M 380 170 C 490 170, 490 270, 600 270" fill="none" stroke="rgba(0, 230, 118, 0.06)" strokeWidth="8" />

            {/* Nodes */}
            {/* Column 1: Global Source */}
            <rect x="20" y="110" width="100" height="120" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <text x="70" y="175" fill="#f3f4f6" textAnchor="middle" style={{ fontSize: 10, fontFamily: 'sans-serif', fontWeight: 'bold' }}>GLOBAL LIQUIDITY</text>
            
            {/* Column 2: Intermediate Classes */}
            {/* Cash */}
            <rect x="340" y="30" width="40" height="40" rx="4" fill="#0c4a6e" stroke="#0284c7" />
            <text x="390" y="55" fill="#e0f2fe" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'semibold' }}>Cash & MMFs</text>
            {/* Bonds */}
            <rect x="340" y="90" width="40" height="40" rx="4" fill="#4c1d95" stroke="#7c3aed" />
            <text x="390" y="115" fill="#f5f3ff" style={{ fontSize: 9, fontFamily: 'monospace' }}>Bonds</text>
            {/* Equities */}
            <rect x="340" y="150" width="40" height="40" rx="4" fill="#064e3b" stroke="#059669" />
            <text x="390" y="175" fill="#ecfdf5" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>Equities</text>
            {/* Gold */}
            <rect x="340" y="210" width="40" height="40" rx="4" fill="#78350f" stroke="#d97706" />
            <text x="390" y="235" fill="#fef3c7" style={{ fontSize: 9, fontFamily: 'monospace' }}>Gold & Comm</text>
            {/* Crypto */}
            <rect x="340" y="270" width="40" height="40" rx="4" fill="#581c87" stroke="#9333ea" />
            <text x="390" y="295" fill="#faf5ff" style={{ fontSize: 9, fontFamily: 'monospace' }}>Crypto</text>

            {/* Column 3: Destination Regions */}
            {/* US */}
            <rect x="600" y="40" width="80" height="40" rx="4" fill="#1e1e2d" stroke="#373752" />
            <text x="640" y="65" fill="#f3f4f6" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'sans-serif' }}>US Equity</text>
            {/* Europe */}
            <rect x="600" y="110" width="80" height="40" rx="4" fill="#1e1e2d" stroke="#373752" />
            <text x="640" y="135" fill="#f3f4f6" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'sans-serif' }}>Europe</text>
            {/* India */}
            <rect x="600" y="180" width="80" height="40" rx="4" fill="#1e1e2d" stroke="#00e676" strokeWidth="1.5" />
            <text x="640" y="205" fill="#f3f4f6" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'sans-serif', fontWeight: 'bold' }}>India Equity</text>
            {/* China */}
            <rect x="600" y="250" width="80" height="40" rx="4" fill="#1e1e2d" stroke="#373752" />
            <text x="640" y="275" fill="#f3f4f6" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'sans-serif' }}>China Equity</text>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Grid */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4 lg:col-span-1">
          <h3 className="text-md font-heading font-semibold text-white">Flow Heatmap Performance</h3>
          <p className="text-xs text-gray-500">Asset class performance returns grouped across trailing intervals.</p>
          <div className="space-y-2 mt-4">
            <div className="grid grid-cols-6 gap-1 text-[10px] text-gray-500 font-mono font-semibold uppercase text-center">
              <div className="text-left">Asset</div>
              <div>1W</div>
              <div>1M</div>
              <div>3M</div>
              <div>6M</div>
              <div>12M</div>
            </div>
            {data.heatmap.map((h: any, idx: number) => (
              <div key={idx} className="grid grid-cols-6 gap-1 text-xs text-center items-center">
                <div className="text-left font-semibold text-gray-300 truncate">{h.asset}</div>
                <div className={`p-1.5 rounded font-mono ${getHeatmapColor(h["1W"])}`}>{h["1W"] > 0 ? "+" : ""}{h["1W"]}%</div>
                <div className={`p-1.5 rounded font-mono ${getHeatmapColor(h["1M"])}`}>{h["1M"] > 0 ? "+" : ""}{h["1M"]}%</div>
                <div className={`p-1.5 rounded font-mono ${getHeatmapColor(h["3M"])}`}>{h["3M"] > 0 ? "+" : ""}{h["3M"]}%</div>
                <div className={`p-1.5 rounded font-mono ${getHeatmapColor(h["6M"])}`}>{h["6M"] > 0 ? "+" : ""}{h["6M"]}%</div>
                <div className={`p-1.5 rounded font-mono ${getHeatmapColor(h["12M"])}`}>{h["12M"] > 0 ? "+" : ""}{h["12M"]}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Details Metrics Table */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4 lg:col-span-2">
          <h3 className="text-md font-heading font-semibold text-white">Constituent Asset Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-gray-800 text-gray-500 uppercase">
                <tr>
                  <th className="py-2">Symbol</th>
                  <th>Flow proxy</th>
                  <th>Relative Str</th>
                  <th>Confidence</th>
                  <th className="text-right">Fwd 3M return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {data.table.map((row: any) => (
                  <tr key={row.symbol} className="hover:bg-gray-900/30">
                    <td className="py-2.5 font-semibold text-white flex items-center gap-1">
                      {row.symbol}
                      <span className="text-[10px] text-gray-500 font-normal truncate max-w-[80px]">({row.name})</span>
                    </td>
                    <td>
                      <span className={row.inferred_flow.includes("Inflow") ? "text-brand-green" : "text-brand-red"}>
                        {row.inferred_flow}
                      </span>
                    </td>
                    <td>{row.relative_strength}</td>
                    <td className="text-gray-400">{row.confidence}</td>
                    <td className="text-right text-brand-green font-semibold flex items-center gap-0.5 justify-end">
                      {row.fwd_3m}
                      <ArrowUpRight className="w-3 h-3" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
