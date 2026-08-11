import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ChevronRight, 
  ShieldAlert, 
  Layers, 
  RefreshCw,
  Search,
  Zap,
  Target,
  BarChart2,
  Sliders,
  Sparkles,
  Database,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [regimeData, setRegimeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [resOverview, resRegime] = await Promise.all([
        fetch("/api/market/overview"),
        fetch("/api/market/regime")
      ]);
      const resData = await resOverview.json();
      const regData = await resRegime.json();
      setData(resData);
      setRegimeData(regData);
    } catch (e) {
      console.error("Failed to fetch market overview in dashboard", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-spin">
          <RefreshCw className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="text-xs font-mono text-gray-400">Syncing Indian Equity Quant Database...</span>
      </div>
    );
  }

  const { advances, declines, market_regime, pct_above_200dma, top_gainers, top_losers, total_active_stocks, mainboard_count, sme_count, date, stocks = [] } = data;
  const adaptiveWeights = regimeData?.adaptive_weights || { quality: 0.3, growth: 0.25, value: 0.15, momentum: 0.2, risk: 0.1 };

  const sectorData = stocks.reduce((acc: any, stock: any) => {
    if (!stock.sector) return acc;
    if (!acc[stock.sector]) acc[stock.sector] = { total: 0, count: 0 };
    acc[stock.sector].total += (stock.change_pct || stock.change || 0);
    acc[stock.sector].count += 1;
    return acc;
  }, {});
  
  const sectors = Object.entries(sectorData)
    .map(([sector, d]: any) => ({
      sector,
      ret: d.total / d.count
    }))
    .sort((a, b) => b.ret - a.ret);

  const factorPerformance = Object.entries(adaptiveWeights).map(([factor, weight]: any) => {
    // Simulated daily performance indicator based on adaptive weight
    const simRet = (weight * 10) - 1.5; 
    return {
      name: factor,
      weight,
      simRet,
      isWinning: simRet > 0
    };
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Top Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0d121f] via-[#111827] to-[#0a0d16] border border-gray-800/60 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-2xl shadow-black/40">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              NSE / BSE Live Quant Feed
            </span>
            <span className="text-[10px] text-gray-400 font-mono">Date: {date}</span>
          </div>
          <h2 className="text-2xl font-heading font-black text-white tracking-wide">
            Indian Equity Quant Intelligence Platform
          </h2>
          <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
            Institutional multi-factor ranking engine scanning 20+ years of NSE/BSE corporate filings, point-in-time ratio histories, and sector-neutralized Z-scores.
          </p>
        </div>

        <button 
          onClick={fetchOverview}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl cursor-pointer transition-all duration-200 shadow-md shadow-emerald-500/5 relative z-10 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Terminal Stats
        </button>
      </div>

      {/* Market Regime & Adaptive Weight Banner */}
      <div className="bg-[#0e121e] border border-gray-800/60 p-5 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-gray-400 font-semibold tracking-wider">Dynamic Market Regime</span>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                  {regimeData?.regime || "NEUTRAL_BALANCED"}
                </span>
              </div>
              <p className="text-xs text-gray-300 font-medium mt-0.5">
                {regimeData?.description || "Balanced market conditions. Standard multi-factor weighting applies."}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-wider">Market Breadth</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              {regimeData?.pct_above_200dma || pct_above_200dma}% &gt; 200 DMA
            </span>
          </div>
        </div>

        {/* Adaptive Factor Weights Display */}
        <div className="mt-4">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-2 font-semibold">
            Adaptive Factor Allocation Weights (Current Market State):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(adaptiveWeights).map(([factor, weight]: any) => (
              <div key={factor} className="bg-[#090b12] border border-gray-800/40 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-300 capitalize">{factor}</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {Math.round(weight * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Factor Performance Cards */}
        <div className="mt-6 border-t border-gray-800/50 pt-5">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-3 font-semibold">
            Factor Performance Today (Simulated based on adaptive weights)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {factorPerformance.map((f: any) => (
              <div key={f.name} className={`bg-[#090b12] border p-3 rounded-xl flex flex-col justify-between min-h-[70px] ${f.isWinning ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                <span className="text-[11px] font-medium text-gray-300 capitalize">{f.name}</span>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs font-mono font-bold ${f.isWinning ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {f.simRet > 0 ? '+' : ''}{f.simRet.toFixed(2)}%
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">W: {Math.round(f.weight * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Advances / Declines */}
        <div className="bg-[#0e121e] border border-gray-800/50 p-4 rounded-xl flex flex-col justify-between min-h-[115px]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-semibold">
            Advances / Declines Ratio
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-400 font-mono">{advances}</span>
            <span className="text-xs text-gray-500">A</span>
            <span className="text-gray-600 font-bold">/</span>
            <span className="text-xl font-bold text-rose-400 font-mono">{declines}</span>
            <span className="text-xs text-gray-500">D</span>
          </div>
          <div className="w-full bg-gray-950 h-3 rounded-full overflow-hidden mt-3 flex border border-gray-800/40 shadow-inner">
            <div className="h-full bg-emerald-500/80 transition-all duration-1000 ease-out" style={{ width: `${(advances / (advances + declines || 1)) * 100}%` }} />
            <div className="h-full bg-rose-500/80 transition-all duration-1000 ease-out" style={{ width: `${(declines / (advances + declines || 1)) * 100}%` }} />
          </div>
          <div className="mt-2 text-center text-xs font-mono font-bold text-gray-400">
             Ratio: {(advances / (declines || 1)).toFixed(2)}x
          </div>
        </div>

        {/* % Above 200 DMA */}
        <div className="bg-[#0e121e] border border-gray-800/50 p-4 rounded-xl flex flex-col justify-between min-h-[115px]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-semibold">
            Health (% &gt; 200 DMA)
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-cyan-400 font-mono">{pct_above_200dma}%</span>
          </div>
          <span className="text-[9px] font-mono text-gray-500 block mt-2">Trend Strength Metric</span>
        </div>

        {/* Mainboard Coverage */}
        <div className="bg-[#0e121e] border border-gray-800/50 p-4 rounded-xl flex flex-col justify-between min-h-[115px]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-semibold">
            Mainboard Equities
          </span>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white font-mono">{mainboard_count}</span>
            <span className="text-[9px] font-mono text-gray-500 block mt-1">NSE & BSE Listings</span>
          </div>
        </div>

        {/* SME Listings */}
        <div className="bg-[#0e121e] border border-gray-800/50 p-4 rounded-xl flex flex-col justify-between min-h-[115px]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-semibold">
            SME Platform Listings
          </span>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-purple-400 font-mono">{sme_count}</span>
            <span className="text-[9px] font-mono text-gray-500 block mt-1">High-Alpha Small Caps</span>
          </div>
        </div>
      </div>

      {/* Gainers / Losers Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top Gainers */}
        <div className="bg-[#0e121e] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-800/60 pb-3 mb-4">
            <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-2 font-bold">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Top Gainers (Universe)</span>
            </h4>
            <span className="text-[9px] font-mono text-gray-500">Sorted by % Return</span>
          </div>

          <div className="space-y-2">
            {top_gainers?.map((g: any) => (
              <div key={g.symbol} className="flex justify-between items-center p-3 bg-[#080a11] border border-gray-800/40 rounded-xl hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white font-mono block">{g.symbol}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white font-mono block">₹{g.close ? g.close.toLocaleString() : (g.price ? g.price.toLocaleString() : "-")}</span>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">
                    +{g.change_pct ? g.change_pct : g.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-[#0e121e] border border-gray-800/50 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-800/60 pb-3 mb-4">
            <h4 className="text-xs font-mono text-rose-400 uppercase tracking-widest flex items-center gap-2 font-bold">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span>Top Losers (Universe)</span>
            </h4>
            <span className="text-[9px] font-mono text-gray-500">Sorted by % Return</span>
          </div>

          <div className="space-y-2">
            {top_losers?.map((l: any) => (
              <div key={l.symbol} className="flex justify-between items-center p-3 bg-[#080a11] border border-gray-800/40 rounded-xl hover:border-rose-500/30 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white font-mono block">{l.symbol}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white font-mono block">₹{l.close ? l.close.toLocaleString() : (l.price ? l.price.toLocaleString() : "-")}</span>
                  <span className="text-[10px] text-rose-400 font-bold font-mono">
                    {l.change_pct ? l.change_pct : l.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Performance Heatmap */}
      {sectors.length > 0 && (
        <div className="bg-[#0e121e] border border-gray-800/50 p-5 rounded-2xl shadow-xl mt-6">
          <h4 className="text-xs font-mono text-gray-300 uppercase tracking-widest flex items-center gap-2 font-bold mb-4">
            <Layers className="w-4 h-4 text-brand-blue" />
            <span>Sector Performance Heatmap</span>
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sectors.map((s: any) => {
              const isPositive = s.ret > 0;
              // color intensity based on magnitude (cap at 3%)
              const intensity = Math.min(Math.abs(s.ret) / 3, 1);
              let bgStyle = isPositive 
                ? `rgba(16, 185, 129, ${0.1 + intensity * 0.3})`
                : `rgba(244, 63, 94, ${0.1 + intensity * 0.3})`;
              let borderStyle = isPositive 
                ? `rgba(16, 185, 129, ${0.3 + intensity * 0.3})`
                : `rgba(244, 63, 94, ${0.3 + intensity * 0.3})`;

              return (
                <div 
                  key={s.sector} 
                  className="p-3 rounded-xl border flex flex-col justify-between min-h-[80px]"
                  style={{ backgroundColor: bgStyle, borderColor: borderStyle }}
                >
                  <span className="text-[10px] font-bold text-white leading-tight break-words">{s.sector}</span>
                  <span className={`text-xs font-mono font-bold mt-2 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? '+' : ''}{s.ret.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
