import React from "react";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { LineChart, BarChart, ArrowUpRight, ArrowDownRight, ClipboardList, Info, HelpCircle } from "lucide-react";

interface BacktestResultsProps {
  result: any;
}

export default function BacktestResults({ result }: BacktestResultsProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-2 bg-[#13151e] border border-gray-800/40 rounded-xl">
        <Info className="w-8 h-8 text-gray-500" />
        <span className="text-xs text-gray-400 font-semibold">No backtest run data available.</span>
        <span className="text-[10px] text-gray-600 font-mono">Create and run a strategy inside the Sandbox first.</span>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-2 bg-[#13151e] border border-gray-800/40 rounded-xl p-6 text-center">
        <Info className="w-8 h-8 text-brand-red" />
        <span className="text-xs text-brand-red font-bold">Simulation Failure</span>
        <span className="text-[10px] text-gray-500 font-mono max-w-sm">{result.error}</span>
      </div>
    );
  }

  const { strategy_name, metrics, equity_curve, trade_log } = result;

  const summary = [
    { label: "CAGR (Annualized)", val: `${(metrics.cagr * 100).toFixed(2)}%`, positive: metrics.cagr > 0 },
    { label: "Max Drawdown", val: `${(metrics.max_drawdown * 100).toFixed(2)}%`, positive: false },
    { label: "Sharpe Ratio", val: metrics.sharpe_ratio.toFixed(2), positive: metrics.sharpe_ratio > 1 },
    { label: "Sortino Ratio", val: metrics.sortino_ratio ? metrics.sortino_ratio.toFixed(2) : "N/A", positive: metrics.sortino_ratio > 1 },
    { label: "Win Rate (Realized Trades)", val: `${(metrics.win_rate * 100).toFixed(0)}%`, positive: metrics.win_rate > 0.5 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl flex items-center justify-between">
        <div>
          <span className="bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase">
            Simulation Completed
          </span>
          <h2 className="text-sm font-heading font-extrabold text-white mt-1">
            Backtest Report: {strategy_name}
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Performance metrics derived from historical database validation. Initial Capital: ₹1.00 Cr.
          </p>
        </div>
      </div>

      {/* Top metrics summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summary.map((s, idx) => (
          <div key={idx} className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl text-left">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">{s.label}</span>
            <span className={`text-base font-bold font-mono mt-1.5 block ${
              s.label.includes("Drawdown") 
                ? "text-brand-red" 
                : s.positive 
                  ? "text-brand-green" 
                  : "text-white"
            }`}>
              {s.val}
            </span>
          </div>
        ))}
      </div>

      {/* Equity Curve Chart */}
      <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
        <div className="flex items-center justify-between border-b border-gray-850 pb-3 mb-4">
          <h4 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold flex items-center gap-1.5">
            <LineChart className="w-4 h-4" />
            <span>Growth of ₹10,000,000 Capital (Equity Curve)</span>
          </h4>
          <span className="text-[8px] font-mono text-gray-600">Weekly Revaluation</span>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equity_curve} margin={{ top: 10, right: 5, left: 15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPort" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorBench" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="#4b5563" 
                fontSize={8} 
                tickLine={false} 
                dy={10}
              />
              <YAxis 
                stroke="#4b5563" 
                fontSize={8} 
                tickLine={false} 
                dx={-10}
                tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1f2937" }}
                labelStyle={{ color: "#9ca3af", fontSize: "10px", fontFamily: "monospace" }}
                itemStyle={{ fontSize: "11px", fontFamily: "sans-serif" }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, ""]}
              />
              <Area 
                name="Portfolio Value" 
                type="monotone" 
                dataKey="portfolio_value" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPort)" 
              />
              <Area 
                name="Nifty 500 Benchmark" 
                type="monotone" 
                dataKey="benchmark_value" 
                stroke="#3b82f6" 
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1} 
                fill="url(#colorBench)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
        <div className="flex items-center justify-between border-b border-gray-850 pb-3 mb-4">
          <h4 className="text-[10px] font-mono text-brand-green uppercase tracking-widest font-bold flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-brand-green" />
            <span>Execution Audit Logs (Realized Trades)</span>
          </h4>
          <span className="text-[8px] font-mono text-gray-600">Total Trades: {trade_log.length}</span>
        </div>

        {trade_log.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 font-medium">
            No trades executed. Strategy held initial portfolio or rules were too restrictive.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-950/40 border-b border-gray-850 font-mono text-[9px] text-gray-400 sticky top-0">
                  <th className="p-3">Date</th>
                  <th className="p-3">Symbol</th>
                  <th className="p-3 text-center">Type</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">P&L (₹)</th>
                  <th className="p-3 text-right">P&L (%)</th>
                  <th className="p-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900 font-sans text-gray-300">
                {trade_log.map((t: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                    <td className="p-3 font-mono text-gray-500">{t.date}</td>
                    <td className="p-3 font-bold font-mono text-white">{t.symbol}</td>
                    <td className="p-3 text-center">
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold tracking-wider ${
                        t.type === "BUY" 
                          ? "bg-brand-green/10 text-brand-green" 
                          : "bg-brand-red/10 text-brand-red"
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-right">{t.qty.toLocaleString()}</td>
                    <td className="p-3 font-mono text-right">₹{t.price.toLocaleString()}</td>
                    <td className={`p-3 font-mono text-right ${
                      t.pnl_amount > 0 
                        ? "text-brand-green" 
                        : t.pnl_amount < 0 
                          ? "text-brand-red" 
                          : "text-gray-400"
                    }`}>
                      {t.pnl_amount > 0 ? "+" : ""}{t.pnl_amount ? t.pnl_amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "-"}
                    </td>
                    <td className={`p-3 font-mono text-right font-bold ${
                      t.pnl_percent > 0 
                        ? "text-brand-green" 
                        : t.pnl_percent < 0 
                          ? "text-brand-red" 
                          : "text-gray-400"
                    }`}>
                      {t.pnl_percent > 0 ? "+" : ""}{t.pnl_percent ? `${t.pnl_percent}%` : "-"}
                    </td>
                    <td className="p-3 text-[10px] text-gray-500 truncate max-w-[150px]">{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
