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
  ShieldAlert, 
  HelpCircle,
  Database,
  BarChart3,
  Calendar,
  Layers,
  Search,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

export default function SignalValidationLab() {
  const [signal, setSignal] = useState("Global Liquidity Impulse");
  const [asset, setAsset] = useState("S&P 500");
  const [window, setWindow] = useState("3M");
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const signals = [
    "Global Liquidity Impulse",
    "Fed Net Liquidity",
    "DXY weakness",
    "FPI inflow",
    "TIC buying",
    "Yen carry unwind"
  ];

  const assets = [
    "S&P 500",
    "Nifty",
    "Gold",
    "Copper",
    "US 10Y",
    "USD/JPY"
  ];

  const windows = ["1M", "3M", "6M"];

  const runValidation = async () => {
    setLoading(true);
    try {
      const url = `http://127.0.0.1:8000/api/backtest/signal-validation?signal_name=${encodeURIComponent(signal)}&asset_name=${encodeURIComponent(asset)}&forward_window=${window}`;
      const response = await fetch(url);
      const resData = await response.json();
      setData(resData);
    } catch (e) {
      console.error("Failed to run signal validation backtest", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    runValidation();
  }, [signal, asset, window]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="text-brand-green w-6 h-6 animate-pulse" />
            <span>Macro Signal Validation Lab</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Backtest the predictive power of macro liquidity indicators against primary asset classes over custom forward horizons.
          </p>
        </div>

        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-green" />
          <span>Ingested Samples: 2005 - 2026</span>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-md">
        
        {/* Signal Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-500 uppercase block">1. Select Macro Signal</label>
          <select 
            value={signal} 
            onChange={(e) => setSignal(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-brand-green/50 transition-colors"
          >
            {signals.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Asset Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-500 uppercase block">2. Target Asset Class</label>
          <select 
            value={asset} 
            onChange={(e) => setAsset(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-brand-green/50 transition-colors"
          >
            {assets.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Window Select */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono text-gray-500 uppercase block">3. Prediction Horizon</label>
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 text-xs">
            {windows.map(w => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`flex-1 py-1.5 rounded-md transition-colors duration-150 font-mono ${
                  window === w 
                    ? "bg-gray-800 text-white font-bold" 
                    : "text-gray-500 hover:text-white"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-[350px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Metrics Scoreboard Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Avg Return */}
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4.5 text-center shadow">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Avg {window} Return</span>
              <span className={`text-xl font-heading font-extrabold mt-2 block ${data.metrics.avg_return >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                {data.metrics.avg_return > 0 ? "+" : ""}{data.metrics.avg_return.toFixed(2)}%
              </span>
            </div>

            {/* Hit Rate */}
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4.5 text-center shadow">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Prediction Hit Rate</span>
              <span className="text-xl font-heading font-extrabold text-white mt-2 block">
                {data.metrics.hit_rate.toFixed(1)}%
              </span>
              <div className="w-16 bg-gray-800 h-1 rounded-full overflow-hidden mx-auto mt-2">
                <div 
                  className="h-full rounded-full bg-brand-green"
                  style={{ width: `${data.metrics.hit_rate}%` }}
                ></div>
              </div>
            </div>

            {/* Max Drawdown */}
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4.5 text-center shadow">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Max Avg Drawdown</span>
              <span className="text-xl font-heading font-extrabold text-brand-red mt-2 block">
                {data.metrics.max_drawdown.toFixed(2)}%
              </span>
            </div>

            {/* Sample Size */}
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4.5 text-center shadow">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">Trigger Sample Size</span>
              <span className="text-xl font-heading font-extrabold text-brand-blue mt-2 block">
                {data.metrics.sample_size} signals
              </span>
            </div>

            {/* False Signals */}
            <div className="bg-bg-card border border-gray-850 rounded-xl p-4.5 text-center shadow">
              <span className="text-[9px] font-mono text-gray-500 uppercase block">False Signals</span>
              <span className="text-xl font-heading font-extrabold text-gray-400 mt-2 block">
                {data.metrics.false_signals} triggers
              </span>
            </div>

          </div>

          {/* Graphics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 1. Event Study Path (7 cols) */}
            <div className="lg:col-span-7 bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4 flex justify-between items-center">
                  <span>Average Performance Trajectory (Day T-10 to T+30)</span>
                  <span className="text-gray-400 text-[10px]">T0 = Trigger Point</span>
                </h3>
                <div className="h-[210px] w-full bg-gray-950/20 rounded-xl border border-gray-900 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.event_study_path} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="day" stroke="#4b5563" fontSize={9} tickLine={false} />
                      <YAxis domain={["auto", "auto"]} stroke="#4b5563" fontSize={9} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ background: "#0c0d12", border: "1px solid #2a2b36", borderRadius: "6px" }}
                        labelStyle={{ color: "#6b7280", fontSize: "9px", fontFamily: "monospace" }}
                        itemStyle={{ color: "#10b981", fontSize: "10px" }}
                      />
                      <ReferenceLine x={0} stroke="#f59e0b" strokeWidth={1.5} label={{ value: "Trigger", fill: "#f59e0b", fontSize: 8, position: "insideTopRight" }} />
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} dot={false} name="Asset Value" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono mt-3 leading-snug">
                Tracks the average cumulative performance of the asset classes surrounding out-of-sample trigger thresholds.
              </p>
            </div>

            {/* 2. Return Distribution Bins (5 cols) */}
            <div className="lg:col-span-5 bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">
                  Return Distribution Frequency Histogram
                </h3>
                <div className="h-[210px] w-full bg-gray-950/20 rounded-xl border border-gray-900 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.return_distribution} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="bin" stroke="#4b5563" fontSize={9} tickLine={false} />
                      <YAxis stroke="#4b5563" fontSize={9} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ background: "#0c0d12", border: "1px solid #2a2b36", borderRadius: "6px" }}
                        labelStyle={{ color: "#6b7280", fontSize: "9px", fontFamily: "monospace" }}
                        itemStyle={{ color: "#06b6d4", fontSize: "10px" }}
                      />
                      <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Trigger Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono mt-3 leading-snug">
                Displays the skewness and dispersion of trade returns, highlighting potential downside tail risk.
              </p>
            </div>

          </div>

          {/* Historical Trade Example Grid */}
          <div className="bg-bg-card border border-gray-850 rounded-xl overflow-hidden shadow-md">
            <div className="p-4.5 border-b border-gray-900 flex justify-between items-center bg-gray-900/10">
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                Historical Trigger Sample log
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 font-mono">
                    <th className="py-2.5 px-4 font-semibold">Trigger Date</th>
                    <th className="py-2.5 px-4 font-semibold">Macro Regime</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Forward {window} Return</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-gray-300">
                  {data.examples.map((ex: any, idx: number) => {
                    const isSuccess = ex.result.toLowerCase() === "successful";
                    return (
                      <tr key={idx} className="hover:bg-gray-900/20">
                        <td className="py-3 px-4 font-mono flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-650" />
                          {ex.date}
                        </td>
                        <td className="py-3 px-4">{ex.regime}</td>
                        <td className={`py-3 px-4 text-right font-mono font-bold ${ex.return.includes("-") ? "text-brand-red" : "text-brand-green"}`}>
                          {ex.return}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${
                            isSuccess ? "bg-brand-green/10 text-brand-green border-brand-green/20" : "bg-brand-red/10 text-brand-red border-brand-red/20"
                          }`}>
                            {isSuccess ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {ex.result}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
