import React, { useState, useEffect } from "react";
import { Network, Database, Info, Activity } from "lucide-react";
import DataQualityBadge from "../components/DataQualityBadge";

export default function LiquidityTransmissionLab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/flow-pulse/transmission-lab");
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="text-brand-green w-6 h-6 animate-pulse" />
            <span>Liquidity Transmission Lab</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit if central bank easing is successfully translating into private bank credit, loan growth, and commercial borrowing.
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-green" />
          <span>Transmission Channels Active</span>
        </div>
      </div>

      <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-gray-300">
        <Info className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block font-mono">WHY TRANSMISSION IS CRITICAL</span>
          <p className="mt-1">
            Central bank asset injections (Creation) alone do not fuel bull markets. To drive asset valuations, liquidity must transmit via commercial bank lending sheets into business investments and retail savings cushions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Transmission Score</span>
            <h3 className="text-3xl font-extrabold font-mono text-white mt-1">{data.score}</h3>
            <p className="text-[10px] text-gray-400 mt-1 font-mono">{data.status}</p>
          </div>
          <Activity className="w-9 h-9 text-brand-green/35 self-end" />
        </div>

        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">US High-Yield Spread</span>
            <h3 className="text-3xl font-extrabold font-mono text-white mt-1">{data.credit_spread_us}%</h3>
            <p className="text-[10px] text-gray-400 mt-1">Corporate credit spread vs Treasuries.</p>
          </div>
          <Activity className="w-9 h-9 text-brand-yellow/30 self-end" />
        </div>

        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Cross-Currency Basis Swap (USDJPY)</span>
            <h3 className="text-3xl font-extrabold font-mono text-brand-red mt-1">{data.eurodollar_basis}bp</h3>
            <p className="text-[10px] text-gray-400 mt-1">Offshore USD funding stress proxy.</p>
          </div>
          <Activity className="w-9 h-9 text-brand-red/30 self-end" />
        </div>
      </div>

      <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md">
        <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-900 pb-3">
          Causality Analysis
        </h3>
        <div className="text-sm text-gray-300 space-y-4">
          <div className="p-3 bg-gray-955/40 rounded-xl border border-gray-900 leading-relaxed font-sans">
            <span className="text-[8px] font-mono text-gray-500 uppercase block font-bold">Transmission details</span>
            <p className="mt-1">{data.details}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
