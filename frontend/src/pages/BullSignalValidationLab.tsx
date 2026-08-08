import React, { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { 
  Play, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  Database,
  BarChart3,
  Calendar,
  Layers,
  Search,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import DataQualityBadge from "../components/DataQualityBadge";

export default function BullSignalValidationLab() {
  const [signal, setSignal] = useState("Global Liquidity Pulse");
  const [asset, setAsset] = useState("S&P 500");
  const [window, setWindow] = useState("6M");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    "Bitcoin / Crypto",
    "Copper",
    "Crude Oil"
  ];

  const windows = ["1M", "3M", "6M", "12M"];

  const runValidation = async () => {
    setLoading(true);
    try {
      const url = `/api/backtest/bull-signals?signal_name=${encodeURIComponent(signal)}&asset_name=${encodeURIComponent(asset)}&forward_window=${window}`;
      const response = await fetch(url);
      const resData = await response.json();
      setData(resData);
    } catch (e) {
      console.error("Failed to run bull signal validation backtest", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    runValidation();
  }, [signal, asset, window]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="text-brand-green w-6 h-6 animate-pulse" />
            <span>Bull Signal Validation Lab</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Backtest the forward predictive success of liquidity, credit, currency, and carry signals against global asset classes.
          </p>
        </div>

        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-green" />
          <span>Calibrated: 2000 - 2026 (Monthly scans)</span>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-md">
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-500 uppercase block">1. Select Macro Signal</label>
          <select 
            value={signal} 
            onChange={(e) => setSignal(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 text-xs text-white rounded-lg p-2.5 focus:border-brand-green focus:outline-none font-mono"
          >
            {signals.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-500 uppercase block">2. Select Target Asset</label>
          <select 
            value={asset} 
            onChange={(e) => setAsset(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 text-xs text-white rounded-lg p-2.5 focus:border-brand-green focus:outline-none font-mono"
          >
            {assets.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-500 uppercase block">3. Forward Period Window</label>
          <select 
            value={window} 
            onChange={(e) => setWindow(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 text-xs text-white rounded-lg p-2.5 focus:border-brand-green focus:outline-none font-mono"
          >
            {windows.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Banner showing Definitions */}
      <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-gray-300">
        <Info className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white block font-mono">LAB VALIDATION PARAMETERS</span>
          <p>
            An **Equity Bull Run** is defined as a forward 6-month return &gt; 12% with a max drawdown &lt; 10%. A **Strong Equity Bull Run** requires a forward 12-month return &gt; 20% with a max drawdown &lt; 15%. A **Liquidity Drain** fires when the Flow Pulse Score falls below 40 and continues falling for 4 consecutive weeks.
          </p>
        </div>
      </div>

      {/* Main Results Grid */}
      {loading || !data ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: Validation Scoreboard & returns table (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Scoreboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
                <span className="text-[9px] font-mono text-gray-500 uppercase block">Samples Scanned</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">{data.sample_size} months</span>
              </div>
              <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
                <span className="text-[9px] font-mono text-gray-500 uppercase block">Forward Hit Rate</span>
                <span className="text-xl font-bold font-mono text-brand-green mt-1 block">{data.hit_rate}%</span>
              </div>
              <div className="bg-bg-card border border-gray-855 rounded-xl p-5 shadow-md">
                <span className="text-[9px] font-mono text-gray-500 uppercase block">Average Return</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">{data.avg_return}%</span>
              </div>
              <div className="bg-bg-card border border-gray-855 rounded-xl p-5 shadow-md">
                <span className="text-[9px] font-mono text-gray-500 uppercase block">Max Drawdown</span>
                <span className="text-xl font-bold font-mono text-brand-red mt-1 block">{data.max_drawdown}%</span>
              </div>
            </div>

            {/* 2. Forward Return Table */}
            <div className="bg-bg-card border border-gray-850 rounded-xl overflow-hidden shadow-md">
              <div className="p-5 border-b border-gray-800/60">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Forward Performance Summary</h3>
              </div>
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 font-mono bg-gray-900/10 text-[10px] uppercase">
                    <th className="py-3 px-4 font-semibold">Forward Horizon</th>
                    <th className="py-3 px-4 font-semibold text-center">Predictive Hit Rate</th>
                    <th className="py-3 px-4 font-semibold text-center">Average Return</th>
                    <th className="py-3 px-4 font-semibold text-right">Max Drawdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {data.forward_returns.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-900/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-250">{row.period}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-brand-green">{row.hit_rate}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">{row.avg_return}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-brand-red">{row.max_drawdown}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Right panel: Event study & historical cases (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Returns Distribution Chart */}
            <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">Return Probability Distribution</h3>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.returns_distribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="bucket" stroke="#6b7280" style={{ fontSize: 7, fontFamily: "monospace" }} />
                    <YAxis stroke="#6b7280" tickLine={false} style={{ fontSize: 7, fontFamily: "monospace" }} />
                    <Bar dataKey="frequency" fill="#10B981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Historical Examples explainability */}
            <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md space-y-4">
              <div className="border-b border-gray-800 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-mono text-gray-500 uppercase block">Backtest Audit</span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Reliability Rating: {data.confidence_level}</span>
                </div>
                <DataQualityBadge status="Green" />
              </div>

              <div className="text-xs space-y-3 leading-relaxed">
                <div className="p-3 bg-brand-green/5 border border-brand-green/10 rounded-lg">
                  <span className="text-[8px] font-mono text-brand-green uppercase font-bold block mb-1">➜ Best Historical Case</span>
                  <p className="text-gray-300 mt-0.5 leading-snug font-sans">{data.best_historical_example}</p>
                </div>
                
                <div className="p-3 bg-brand-red/5 border border-brand-red/10 rounded-lg">
                  <span className="text-[8px] font-mono text-brand-red uppercase font-bold block mb-1">➜ Worst Historical Failure</span>
                  <p className="text-gray-300 mt-0.5 leading-snug font-sans">{data.worst_historical_example}</p>
                </div>
              </div>

              <div className="border-t border-gray-900 pt-3 text-[9px] font-mono text-gray-500">
                {data.data_limitations}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
