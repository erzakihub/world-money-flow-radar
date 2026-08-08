import React, { useState, useEffect } from "react";
import { Shield, Database, Activity } from "lucide-react";
import DataQualityBadge from "../components/DataQualityBadge";

export default function SmartMoneyExitMonitor() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/flow-pulse/smart-money");
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="text-purple-400 w-6 h-6 animate-pulse" />
            <span>Smart Money Exit Monitor</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Identify when institutional asset managers, sovereign funds, and corporate insiders are net distributing equity holdings.
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-purple-400" />
          <span>Exit Scanners Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Confirmation Score</span>
            <h3 className="text-3xl font-extrabold font-mono text-white mt-1">{data.score}</h3>
            <p className="text-[10px] text-gray-400 mt-1 font-mono">{data.status}</p>
          </div>
          <Activity className="w-9 h-9 text-purple-500/25 self-end" />
        </div>

        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase block">Insider Sell/Buy Ratio</span>
            <h3 className="text-3xl font-extrabold font-mono text-brand-red mt-1">{data.insider_sell_buy_ratio}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Transaction counts over a rolling 30-day window.</p>
          </div>
          <Activity className="w-9 h-9 text-brand-red/25 self-end" />
        </div>
      </div>

      <div className="bg-bg-card border border-gray-855 rounded-xl p-6 shadow-md">
        <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-900 pb-3">
          Institutional Outflow Proxy Analysis
        </h3>
        <div className="p-4 bg-gray-955/40 border border-gray-900 rounded-xl text-xs font-mono leading-relaxed text-gray-300">
          {data.institutional_outflow_proxy}
        </div>
      </div>
    </div>
  );
}
