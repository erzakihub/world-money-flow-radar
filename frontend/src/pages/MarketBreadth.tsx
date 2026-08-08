import React, { useState, useEffect } from "react";
import { Activity, ShieldAlert, CheckCircle, RefreshCw, BarChart, Info } from "lucide-react";

export default function MarketBreadth() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchBreadth = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/market/overview");
      const resData = await response.json();
      setData(resData);
    } catch (e) {
      console.error("Failed to fetch market breadth overview", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBreadth();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 text-brand-green animate-spin" />
        <span className="text-xs font-mono text-gray-500">Retrieving index breadth aggregates...</span>
      </div>
    );
  }

  const { advances, declines, market_regime, pct_above_200dma, date } = data;
  const advancesPct = (advances / (advances + declines)) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-sm font-heading font-extrabold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-green" />
            <span>Nifty / Sensex Market Breadth Registry</span>
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Real-time calculations of index internal momentum, percentage above 200 DMA, and advance/decline indicators.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* DMA 200 Breadth visual gauge */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
          <h3 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold border-b border-gray-850 pb-2.5">
            200 DMA Universe Health
          </h3>

          <div className="flex flex-col items-center justify-center py-6">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Circular Gauge outline */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="60" stroke="#1f2937" strokeWidth="6" fill="transparent" />
                <circle 
                  cx="72" 
                  cy="72" 
                  r="60" 
                  stroke="#3b82f6" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * pct_above_200dma) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-xl font-bold text-white font-mono">{pct_above_200dma}%</span>
                <span className="text-[7px] text-gray-500 font-mono block uppercase mt-0.5">Above 200 DMA</span>
              </div>
            </div>
          </div>
          <span className="text-[8px] font-mono text-gray-600 block text-center leading-relaxed">
            Values &gt; 80% indicate aggressive risk-on expansion, while values &lt; 40% signal deep correction regimes.
          </span>
        </div>

        {/* Advances Declines split */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
          <h3 className="text-[10px] font-mono text-brand-green uppercase tracking-widest font-bold border-b border-gray-850 pb-2.5">
            Advances / Declines Split
          </h3>

          <div className="space-y-4 py-3">
            <div className="flex justify-between items-baseline font-mono text-xs">
              <div>
                <span className="text-[8px] text-gray-500 uppercase block">Advances</span>
                <span className="text-lg font-bold text-brand-green">{advances} stocks</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-gray-500 uppercase block">Declines</span>
                <span className="text-lg font-bold text-brand-red">{declines} stocks</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden flex">
                <div className="h-full bg-brand-green" style={{ width: `${advancesPct}%` }} />
                <div className="h-full bg-brand-red" style={{ width: `${100 - advancesPct}%` }} />
              </div>
              <div className="flex justify-between text-[8px] font-mono text-gray-500">
                <span>{advancesPct.toFixed(0)}% green</span>
                <span>{(100 - advancesPct).toFixed(0)}% red</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stance Regime details */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
          <h3 className="text-[10px] font-mono text-brand-yellow uppercase tracking-widest font-bold border-b border-gray-850 pb-2.5">
            Active Regime Stance Details
          </h3>

          <div className="space-y-3.5 text-[11px] text-gray-400">
            <div className="flex items-start gap-2 bg-gray-950/40 p-2.5 rounded-lg border border-gray-900">
              <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-white block">Regime: {market_regime}</span>
                <span className="text-[9px] text-gray-500 font-mono block mt-1">
                  Breadth indicates stable price-actions. Quality compounders show persistent outperformance.
                </span>
              </div>
            </div>

            <div className="flex gap-2 p-1 text-[10px] text-gray-500">
              <Info className="w-4 h-4 text-gray-600 shrink-0" />
              <span>
                Calculated on daily Adjusted Prices. Indexes revalued weekly. Last updated: {date}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
