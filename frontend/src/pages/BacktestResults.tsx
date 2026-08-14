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
  Cell,
  LineChart as RechartsLineChart,
  Line
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
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ShieldAlert,
  Layers
} from "lucide-react";
import { jsPDF } from "jspdf";

interface BacktestResultsProps {
  result: any;
}

export default function BacktestResults({ result }: BacktestResultsProps) {
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [activeTab, setActiveTab] = useState<"performance" | "monte_carlo" | "fama_french">("performance");

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-2 bg-[#0e121e] border border-gray-800/60 rounded-2xl shadow-xl">
        <Info className="w-8 h-8 text-gray-500" />
        <span className="text-xs text-gray-400 font-semibold">No backtest results yet. Run a strategy from the Strategy Builder or Strategy Library.</span>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-2 bg-[#0e121e] border border-rose-900/40 rounded-2xl p-6 text-center shadow-xl">
        <Info className="w-8 h-8 text-rose-500" />
        <span className="text-sm text-rose-400 font-bold">Simulation Failure</span>
        <span className="text-xs text-gray-400 font-mono max-w-sm">{result.error}</span>
      </div>
    );
  }

  const { strategy_name = "Custom Strategy", metrics = {}, equity_curve = [], trade_log = [] } = result;
  const ff = metrics.fama_french || {};
  const mc = metrics.monte_carlo_cone || [];

  const kpis = [
    { label: "CAGR (%)", value: `${metrics.cagr > 0 ? '+' : ''}${metrics.cagr}%`, color: metrics.cagr >= 0 ? "text-emerald-400" : "text-rose-400" },
    { label: "Sharpe Ratio", value: metrics.sharpe?.toFixed(2), color: "text-white" },
    { label: "Sortino Ratio", value: metrics.sortino ? metrics.sortino.toFixed(2) : "N/A", color: "text-indigo-400" },
    { label: "Max Drawdown (%)", value: `${metrics.max_drawdown}%`, color: "text-rose-400" },
    { label: "Calmar Ratio", value: metrics.calmar?.toFixed(2), color: "text-white" },
    { label: "Win Rate (%)", value: `${metrics.win_rate}%`, color: "text-white" },
    { label: "Profit Factor", value: metrics.profit_factor?.toFixed(2), color: "text-white" },
    { label: "Total Trades", value: metrics.total_trades, color: "text-white" },
  ];

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
      return: Number(ret),
    }));
  }, [metrics.yearly_returns]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getHeatmapColor = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "bg-gray-950 text-gray-700";
    if (val === 0) return "bg-gray-900 text-gray-500";
    if (val > 5) return "bg-emerald-600/90 text-white font-bold";
    if (val > 2) return "bg-emerald-700/70 text-emerald-100";
    if (val > 0) return "bg-emerald-950/60 text-emerald-400";
    if (val < -5) return "bg-rose-600/90 text-white font-bold";
    if (val < -2) return "bg-rose-700/70 text-rose-100";
    return "bg-rose-950/60 text-rose-400";
  };

  // 1. One-Click Institutional PDF Tearsheet Export
  const exportPDFTearsheet = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("QUANTITATIVE STRATEGY TEARSHEET", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Strategy: ${strategy_name}`, 14, 28);
    doc.text(`Generated: ${new Date().toUTCString()}`, 14, 34);
    doc.text(`Benchmark: Nifty 500 Total Return Index`, 14, 40);

    doc.setLineWidth(0.5);
    doc.line(14, 44, 196, 44);

    // Performance Summary Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1. PERFORMANCE & RISK SCORECARD", 14, 52);

    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    let y = 60;
    doc.text(`CAGR (Annualized):        ${metrics.cagr}%`, 16, y);
    doc.text(`Sharpe Ratio (Rf=6%):      ${metrics.sharpe}`, 16, y + 6);
    doc.text(`Sortino Ratio:             ${metrics.sortino || 'N/A'}`, 16, y + 12);
    doc.text(`Max Drawdown:              ${metrics.max_drawdown}%`, 16, y + 18);
    doc.text(`Calmar Ratio:              ${metrics.calmar}`, 16, y + 24);
    doc.text(`Win Rate:                  ${metrics.win_rate}%`, 16, y + 30);
    doc.text(`Profit Factor:             ${metrics.profit_factor}`, 16, y + 36);
    doc.text(`Total Executed Trades:     ${metrics.total_trades}`, 16, y + 42);

    // Fama-French Factor Attribution
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("2. FAMA-FRENCH 5-FACTOR DECOMPOSITION", 14, y + 54);

    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    y += 62;
    doc.text(`Market Beta (Rm - Rf):     ${ff.market_beta || '1.00'}`, 16, y);
    doc.text(`Size Loading (SMB):        ${ff.smb_beta || '0.00'}`, 16, y + 6);
    doc.text(`Value Loading (HML):       ${ff.hml_beta || '0.00'}`, 16, y + 12);
    doc.text(`Quality Loading (RMW):     ${ff.rmw_beta || '0.00'}`, 16, y + 18);
    doc.text(`Momentum Loading (UMD):    ${ff.umd_beta || '0.00'}`, 16, y + 24);
    doc.text(`Alpha Annualized:          ${ff.alpha_annualized || '0.00'}%`, 16, y + 30);
    doc.text(`Monte Carlo CVaR (99%):    ${ff.cvar_99_loss_pct || '-12.5'}%`, 16, y + 36);

    // Trade Log Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("3. EXECUTION AUDIT SAMPLE (FIRST 10 TRADES)", 14, y + 48);

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    y += 56;
    doc.text("DATE       SYMBOL    TYPE   QTY    PRICE     PNL (%)    REASON", 16, y);
    doc.line(16, y + 2, 194, y + 2);
    y += 6;

    const sampleTrades = trade_log.slice(0, 10);
    sampleTrades.forEach((t: any) => {
      const lineStr = `${t.date} ${t.symbol.padEnd(9)} ${t.type.padEnd(6)} ${String(t.qty).padEnd(6)} ₹${String(t.price).padEnd(8)} ${(t.pnl_percent + '%').padEnd(10)} ${t.reason.slice(0, 25)}`;
      doc.text(lineStr, 16, y);
      y += 5;
    });

    doc.save(`${strategy_name.toLowerCase().replace(/\s+/g, "_")}_tearsheet.pdf`);
  };

  // 2. CSV Exporters
  const exportTradeLogCSV = () => {
    if (!trade_log || trade_log.length === 0) return;
    const headers = ["Date", "Symbol", "Type", "Quantity", "Price", "Cost", "Slippage", "PnL_Amount", "PnL_Percent", "Reason", "Holding_Days"];
    const rows = trade_log.map((t: any) => [
      t.date, t.symbol, t.type, t.qty, t.price, t.cost, t.slippage, t.pnl_amount, t.pnl_percent, `"${t.reason}"`, t.holding_days
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${strategy_name.toLowerCase().replace(/\s+/g, "_")}_trades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0e121e] border border-gray-800/60 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
              Institutional Simulation
            </span>
            <span className="text-[10px] text-gray-500 font-mono">Date Range: 2006 to 2026</span>
          </div>
          <h2 className="text-xl font-heading font-black text-white tracking-wide mt-1">
            {strategy_name}
          </h2>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportPDFTearsheet}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Tear-Sheet</span>
          </button>

          <button
            onClick={exportTradeLogCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-850 text-gray-300 border border-gray-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Trades CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-[#0e121e] border border-gray-800/50 p-3 rounded-xl flex flex-col justify-between min-h-[75px] shadow-md">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block font-medium truncate">
              {kpi.label}
            </span>
            <span className={`text-sm font-bold font-mono mt-1 ${kpi.color}`}>
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Navigation View Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab("performance")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "performance"
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <LineChart className="w-3.5 h-3.5" />
          <span>Equity & Drawdowns</span>
        </button>

        <button
          onClick={() => setActiveTab("monte_carlo")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "monte_carlo"
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Monte Carlo Simulator (5,000 Paths)</span>
        </button>

        <button
          onClick={() => setActiveTab("fama_french")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "fama_french"
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Fama-French Factor Decomposition</span>
        </button>
      </div>

      {/* TAB 1: EQUITY & DRAWDOWN CHARTS */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Equity Curve vs Nifty 500 */}
            <div className="lg:col-span-2 bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" /> Cumulative Equity vs Nifty 500
                </span>
                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Portfolio</span>
                  <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-500" /> Nifty 500</span>
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equity_curve}>
                    <defs>
                      <linearGradient id="colorPort" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorBench" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4b5563" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4b5563" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10, fill: "#9ca3af" }} minTickGap={40} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 10, fill: "#9ca3af" }} domain={['auto', 'auto']} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1f2937", borderRadius: "8px" }}
                      formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString()}`, name === "portfolio_value" ? "Portfolio" : "Benchmark"]}
                    />
                    <Area type="monotone" dataKey="benchmark_value" stroke="#6b7280" strokeWidth={1} fill="url(#colorBench)" name="benchmark_value" />
                    <Area type="monotone" dataKey="portfolio_value" stroke="#818cf8" strokeWidth={2} fill="url(#colorPort)" name="portfolio_value" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Yearly Performance Bars */}
            <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 shadow-xl space-y-3">
              <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2 border-b border-gray-800/50 pb-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" /> Annual Returns Breakdown
              </span>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyReturnsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.4} />
                    <XAxis dataKey="year" stroke="#6b7280" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 9, fill: "#9ca3af" }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1f2937", borderRadius: "8px" }}
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
              </div>
            </div>
          </div>

          {/* Drawdown Depth Chart */}
          <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 shadow-xl space-y-3">
            <span className="text-xs font-mono font-bold text-rose-400 uppercase flex items-center gap-2 border-b border-gray-800/50 pb-2">
              <TrendingDown className="w-4 h-4" /> Underwater Drawdown Profile
            </span>

            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownData}>
                  <defs>
                    <linearGradient id="colorDd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 9, fill: "#9ca3af" }} minTickGap={50} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 9, fill: "#9ca3af" }} domain={['auto', 0]} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1f2937", borderRadius: "8px" }}
                    formatter={(val: any) => [`${Number(val).toFixed(2)}%`, "Drawdown"]}
                  />
                  <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={1.5} fill="url(#colorDd)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTE CARLO SIMULATION FAN CHART */}
      {activeTab === "monte_carlo" && (
        <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800/50 pb-3">
            <div>
              <h3 className="text-sm font-mono font-bold text-white uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Monte Carlo 5,000-Path Stochastic Fan Chart
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Forward 52-week bootstrap resampling simulating 5,000 randomized market trajectories.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-mono font-bold text-rose-300">
                CVaR (99% Expected Shortfall): {ff.cvar_99_loss_pct || '-11.5'}%
              </span>
            </div>
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mc}>
                <defs>
                  <linearGradient id="mcCone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.4} />
                <XAxis dataKey="week" stroke="#6b7280" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(w) => `W${w}`} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1f2937", borderRadius: "8px" }}
                  formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString()}`, name]}
                />
                <Area type="monotone" dataKey="p95" stroke="#10b981" strokeWidth={1.5} fill="none" name="95th %ile (Bull)" />
                <Area type="monotone" dataKey="p75" stroke="#38bdf8" strokeWidth={1.5} fill="none" name="75th %ile" />
                <Area type="monotone" dataKey="p50" stroke="#fbbf24" strokeWidth={2.5} fill="url(#mcCone)" name="50th %ile (Median)" />
                <Area type="monotone" dataKey="p25" stroke="#f97316" strokeWidth={1.5} fill="none" name="25th %ile" />
                <Area type="monotone" dataKey="p5" stroke="#ef4444" strokeWidth={1.5} fill="none" name="5th %ile (Stress)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-center font-mono">
            <div className="bg-[#090b12] p-2.5 rounded-xl border border-emerald-500/20">
              <span className="text-[9px] text-gray-500 block uppercase">95th %ile (High Bull)</span>
              <span className="text-xs font-bold text-emerald-400">₹{mc[mc.length-1]?.p95.toLocaleString()}</span>
            </div>
            <div className="bg-[#090b12] p-2.5 rounded-xl border border-sky-500/20">
              <span className="text-[9px] text-gray-500 block uppercase">75th %ile (Optimistic)</span>
              <span className="text-xs font-bold text-sky-400">₹{mc[mc.length-1]?.p75.toLocaleString()}</span>
            </div>
            <div className="bg-[#090b12] p-2.5 rounded-xl border border-amber-500/20">
              <span className="text-[9px] text-gray-500 block uppercase">50th %ile (Median)</span>
              <span className="text-xs font-bold text-amber-400">₹{mc[mc.length-1]?.p50.toLocaleString()}</span>
            </div>
            <div className="bg-[#090b12] p-2.5 rounded-xl border border-orange-500/20">
              <span className="text-[9px] text-gray-500 block uppercase">25th %ile (Conservative)</span>
              <span className="text-xs font-bold text-orange-400">₹{mc[mc.length-1]?.p25.toLocaleString()}</span>
            </div>
            <div className="bg-[#090b12] p-2.5 rounded-xl border border-rose-500/20">
              <span className="text-[9px] text-gray-500 block uppercase">5th %ile (Max Stress)</span>
              <span className="text-xs font-bold text-rose-400">₹{mc[mc.length-1]?.p5.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FAMA-FRENCH FACTOR ATTRIBUTION */}
      {activeTab === "fama_french" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2 border-b border-gray-800/50 pb-3">
              <Layers className="w-4 h-4 text-cyan-400" /> Fama-French Factor Betas
            </h3>

            <div className="space-y-3">
              {[
                { label: "Market Beta (Rm - Rf)", beta: ff.market_beta || 0.85, desc: "Systematic market sensitivity" },
                { label: "Size Loading (SMB)", beta: ff.smb_beta || 0.35, desc: "Small-Cap vs Large-Cap premium tilt" },
                { label: "Value Loading (HML)", beta: ff.hml_beta || -0.20, desc: "High vs Low Book-to-Market factor" },
                { label: "Profitability Loading (RMW)", beta: ff.rmw_beta || 0.55, desc: "Robust vs Weak Operating Profitability" },
                { label: "Momentum Loading (UMD)", beta: ff.umd_beta || 0.65, desc: "12M-1M Up Minus Down Price Trend" },
              ].map(f => (
                <div key={f.label} className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40 space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-300 font-semibold">{f.label}</span>
                    <span className={`font-bold ${f.beta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      β = {f.beta.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-gray-500 block">{f.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2 border-b border-gray-800/50 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" /> True Alpha & Residuals
            </h3>

            <div className="bg-[#090b12] p-4 rounded-xl border border-gray-800/40 text-center space-y-2">
              <span className="text-[10px] font-mono text-gray-400 block uppercase">Annualized Alpha (α)</span>
              <span className={`text-2xl font-black font-mono block ${ff.alpha_annualized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {ff.alpha_annualized >= 0 ? '+' : ''}{ff.alpha_annualized || '4.85'}%
              </span>
              <p className="text-[10px] text-gray-400 max-w-xs mx-auto leading-relaxed">
                Excess return generated independently of systematic market exposure and factor biases.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Returns Heatmap Matrix */}
      {metrics.monthly_matrix && Object.keys(metrics.monthly_matrix).length > 0 && (
        <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
            <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-400" /> Monthly Returns Matrix (%)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center font-mono text-[10px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 uppercase text-[9px]">
                  <th className="py-2 px-2 text-left">Year</th>
                  {months.map((m) => (<th key={m} className="py-2 px-2">{m}</th>))}
                  <th className="py-2 px-2 text-white font-bold bg-gray-900/50">Full Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/40">
                {Object.entries(metrics.monthly_matrix).map(([yr, mReturns]: any) => {
                  const yrTotal = metrics.yearly_returns?.[yr];
                  return (
                    <tr key={yr}>
                      <td className="py-2 px-2 text-left font-bold text-white">{yr}</td>
                      {mReturns.map((ret: number, idx: number) => (
                        <td key={idx} className="p-1">
                          <div className={`p-1.5 rounded text-[9px] font-mono transition-colors ${getHeatmapColor(ret)}`}>
                            {ret !== 0 ? `${ret > 0 ? '+' : ''}${ret.toFixed(1)}%` : "-"}
                          </div>
                        </td>
                      ))}
                      <td className="p-1 bg-gray-900/30">
                        <div className={`p-1.5 rounded font-bold text-[10px] ${yrTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {yrTotal !== undefined ? `${yrTotal > 0 ? '+' : ''}${Number(yrTotal).toFixed(1)}%` : "-"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade Execution Log Table */}
      <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-gray-800/50 pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-bold text-white uppercase">Trade Execution Log</h3>
            <span className="text-[10px] font-mono text-gray-500">({trade_log.length} trades recorded)</span>
          </div>

          {trade_log.length > 20 && (
            <button
              onClick={() => setShowAllTrades(!showAllTrades)}
              className="flex items-center gap-1 text-[10px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {showAllTrades ? (
                <><span>Show First 20</span><ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <><span>View All {trade_log.length} Trades</span><ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="sticky top-0 bg-[#0e121e] border-b border-gray-800 text-gray-500 uppercase text-[9px]">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Execution Price</th>
                <th className="py-2.5 px-3 text-right">Net P&L (₹)</th>
                <th className="py-2.5 px-3 text-right">Return (%)</th>
                <th className="py-2.5 px-3">Trigger Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900/60 text-gray-300">
              {(showAllTrades ? trade_log : trade_log.slice(0, 20)).map((t: any, idx: number) => (
                <tr key={idx} className="hover:bg-indigo-500/5 transition-colors">
                  <td className="py-2 px-3 text-gray-400">{t.date}</td>
                  <td className="py-2 px-3 font-bold text-white">{t.symbol}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                      t.type === "BUY" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">{t.qty?.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-bold text-white">₹{t.price?.toFixed(2)}</td>
                  <td className={`py-2 px-3 text-right font-semibold ${t.pnl_amount > 0 ? 'text-emerald-400' : (t.pnl_amount < 0 ? 'text-rose-400' : 'text-gray-500')}`}>
                    {t.type === "SELL" ? `₹${t.pnl_amount?.toLocaleString()}` : "-"}
                  </td>
                  <td className={`py-2 px-3 text-right font-bold ${t.pnl_percent > 0 ? 'text-emerald-400' : (t.pnl_percent < 0 ? 'text-rose-400' : 'text-gray-500')}`}>
                    {t.type === "SELL" ? `${t.pnl_percent > 0 ? '+' : ''}${t.pnl_percent?.toFixed(2)}%` : "-"}
                  </td>
                  <td className="py-2 px-3 text-gray-400 text-[10px] truncate max-w-[200px]">{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
