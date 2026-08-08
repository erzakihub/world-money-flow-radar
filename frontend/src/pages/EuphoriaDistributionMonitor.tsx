import React, { useState, useEffect } from "react";
import { AlertTriangle, Database, Info } from "lucide-react";
import DataQualityBadge from "../components/DataQualityBadge";

export default function EuphoriaDistributionMonitor() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/flow-pulse/euphoria-monitor");
        const resData = await response.json();
        setData(resData || {});
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-yellow"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="text-brand-yellow w-6 h-6 animate-pulse" />
            <span>Euphoria & Distribution Monitor</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Identify late-stage market melt-ups, valuation stretch, options speculative chase, and index concentration risks.
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-yellow" />
          <span>Euphoria Scanners Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
          <span className="text-[10px] font-mono text-gray-500 uppercase block">Euphoria Score</span>
          <h3 className="text-3xl font-extrabold font-mono text-brand-yellow mt-1">{data.score}</h3>
          <p className="text-[10px] text-gray-450 mt-1 font-mono">{data.status}</p>
        </div>

        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
          <span className="text-[10px] font-mono text-gray-500 uppercase block">Valuation Stretch Index</span>
          <h3 className="text-3xl font-extrabold font-mono text-white mt-1">{data.valuation_stretch}%</h3>
          <p className="text-[10px] text-gray-450 mt-1">Percentile vs 25-year historical average.</p>
        </div>

        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
          <span className="text-[10px] font-mono text-gray-500 uppercase block">Mega-Cap Concentration</span>
          <h3 className="text-3xl font-extrabold font-mono text-white mt-1">{data.concentration_index}%</h3>
          <p className="text-[10px] text-gray-450 mt-1">Top 5 assets weight in composite indices.</p>
        </div>
      </div>

      <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md">
        <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-900 pb-3">
          Breadth Divergence Audit
        </h3>
        <p className="text-xs text-brand-yellow bg-brand-yellow/5 border border-brand-yellow/20 rounded-xl p-4 leading-relaxed font-mono">
          {data.breadth_divergence}
        </p>
      </div>
    </div>
  );
}
