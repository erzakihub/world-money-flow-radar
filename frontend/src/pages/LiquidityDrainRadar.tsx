import React, { useState, useEffect } from "react";
import { ShieldAlert, Database, ArrowRight, ArrowUpRight, TrendingDown } from "lucide-react";
import DataQualityBadge from "../components/DataQualityBadge";
import LiquidityDrainBadge from "../components/LiquidityDrainBadge";

export default function LiquidityDrainRadar() {
  const [drainData, setDrainData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrain = async () => {
      try {
        const response = await fetch("/api/liquidity-drain/global");
        const data = await response.json();
        setDrainData(data || {});
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchDrain();
  }, []);

  if (loading || !drainData) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-red"></div>
      </div>
    );
  }

  const { draining_countries = [], draining_assets = [] } = drainData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-brand-red w-6 h-6 animate-pulse" />
            <span>Liquidity Drain Radar</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Identify capital suction events, dollar short squeezes, and macro-driven market exits.
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-red" />
          <span>Suction Feeds Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card border border-brand-red/20 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-550 uppercase">Global Drain Score</span>
            <h3 className="text-3xl font-extrabold font-mono text-brand-red mt-1">{drainData.global_drain_score}</h3>
            <p className="text-[10px] text-gray-450 mt-1 font-mono">{drainData.regime}</p>
          </div>
          <TrendingDown className="w-9 h-9 text-brand-red/30 self-end" />
        </div>

        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-550 uppercase">DXY Index</span>
            <h3 className="text-3xl font-extrabold font-mono text-white mt-1">{drainData.dxy_index}</h3>
            <p className="text-[10px] text-gray-450 mt-1">Sustained dollar strength sucks offshore capital.</p>
          </div>
          <TrendingDown className="w-9 h-9 text-brand-yellow/20 self-end" />
        </div>

        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-gray-550 uppercase">Swap Line Volume</span>
            <h3 className="text-3xl font-extrabold font-mono text-white mt-1">{drainData.swap_lines}B</h3>
            <p className="text-[10px] text-gray-450 mt-1">Fed swap line drawdowns proxy funding stress.</p>
          </div>
          <TrendingDown className="w-9 h-9 text-brand-blue/20 self-end" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md">
          <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-900 pb-3 flex justify-between items-center">
            <span>Draining Asset Classes</span>
            <span className="text-[9px] font-mono text-brand-red font-bold bg-brand-red/10 px-2 py-0.5 rounded border border-brand-red/20">OUTFLOW</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-850 text-gray-550 font-mono text-[9px] uppercase">
                  <th className="py-2.5 px-2">Asset Class</th>
                  <th className="py-2.5 px-2 text-center">Suction</th>
                  <th className="py-2.5 px-2 text-center">Exit Signal</th>
                  <th className="py-2.5 px-2">Primary Warning Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {draining_assets.map((a: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-900/40">
                    <td className="py-3 px-2 font-semibold text-gray-200">{a.asset}</td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-brand-red">{a.suction_score}</td>
                    <td className="py-3 px-2 text-center">
                      <LiquidityDrainBadge label={a.severity} />
                    </td>
                    <td className="py-3 px-2 text-gray-400">{a.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md">
          <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-4 border-b border-gray-900 pb-3 flex justify-between items-center">
            <span>Draining Countries</span>
            <span className="text-[9px] font-mono text-brand-red font-bold bg-brand-red/10 px-2 py-0.5 rounded border border-brand-red/20">FX DECREASE</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-850 text-gray-550 font-mono text-[9px] uppercase">
                  <th className="py-2.5 px-2">Country / Region</th>
                  <th className="py-2.5 px-2 text-center">FX Loss</th>
                  <th className="py-2.5 px-2 text-center">Severity</th>
                  <th className="py-2.5 px-2">Reserve Drawdown Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {draining_countries.map((c: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-900/40">
                    <td className="py-3 px-2 font-semibold text-gray-200">{c.country}</td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-brand-red">{c.fx_loss_est}</td>
                    <td className="py-3 px-2 text-center">
                      <LiquidityDrainBadge label={c.severity} />
                    </td>
                    <td className="py-3 px-2 text-gray-400">{c.trigger}</td>
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
