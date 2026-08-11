import React, { useState, useMemo } from "react";
import { 
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts";
import { 
  LineChart, 
  Activity, 
  TrendingDown, 
  CalendarDays, 
  BarChart3, 
  ClipboardList, 
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface BacktestResultsProps {
  result: any;
}

export default function BacktestResults({ result }: BacktestResultsProps) {
  const [showAllTrades, setShowAllTrades] = useState(false);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-2 bg-[#13151e] border border-gray-800/40 rounded-xl">
        <Info className="w-8 h-8 text-gray-500" />
        <span className="text-xs text-gray-400 font-semibold">No backtest results yet. Run a strategy from the Strategy Builder or Strategy Library.</span>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-2 bg-[#13151e] border border-gray-800/40 rounded-xl p-6 text-center">
        <Info className="w-8 h-8 text-red-500" />
        <span className="text-xs text-red-500 font-bold">Simulation Failure</span>
        <span className="text-[10px] text-gray-500 font-mono max-w-sm">{result.error}</span>
      </div>
    );
  }

  const { strategy_name, metrics = {}, equity_curve = [], trade_log = [] } = result;

  const kpis = [
    { label: "CAGR (%)", value: metrics.cagr, format: "percent", color: metrics.cagr > 0 ? "text-emerald-400" : "text-red-400" },
    { label: "Sharpe Ratio", value: metrics.sharpe, format: "number", color: "text-white" },
    { label: "Max Drawdown (%)", value: metrics.max_drawdown, format: "percent", color: "text-red-400" },
    { label: "Calmar Ratio", value: metrics.calmar, format: "number", color: "text-white" },
    { label: "Win Rate (%)", value: metrics.win_rate, format: "percent", color: "text-white" },
    { label: "Profit Factor", value: metrics.profit_factor, format: "number", color: "text-white" },
    { label: "Total Trades", value: metrics.total_trades, format: "raw", color: "text-white" },
    { label: "Avg Rolling 3Y CAGR", value: metrics.avg_rolling_3y, format: "percent", color: "text-white" },
  ];

  const formatValue = (val: number | undefined, format: string) => {
    if (val === undefined || val === null) return "N/A";
    if (format === "percent") return `${(val * 100).toFixed(2)}%`;
    if (format === "raw") return val.toString();
    return val.toFixed(2);
  };

  const drawdownData = useMemo(() => {
    if (!equity_curve || equity_curve.length === 0) return [];
    let peak = equity_curve[0].portfolio_value;
    return equity_curve.map((pt: any) => {
      if (pt.portfolio_value > peak) {
        peak = pt.portfolio_value;
      }
      const drawdown = peak > 0 ? ((pt.portfolio_value - peak) / peak) * 100 : 0;
      return {
        date: pt.date,
        drawdown: drawdown,
      };
    });
  }, [equity_curve]);

  const yearlyReturnsData = useMemo(() => {
    if (!metrics.yearly_returns) return [];
    return Object.entries(metrics.yearly_returns).map(([year, ret]) => ({
      year,
      return: Number(ret) * 100, // format as percentage value for chart
    }));
  }, [metrics.yearly_returns]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getHeatmapColor = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "bg-gray-900";
    if (val === 0) return "bg-gray-800 text-gray-400";
    if (val > 0) {
      if (val > 0.1) return "bg-emerald-500/80 text-emerald-50";
      if (val > 0.05) return "bg-emerald-500/60 text-emerald-100";
      if (val > 0.02) return "bg-emerald-500/40 text-emerald-200";
      return "bg-emerald-500/20 text-emerald-300";
    } else {
      if (val < -0.1) return "bg-red-500/80 text-red-50";
      if (val < -0.05) return "bg-red-500/60 text-red-100";
      if (val < -0.02) return "bg-red-500/40 text-red-200";
      return "bg-red-500/20 text-red-300";
    }
  };

  const displayedTrades = showAllTrades ? trade_log : trade_log.slice(0, 20);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-[#13151e] border border-gray-800/40 p-3 rounded-lg flex flex-col justify-between h-[72px]">
            <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</span>
            <span className={`text-[13px] font-mono font-semibold ${kpi.color}`}>
              {formatValue(kpi.value, kpi.format)}
            </span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Equity Curve */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 flex flex-col min-h-[350px]">
          <div className="flex items-center gap-2 border-b border-gray-800/60 pb-3 mb-4">
            <LineChart className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-gray-200">Equity Curve</h3>
            <span className="text-[10px] text-gray-500 ml-auto">Portfolio vs Benchmark</span>
          </div>
          <div className="flex-1 w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity_curve} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPort" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorBench" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" stroke="#4b5563" fontSize={9} tickLine={false} dy={10} minTickGap={30} />
                <YAxis stroke="#4b5563" fontSize={9} tickLine={false} dx={-5} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1f2937", borderRadius: "6px" }}
                  labelStyle={{ color: "#9ca3af", fontSize: "11px" }}
                  itemStyle={{ fontSize: "12px", fontFamily: "monospace" }}
                  formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name === "portfolio_value" ? "Portfolio" : "Benchmark"]}
                />
                <Area type="monotone" dataKey="benchmark_value" stroke="#6b7280" strokeWidth={1} fill="url(#colorBench)" name="benchmark_value" />
                <Area type="monotone" dataKey="portfolio_value" stroke="#818cf8" strokeWidth={2} fill="url(#colorPort)" name="portfolio_value" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drawdown Depth Chart */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 flex flex-col min-h-[350px]">
          <div className="flex items-center gap-2 border-b border-gray-800/60 pb-3 mb-4">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-gray-200">Drawdown Depth</h3>
            <span className="text-[10px] text-gray-500 ml-auto">% from Peak</span>
          </div>
          <div className="flex-1 w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" stroke="#4b5563" fontSize={9} tickLine={false} dy={10} minTickGap={30} />
                <YAxis reversed stroke="#4b5563" fontSize={9} tickLine={false} dx={-5} tickFormatter={(val) => `${val.toFixed(0)}%`} domain={[0, 'dataMax']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1f2937", borderRadius: "6px" }}
                  labelStyle={{ color: "#9ca3af", fontSize: "11px" }}
                  itemStyle={{ fontSize: "12px", fontFamily: "monospace", color: "#ef4444" }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)}%`, "Drawdown"]}
                />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1.5} fill="url(#colorDd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap & Yearly Returns Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Returns Heatmap */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 overflow-x-auto">
          <div className="flex items-center gap-2 border-b border-gray-800/60 pb-3 mb-4 min-w-[600px]">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-gray-200">Monthly Returns Heatmap</h3>
          </div>
          {metrics.monthly_matrix && Object.keys(metrics.monthly_matrix).length > 0 ? (
            <table className="w-full text-center border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="p-1.5 text-[10px] font-medium text-gray-500 font-mono">Year</th>
                  {months.map(m => <th key={m} className="p-1.5 text-[10px] font-medium text-gray-500 font-mono">{m}</th>)}
                  <th className="p-1.5 text-[10px] font-medium text-gray-500 font-mono border-l border-gray-800">Full Year</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(metrics.monthly_matrix).sort().map(year => {
                  const monthly = metrics.monthly_matrix[year];
                  const yearly = metrics.yearly_returns ? metrics.yearly_returns[year] : null;
                  
                  return (
                    <tr key={year}>
                      <td className="p-1.5 text-[11px] font-mono font-medium text-gray-400">{year}</td>
                      {Array.from({ length: 12 }).map((_, i) => {
                        const val = monthly[i];
                        return (
                          <td key={i} className="p-0.5">
                            <div className={`w-full h-7 flex items-center justify-center rounded text-[10px] font-mono ${getHeatmapColor(val)}`}>
                              {val !== undefined && val !== null ? `${(val * 100).toFixed(1)}%` : '-'}
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-0.5 pl-2 border-l border-gray-800">
                        <div className={`w-full h-7 flex items-center justify-center rounded text-[10px] font-mono font-bold ${getHeatmapColor(yearly)}`}>
                          {yearly !== undefined && yearly !== null ? `${(yearly * 100).toFixed(1)}%` : '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
             <div className="h-[200px] flex items-center justify-center text-xs text-gray-500 font-medium">
               No monthly return data available
             </div>
          )}
        </div>

        {/* Yearly Returns Bar Chart */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 flex flex-col min-h-[300px]">
          <div className="flex items-center gap-2 border-b border-gray-800/60 pb-3 mb-4">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-gray-200">Yearly Returns</h3>
          </div>
          <div className="flex-1 w-full h-[250px]">
            {yearlyReturnsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyReturnsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="year" stroke="#4b5563" fontSize={9} tickLine={false} dy={10} />
                  <YAxis stroke="#4b5563" fontSize={9} tickLine={false} dx={-5} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    cursor={{ fill: '#1f2937', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1f2937", borderRadius: "6px" }}
                    labelStyle={{ color: "#9ca3af", fontSize: "11px" }}
                    itemStyle={{ fontSize: "12px", fontFamily: "monospace" }}
                    formatter={(val: any) => [`${Number(val).toFixed(2)}%`, "Return"]}
                  />
                  <ReferenceLine y={0} stroke="#374151" />
                  <Bar dataKey="return" radius={[2, 2, 0, 0]}>
                    {yearlyReturnsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.return >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500 font-medium">
                No yearly return data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
        <div className="flex items-center justify-between border-b border-gray-800/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-gray-200">Trade Execution Log</h3>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">Total Trades: {trade_log.length}</span>
        </div>

        {trade_log.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">
            No trades executed in this backtest.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-800 text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Symbol</th>
                  <th className="p-3 font-medium text-center">Type</th>
                  <th className="p-3 font-medium text-right">Qty</th>
                  <th className="p-3 font-medium text-right">Price</th>
                  <th className="p-3 font-medium text-right">P&L</th>
                  <th className="p-3 font-medium text-right">Return</th>
                  <th className="p-3 font-medium text-right">Hold Days</th>
                  <th className="p-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {displayedTrades.map((t: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-800/20 transition-colors text-[11px] font-mono text-gray-300">
                    <td className="p-3">{t.date}</td>
                    <td className="p-3 font-bold text-white">{t.symbol}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold tracking-widest ${
                        t.type === "BUY" ? "bg-indigo-500/20 text-indigo-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="p-3 text-right">{t.qty?.toLocaleString()}</td>
                    <td className="p-3 text-right">₹{t.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className={`p-3 text-right ${
                      t.pnl_amount > 0 ? "text-emerald-400" : t.pnl_amount < 0 ? "text-red-400" : "text-gray-500"
                    }`}>
                      {t.pnl_amount > 0 ? "+" : ""}{t.pnl_amount ? t.pnl_amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "-"}
                    </td>
                    <td className={`p-3 text-right font-bold ${
                      t.pnl_percent > 0 ? "text-emerald-400" : t.pnl_percent < 0 ? "text-red-400" : "text-gray-500"
                    }`}>
                      {t.pnl_percent > 0 ? "+" : ""}{t.pnl_percent ? `${t.pnl_percent.toFixed(2)}%` : "-"}
                    </td>
                    <td className="p-3 text-right text-gray-400">{t.holding_days ?? "-"}</td>
                    <td className="p-3 text-[10px] text-gray-500 truncate max-w-[150px]" title={t.reason}>{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {trade_log.length > 20 && (
              <button 
                onClick={() => setShowAllTrades(!showAllTrades)}
                className="w-full mt-2 py-3 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800/30 transition-all rounded-md font-medium"
              >
                {showAllTrades ? (
                  <><ChevronUp className="w-4 h-4" /> Show Less</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Show All {trade_log.length} Trades</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
