import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Database, 
  HelpCircle, 
  Play, 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  XCircle,
  TrendingUp
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from "recharts";
import DataQualityBadge from "../components/DataQualityBadge";

const signals = [
  "Global Liquidity Pulse",
  "Fed Net Liquidity",
  "China Credit Impulse",
  "US Real Yields",
  "DXY Dollar Trend",
  "Yield Curve Regime",
  "India DII + SIP flows",
  "RBI liquidity + Credit",
  "Yen Carry Unwind Signal",
  "Reserve Growth / CA"
];

const assets = [
  "S&P 500",
  "Nasdaq 100",
  "Nifty 50",
  "China CSI 300",
  "US Treasuries (TLT)",
  "Gold (Spot/GLD)",
  "Bitcoin / Crypto"
];

const horizons = ["1M", "3M", "6M", "12M"];

export default function BacktestValidationLab() {
  const [selectedSignal, setSelectedSignal] = useState(signals[0]);
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [selectedHorizon, setSelectedHorizon] = useState(horizons[2]); // 6M
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/backtest/validation-lab?signal_name=${encodeURIComponent(selectedSignal)}&asset_name=${encodeURIComponent(selectedAsset)}&forward_window=${selectedHorizon}`
      );
      const data = await response.json();
      setResults(data || {});
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    runBacktest();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="text-brand-green w-6 h-6 animate-pulse" />
            <span>Bull Signal Validation Lab</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Institutional walk-forward validation matrix. Out-of-sample backtesting across 26 years of historical macro regimes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataQualityBadge status="Live" />
          <span className="text-[10px] text-gray-500 font-mono bg-gray-900 border border-gray-850 px-2 py-0.5 rounded">
            Lookback: Jan 2000 – Present
          </span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 flex-1">
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-gray-550 uppercase tracking-widest block">Select Signal Indicator</label>
            <select
              value={selectedSignal}
              onChange={(e) => setSelectedSignal(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-xs text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-green focus:outline-none w-56"
            >
              {signals.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-gray-555 uppercase tracking-widest block">Select Asset Class</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-xs text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-green focus:outline-none w-48"
            >
              {assets.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-gray-555 uppercase tracking-widest block">Validation Window</label>
            <select
              value={selectedHorizon}
              onChange={(e) => setSelectedHorizon(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-xs text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-green focus:outline-none w-32"
            >
              {horizons.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={runBacktest}
          className="bg-brand-green hover:bg-emerald-600 text-gray-950 text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-brand-green/10 transition-all font-mono uppercase"
        >
          <Play className="w-3.5 h-3.5 fill-gray-955" />
          <span>RUN BACKTEST</span>
        </button>
      </div>

      {loading || !results ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main stats card grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4">
              <span className="text-[9px] font-mono text-gray-550 uppercase">Sample Triggers</span>
              <p className="text-xl font-bold font-mono text-white mt-1">{results.sample_size}</p>
            </div>
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4">
              <span className="text-[9px] font-mono text-gray-550 uppercase">Validation Hit Rate</span>
              <p className="text-xl font-bold font-mono text-brand-green mt-1">{results.hit_rate}%</p>
            </div>
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4">
              <span className="text-[9px] font-mono text-gray-550 uppercase">Average Return</span>
              <p className="text-xl font-bold font-mono text-white mt-1">+{results.avg_return}%</p>
            </div>
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4">
              <span className="text-[9px] font-mono text-gray-550 uppercase">Max Drawdown</span>
              <p className="text-xl font-bold font-mono text-brand-red mt-1">{results.max_drawdown}%</p>
            </div>
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4">
              <span className="text-[9px] font-mono text-gray-550 uppercase">Sharpe Ratio</span>
              <p className="text-xl font-bold font-mono text-white mt-1">{results.sharpe}</p>
            </div>
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4">
              <span className="text-[9px] font-mono text-gray-550 uppercase">Sortino Ratio</span>
              <p className="text-xl font-bold font-mono text-white mt-1">{results.sortino}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Col: Confusion Matrix & Distribution */}
            <div className="lg:col-span-6 space-y-6">
              {/* Confusion Matrix */}
              <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">Signal Confusion Matrix</h3>
                <div className="grid grid-cols-2 gap-3 font-mono text-xs text-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                    <span className="text-brand-green font-bold block text-sm">TRUE POSITIVE</span>
                    <span className="text-lg font-bold text-white mt-1 block">{(results.hit_rate * results.sample_size / 100).toFixed(0)}</span>
                    <p className="text-[9px] text-gray-500 mt-0.5">Asset rose as predicted.</p>
                  </div>
                  <div className="bg-brand-red/10 border border-brand-red/20 p-4 rounded-xl">
                    <span className="text-brand-red font-bold block text-sm">FALSE POSITIVE</span>
                    <span className="text-lg font-bold text-white mt-1 block">{(results.false_positive_rate * results.sample_size / 100).toFixed(0)}</span>
                    <p className="text-[9px] text-gray-500 mt-0.5">Signal fired, but asset fell.</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-850 p-4 rounded-xl opacity-60">
                    <span className="text-gray-400 font-bold block text-sm">TRUE NEGATIVE</span>
                    <span className="text-lg font-bold text-white mt-1 block">N/A</span>
                    <p className="text-[9px] text-gray-500 mt-0.5">Quiet cycles correctly avoided.</p>
                  </div>
                  <div className="bg-gray-900 border border-gray-850 p-4 rounded-xl opacity-60">
                    <span className="text-gray-400 font-bold block text-sm">FALSE NEGATIVE</span>
                    <span className="text-lg font-bold text-white mt-1 block">N/A</span>
                    <p className="text-[9px] text-gray-500 mt-0.5">Missed bull runs.</p>
                  </div>
                </div>
              </div>

              {/* Returns distribution */}
              <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">Returns Frequency Distribution</h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.returns_distribution} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="bin" stroke="#6b7280" tickLine={false} style={{ fontSize: 8, fontFamily: "monospace" }} />
                      <YAxis stroke="#6b7280" tickLine={false} style={{ fontSize: 8, fontFamily: "monospace" }} />
                      <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                      <Bar dataKey="frequency" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Col: Regime Breakdown & Multi Horizon table */}
            <div className="lg:col-span-6 space-y-6">
              {/* Regime Table */}
              <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">Regime-Wise Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-850 text-gray-550 font-mono text-[9px] uppercase">
                        <th className="py-2 px-1">Macro Regime</th>
                        <th className="py-2 px-1 text-center">Samples</th>
                        <th className="py-2 px-1 text-center">Hit Rate</th>
                        <th className="py-2 px-1 text-center">Avg Return</th>
                        <th className="py-2 px-1 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900">
                      {results.regime_breakdown.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-900/30">
                          <td className="py-2.5 px-1 font-semibold text-gray-300">{r.regime}</td>
                          <td className="py-2.5 px-1 text-center font-mono">{r.sample_size}</td>
                          <td className="py-2.5 px-1 text-center font-mono font-bold text-brand-green">{r.hit_rate}%</td>
                          <td className="py-2.5 px-1 text-center font-mono">{r.avg_return > 0 ? "+" : ""}{r.avg_return}%</td>
                          <td className="py-2.5 px-1 text-right">
                            <span className="text-[9px] font-mono text-brand-green bg-brand-green/10 px-1.5 py-0.5 rounded border border-brand-green/20">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Multi Horizon Return Profile */}
              <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
                <h3 className="text-xs font-mono text-gray-550 uppercase tracking-wider mb-4">Multi-Horizon Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-855 text-gray-550 font-mono text-[9px] uppercase">
                        <th className="py-2 px-1">Horizon Period</th>
                        <th className="py-2 px-1 text-center">Hit Rate</th>
                        <th className="py-2 px-1 text-center">Avg Return</th>
                        <th className="py-2 px-1 text-right">Max Drawdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900">
                      {results.forward_returns.map((f: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-900/30">
                          <td className="py-2.5 px-1 font-semibold text-gray-300">{f.period}</td>
                          <td className="py-2.5 px-1 text-center font-mono font-bold text-brand-green">{f.hit_rate}</td>
                          <td className="py-2.5 px-1 text-center font-mono text-white">{f.avg_return}</td>
                          <td className="py-2.5 px-1 text-right font-mono text-brand-red">{f.max_drawdown}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Warnings & Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-brand-red/5 border border-brand-red/20 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-gray-300">
              <ShieldAlert className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block font-mono">Worst Historical Failure Case</span>
                <p className="mt-1">{results.worst_historical_example}</p>
              </div>
            </div>

            <div className="bg-brand-green/5 border border-brand-green/20 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-gray-300">
              <CheckCircle2 className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block font-mono">Best Historical Success Case</span>
                <p className="mt-1">{results.best_historical_example}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/40 border border-gray-850 rounded-xl p-4 flex gap-3 text-xs text-gray-450 leading-relaxed font-mono">
            <Info className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-gray-400 block font-bold">WALK-FORWARD METHODOLOGY NOTE</span>
              <p className="mt-1">{results.data_limitations}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
