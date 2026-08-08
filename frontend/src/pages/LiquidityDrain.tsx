import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  AlertTriangle, 
  HelpCircle,
  Database,
  ArrowRight,
  TrendingDown,
  Activity,
  Zap,
  Info
} from "lucide-react";
import LiquidityDrainBadge from "../components/LiquidityDrainBadge";
import DataQualityBadge from "../components/DataQualityBadge";

export default function LiquidityDrain() {
  const [drainData, setDrainData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDrainData = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/liquidity-drain/global");
      const data = await response.json();
      setDrainData(data);
    } catch (e) {
      console.error("Failed to fetch liquidity drain data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDrainData();
  }, []);

  if (loading || !drainData) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-red"></div>
      </div>
    );
  }

  // Draw schematic suction nodes coordinates
  // Suction moves from high risk assets (Equities, Cryptos, EM) -> towards safety center (USD Cash, Safe-havens)
  const suctionNodes = [
    { id: "s1_crypto", x: 60, y: 70, name: "Crypto / BTC", score: 28.5 },
    { id: "s2_em", x: 80, y: 150, name: "Emerging Markets", score: 32.1 },
    { id: "s3_smallcap", x: 60, y: 230, name: "Small-Cap Equities", score: 36.4 },
    { id: "s4_jpycarry", x: 70, y: 310, name: "JPY Carry Funding", score: 41.2 },
    
    // Suction pull center (USD Cash)
    { id: "s_safety", x: 380, y: 190, name: "US Dollar (DXY / Cash)", isCenter: true }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-brand-red w-6 h-6 animate-pulse" />
            <span>Liquidity Drain & Sucking Signal Radar</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time scanner tracking where capital is contracting, credit is tightening, and forced deleveraging risk is rising.
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-red" />
          <span>Active Scans: 25 Asset classes</span>
        </div>
      </div>

      {/* Overview Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-bg-card border border-gray-855 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Global Drain Pressure</span>
            <h3 className="text-2xl font-extrabold font-mono text-brand-red mt-1">{drainData.global_drain_score.toFixed(1)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Weighted duration flattener spread z-scores.</p>
          </div>
          <TrendingDown className="w-9 h-9 text-brand-red/35" />
        </div>
        {/* Card 2 */}
        <div className="bg-bg-card border border-gray-855 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Offshore USD Stress (Basis)</span>
            <h3 className="text-2xl font-extrabold font-mono text-brand-yellow mt-1">{drainData.dollar_stress.toFixed(1)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Cross-currency basis swap tightness rating.</p>
          </div>
          <AlertTriangle className="w-9 h-9 text-brand-yellow/30" />
        </div>
        {/* Card 3 */}
        <div className="bg-bg-card border border-gray-855 rounded-xl p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Carry Unwind Risk Status</span>
            <h3 className="text-2xl font-extrabold font-mono text-purple-400 mt-1">{drainData.carry_unwind_warning}</h3>
            <p className="text-[10px] text-gray-400 mt-1">JPY volatility spreads & JGB yield signals.</p>
          </div>
          <ShieldAlert className="w-9 h-9 text-purple-500/30" />
        </div>
      </div>

      {/* Main Grid: Assets Table (8 cols) vs Red Suction Map (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Table of Draining Assets (8 cols) */}
        <div className="lg:col-span-8 bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-gray-900 pb-3">
            <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">Assets Undergoing Liquidity Drain</h3>
            <span className="text-[9px] font-mono text-gray-500 bg-gray-950 px-2 py-0.5 rounded">
              Indicators: QT + High Real Yields + Outflows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="border-b border-gray-850 text-gray-550 font-mono text-[9px] uppercase">
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3 text-center">Score</th>
                  <th className="py-2.5 px-3">Drain Category</th>
                  <th className="py-2.5 px-3">Primary Source of Drain</th>
                  <th className="py-2.5 px-3 text-center">Percentile</th>
                  <th className="py-2.5 px-3 text-right">Confirm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {drainData.draining_assets.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-900/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-gray-200">{a.name}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-white">{a.score.toFixed(1)}</td>
                    <td className="py-3 px-3">
                      <LiquidityDrainBadge label={a.label} />
                    </td>
                    <td className="py-3 px-3 text-gray-400 font-sans max-w-xs truncate">{a.source}</td>
                    <td className="py-3 px-3 text-center font-mono text-gray-400">{a.percentile.toFixed(0)}%</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {a.is_confirmed ? (
                        <span className="text-brand-red font-bold uppercase text-[9px]">CONFIRMED</span>
                      ) : (
                        <span className="text-brand-yellow uppercase text-[9px]">EARLY</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Red Suction Map (4 cols) */}
        <div className="lg:col-span-4 bg-bg-card border border-gray-850 rounded-xl p-5 flex flex-col h-[400px]">
          <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="text-brand-red w-4 h-4 animate-pulse" />
            <span>USD Safety Suction Map</span>
          </h3>
          <p className="text-[11px] text-gray-450 leading-relaxed mb-4">
            Animates flow directions during deleveraging spikes. Money is pulled away from high-leverage risk nodes into the USD safety center.
          </p>

          <div className="flex-1 relative border border-gray-900 bg-gray-955/20 rounded-xl flex items-center justify-center p-2">
            <svg 
              className="w-full h-full overflow-visible" 
              viewBox="0 0 450 380"
            >
              <defs>
                <pattern id="grid-drain" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect width="20" height="20" fill="none" />
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(239, 68, 68, 0.015)" strokeWidth="1" />
                </pattern>
                <marker id="suction-arrow" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 10 1.5 L 2 5 L 10 8.5 z" fill="#EF4444" />
                </marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-drain)" className="rounded-xl pointer-events-none" />

              {/* Draw red inward suction lines */}
              {suctionNodes.filter(n => !n.isCenter).map((node) => {
                const center = suctionNodes.find(n => n.isCenter)!;
                const pathD = `M ${node.x} ${node.y} Q ${(node.x+center.x)/2} ${(node.y+center.y)/2 - 10} ${center.x} ${center.y}`;
                return (
                  <g key={node.id}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth={1.5}
                      strokeOpacity={0.25}
                      markerEnd="url(#suction-arrow)"
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="4 20"
                      className="animate-flow-dash-reverse pointer-events-none"
                    />
                  </g>
                );
              })}

              {/* Draw nodes */}
              {suctionNodes.map((node) => {
                const isCenter = node.isCenter;
                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    {isCenter ? (
                      <>
                        <circle r="22" fill="none" stroke="#EF4444" strokeWidth="1" className="animate-ping opacity-25" />
                        <circle r="12" fill="#111827" stroke="#EF4444" strokeWidth="2.5" />
                      </>
                    ) : (
                      <circle r="6" fill="#1f2937" stroke="#ffa726" strokeWidth="2" />
                    )}
                    <text
                      y={isCenter ? 25 : 15}
                      textAnchor="middle"
                      className={`text-[8.5px] font-mono font-bold ${isCenter ? "fill-white" : "fill-gray-400"}`}
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom: Sovereigns Under Capital Outflow Pressure */}
      <div className="bg-bg-card border border-gray-855 rounded-xl p-6 shadow-md">
        <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-900 pb-3">
          Sovereigns Under Capital Outflow Pressure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {drainData.draining_countries.map((c: any) => (
            <div key={c.id} className="bg-gray-955/40 border border-gray-900 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl select-none">{c.flag}</span>
                  <span className="font-bold text-white">{c.name}</span>
                </div>
                <span className="text-[10px] text-brand-red font-bold uppercase">{c.label}</span>
              </div>
              <div className="space-y-1.5 border-t border-gray-900 pt-2.5 text-[11px] text-gray-400">
                <div className="flex justify-between">
                  <span>Sovereign Score:</span>
                  <span className="text-white font-bold">{c.score.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reserve Drawdown:</span>
                  <span className="text-brand-red font-bold">-{c.reserve_decline.toFixed(1)}B</span>
                </div>
                <div className="flex justify-between">
                  <span>Currency Pressure:</span>
                  <span className="text-brand-yellow font-semibold">{c.currency_pressure}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
