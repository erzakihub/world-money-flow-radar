import React, { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend
} from "recharts";
import { Play, TrendingUp, ShieldAlert, Award } from "lucide-react";

export default function Backtesting() {
  const [strategy, setStrategy] = useState("Global Liquidity Risk-On Strategy");
  const [symbol, setSymbol] = useState("BTC-USD");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2026-06-20");
  const [tc, setTc] = useState(0.001); // 0.1%
  const [slip, setSlip] = useState(0.0005); // 0.05%
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("strategy_name", strategy);
      formData.append("symbol", symbol);
      formData.append("start_date", startDate);
      formData.append("end_date", endDate);
      formData.append("transaction_cost", tc.toString());
      formData.append("slippage", slip.toString());

      const res = await fetch("http://127.0.0.1:8000/api/backtest", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    runBacktest();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Strategy Backtesting Engine</h2>
          <p className="text-sm text-gray-500">Backtest macro liquidity signals, rotation triggers, and FPI/DII configurations without look-ahead bias.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameters input panel */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">Backtest Configurator</h3>
          
          <div className="space-y-3.5 text-xs font-mono">
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 uppercase">Select Strategy</label>
              <select 
                value={strategy} 
                onChange={(e) => setStrategy(e.target.value)}
                className="bg-gray-900 border border-gray-800 p-2.5 rounded text-white focus:outline-none"
              >
                <option value="Global Liquidity Risk-On Strategy">Global Liquidity Risk-On Strategy</option>
                <option value="India Flow Confirmation Strategy">India Flow Confirmation Strategy</option>
                <option value="Sector Rotation Strategy">Sector Rotation Strategy</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-gray-500 uppercase">Backtest Asset</label>
              <select 
                value={symbol} 
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-gray-900 border border-gray-800 p-2.5 rounded text-white focus:outline-none"
              >
                <option value="SPY">SPY (S&P 500 ETF)</option>
                <option value="QQQ">QQQ (Nasdaq ETF)</option>
                <option value="INDA">INDA (India ETF)</option>
                <option value="BTC-USD">BTC-USD (Bitcoin)</option>
                <option value="GLD">GLD (Gold ETF)</option>
                <option value="TLT">TLT (Treasury Bond ETF)</option>
                <option value="CNXREALTY">CNXREALTY (Nifty Realty)</option>
                <option value="CNXBANK">CNXBANK (Nifty Bank)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-gray-500 uppercase">Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-900 border border-gray-800 p-2 rounded text-white focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-500 uppercase">End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-900 border border-gray-800 p-2 rounded text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-gray-500 uppercase">Commission fee</label>
                <input 
                  type="number" 
                  step="0.0005"
                  value={tc} 
                  onChange={(e) => setTc(parseFloat(e.target.value))}
                  className="bg-gray-900 border border-gray-800 p-2 rounded text-white focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-gray-500 uppercase">Slippage cost</label>
                <input 
                  type="number" 
                  step="0.0001"
                  value={slip} 
                  onChange={(e) => setSlip(parseFloat(e.target.value))}
                  className="bg-gray-900 border border-gray-800 p-2 rounded text-white focus:outline-none"
                />
              </div>
            </div>

            <button 
              onClick={runBacktest}
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-brand-green hover:bg-brand-green/95 disabled:bg-gray-800 text-gray-950 font-bold rounded-lg text-sm transition font-mono uppercase cursor-pointer"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-gray-950"></div>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-gray-950" />
                  <span>Execute Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Equity Curve Display */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md lg:col-span-2 space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">Strategy Cumulative Equity Curves</h3>
          
          <div className="h-[280px]">
            {result?.equity_curve ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.equity_curve} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e303a" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" tickLine={false} style={{ fontSize: 9, fontFamily: 'monospace' }} />
                  <YAxis stroke="#6b7280" tickLine={false} style={{ fontSize: 9, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: "#151720", border: "1px solid #2e303a", borderRadius: 6 }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Line type="monotone" name="Buy & Hold Benchmark" dataKey="benchmark" stroke="#4b5563" strokeWidth={1} dot={false} />
                  <Line type="monotone" name="Liquidity Strategy" dataKey="strategy" stroke="#00e676" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-500 font-mono">
                Click Execute to render simulation.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      {result && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <div className="bg-bg-card border border-gray-800 rounded-xl p-4 text-center font-mono">
            <span className="text-[10px] text-gray-500 uppercase block">Total Return</span>
            <span className={`text-lg font-bold block mt-1 ${result.metrics.total_return >= 0 ? "text-brand-green" : "text-brand-red"}`}>
              {result.metrics.total_return > 0 ? "+" : ""}{result.metrics.total_return}%
            </span>
          </div>

          <div className="bg-bg-card border border-gray-800 rounded-xl p-4 text-center font-mono">
            <span className="text-[10px] text-gray-500 uppercase block">Annualized CAGR</span>
            <span className={`text-lg font-bold block mt-1 ${result.metrics.cagr >= 0 ? "text-brand-green" : "text-brand-red"}`}>
              {result.metrics.cagr > 0 ? "+" : ""}{result.metrics.cagr}%
            </span>
          </div>

          <div className="bg-bg-card border border-gray-800 rounded-xl p-4 text-center font-mono">
            <span className="text-[10px] text-gray-500 uppercase block">Sharpe Ratio</span>
            <span className="text-lg font-bold text-brand-blue block mt-1">
              {result.metrics.sharpe}
            </span>
          </div>

          <div className="bg-bg-card border border-gray-800 rounded-xl p-4 text-center font-mono">
            <span className="text-[10px] text-gray-500 uppercase block">Max Drawdown</span>
            <span className="text-lg font-bold text-brand-red block mt-1">
              {result.metrics.max_drawdown}%
            </span>
          </div>

          <div className="bg-bg-card border border-gray-800 rounded-xl p-4 text-center font-mono">
            <span className="text-[10px] text-gray-500 uppercase block">Hit Rate (3M Fwd)</span>
            <span className="text-lg font-bold text-brand-green block mt-1">
              {result.metrics.hit_rate}%
            </span>
          </div>

          <div className="bg-bg-card border border-gray-800 rounded-xl p-4 text-center font-mono">
            <span className="text-[10px] text-gray-500 uppercase block">Sample Size</span>
            <span className="text-lg font-bold text-white block mt-1">
              {result.metrics.sample_size} signals
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
