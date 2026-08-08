import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Briefcase, 
  Coins, 
  Percent, 
  ChevronDown, 
  CheckCircle,
  X,
  Calendar,
  Info
} from "lucide-react";

export default function CountryEconomicCockpit() {
  const [selectedCountry, setSelectedCountry] = useState("IN");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 30-Year Trend Modal State
  const [activeTrend, setActiveTrend] = useState<{ indicator: string; label: string; currentVal: string } | null>(null);
  const [trendHistory, setTrendHistory] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [isTrendPercentage, setIsTrendPercentage] = useState(true);
  const [selectedFrequency, setSelectedFrequency] = useState<string>("yearly");

  const countriesList = [
    { code: "IN", name: "India", flag: "🇮🇳" },
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "CN", name: "China", flag: "🇨🇳" },
    { code: "DE", name: "Germany", flag: "🇩🇪" },
    { code: "JP", name: "Japan", flag: "🇯🇵" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  ];

  const fetchCockpitData = async (countryCode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/country-economic-cockpit/detail/${countryCode}?_t=${Date.now()}`);
      const payload = await res.json();
      setData(payload);
    } catch (err) {
      console.error("Failed to fetch country cockpit data", err);
    }
    setLoading(false);
  };

  const fetchTrendHistory = async (indicator: string, label: string, currentVal: string, freq: string = "yearly") => {
    setTrendLoading(true);
    setActiveTrend({ indicator, label, currentVal });
    setSelectedFrequency(freq);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/country-economic-cockpit/history-30y?country_id=${selectedCountry}&indicator=${indicator}&frequency=${freq}&_t=${Date.now()}`);
      const payload = await res.json();
      setTrendHistory(payload.history || []);
      setIsTrendPercentage(payload.is_percentage ?? true);
    } catch (err) {
      console.error("Failed to fetch 30-year trend history", err);
    }
    setTrendLoading(false);
  };

  useEffect(() => {
    fetchCockpitData(selectedCountry);
    setActiveTrend(null); // Reset modal on country change
  }, [selectedCountry]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  const { metrics, history, cb_stance_score, cb_stance_label, policy_recommendation, name, flag, central_bank, currency } = data;

  const gaugeColor = cb_stance_score >= 65 
    ? "#EF4444" 
    : cb_stance_score >= 45 
      ? "#29b6f6" 
      : "#10B981";

  const strokeDashoffset = 251.2 - (251.2 * cb_stance_score) / 100;

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#12141d] border border-gray-800 p-2.5 rounded-lg shadow-xl font-mono text-[10px] text-left">
          <p className="text-gray-400 font-bold mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between gap-4">
              <span style={{ color: entry.stroke || entry.fill }}>{entry.name}</span>
              <span className="text-white font-bold">{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const ModalChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#12141d] border border-gray-800 p-2.5 rounded-lg shadow-xl font-mono text-[10px] text-left">
          <p className="text-gray-400 font-bold mb-1">Year {label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between gap-4">
              <span className="text-brand-blue">{activeTrend?.label}</span>
              <span className="text-white font-bold">
                {entry.value}{isTrendPercentage ? "%" : ""}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Generate milestone explanations depending on chosen indicator
  const getTrendMilestones = (ind: string) => {
    switch (ind) {
      case "gdp_growth":
        return [
          { year: "2008", event: "Global Financial Crisis contraction due to severe credit freezes." },
          { year: "2020", event: "COVID-19 pandemic nationwide lockdowns; sharp economic contraction." },
          { year: "2021-2022", event: "V-shaped reopening bounce driven by fiscal stimulations." }
        ];
      case "cpi_inflation":
        return [
          { year: "2008", event: "Pre-crisis energy price bubble followed by rapid post-crisis demand collapse." },
          { year: "2020", event: "COVID lockdown drop; global consumer demand freezes." },
          { year: "2022-2023", event: "Severe post-COVID supply chain bottlenecks & energy shortages drive CPI spikes." }
        ];
      case "repo_rate":
        return [
          { year: "2008-2009", event: "Coordinated emergency global central bank interest rate cuts." },
          { year: "2020", event: "COVID crisis liquidity support; rates slashed to historical lows." },
          { year: "2022-2024", event: "Aggressive tightening campaign to combat sticky post-pandemic inflation." }
        ];
      default:
        return [
          { year: "2008", event: "Global Financial Crisis triggers deep economic adjustments." },
          { year: "2020", event: "COVID-19 pandemic halts trade and production networks." },
          { year: "2022-2023", event: "Central bank normalization programs alter global liquidity reserves." }
        ];
    }
  };

  return (
    <div className="space-y-6 font-sans relative">
      {/* Top Selector Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#13151e] border border-gray-800/40 p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
            <span className="text-2xl">{flag}</span>
            <span>{name} — Central Bank Cockpit</span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-1">
            {central_bank} Policy Dashboard • Ground Status Assessment • Click cards to open 30-Year Trend Curves
          </p>
        </div>

        <div className="relative inline-block">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="appearance-none bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-200 text-xs px-4 py-2 pr-9 rounded-lg font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
          >
            {countriesList.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.code})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>
      
      {/* Yield Curve Inversion Warning Banner */}
      {(() => {
        const latestHistory = history && history.length > 0 ? history[history.length - 1] : null;
        const isInverted = latestHistory && latestHistory.spread < 0;
        if (!isInverted) return null;
        return (
          <div className="bg-red-950/15 border border-red-900/40 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-red-200 shadow-sm animate-fade-in">
            <Info className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white uppercase font-mono block text-[9px] tracking-wider mb-1">
                ⚠️ Yield Curve Inversion Warning Detected ({latestHistory.spread.toFixed(2)}%)
              </span>
              <p className="text-red-300/80 text-[11px] leading-relaxed">
                The spread between long-term (10-Year) and short-term (2-Year) bond yields has gone negative. Historically, an inverted yield curve is a reliable indicator of macroeconomic contraction or recession risks within the next 12 to 18 months due to severe liquidity and credit transmission blockages.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Main Grid: Policy Stance and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Policy Stance HUD */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 flex flex-col items-center justify-between min-h-[220px]">
          <div className="w-full text-left">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block">Policy Stance Gauge</span>
            <span className="text-xs font-bold text-white mt-1 block">{cb_stance_label}</span>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#1f2937" strokeWidth="8" fill="transparent" />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={gaugeColor}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-bold font-mono text-white">{cb_stance_score}</span>
              <span className="text-[7px] font-mono text-gray-500 uppercase">Stance Index</span>
            </div>
          </div>

          <div className="flex justify-between w-full text-[8px] font-mono text-gray-500 border-t border-gray-850 pt-2">
            <span className="text-brand-green">Stimulus (&lt;45)</span>
            <span className="text-brand-blue">Neutral</span>
            <span className="text-brand-red">Tightening (&gt;65)</span>
          </div>
        </div>

        {/* Actionable Recommendations Panel */}
        <div className="lg:col-span-2 bg-[#13151e] border border-gray-800/40 rounded-xl p-5 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <span className="text-[9px] font-mono text-brand-blue uppercase font-bold tracking-widest block mb-2">
                🛠️ Policy Decision Recommendation Card
              </span>
              <p className="text-xs text-gray-300 leading-relaxed font-sans bg-gray-950/40 p-3.5 rounded-lg border border-gray-900">
                {policy_recommendation}
              </p>
            </div>
            
            <div className="bg-gray-950/50 border border-gray-900/60 p-3 rounded-lg flex flex-col justify-between font-mono text-[9px] text-gray-400">
              <div>
                <span className="text-[8px] text-gray-500 uppercase block mb-2">Taylor Rule Calibrator</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span>Target CPI:</span>
                    <span className="text-white font-bold">{metrics.inflation_target ? `${metrics.inflation_target.toFixed(1)}%` : "2.0%"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Neutral Real Rate:</span>
                    <span className="text-white font-bold">{metrics.neutral_real_rate ? `${metrics.neutral_real_rate.toFixed(1)}%` : "1.5%"}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-900 pt-1.5">
                    <span>Taylor Target:</span>
                    <span className="text-brand-blue font-bold">{metrics.taylor_recommended_rate ? `${metrics.taylor_recommended_rate.toFixed(2)}%` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual Rate:</span>
                    <span className="text-white font-bold">{metrics.repo_rate.toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-900 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[7.5px] text-gray-500 uppercase">Policy Gap</span>
                  <span className={`font-bold px-1 py-0.5 rounded text-[8px] ${
                    metrics.taylor_gap > 0.1 
                      ? "bg-red-500/10 text-brand-red" 
                      : metrics.taylor_gap < -0.1 
                        ? "bg-green-500/10 text-brand-green" 
                        : "bg-blue-500/10 text-brand-blue"
                  }`}>
                    {metrics.taylor_gap > 0 ? "+" : ""}{metrics.taylor_gap ? metrics.taylor_gap.toFixed(2) : "0.00"}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-3 text-[9px] font-mono text-gray-500 border-t border-gray-850 pt-3">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-brand-green" />
              Target CPI: 2.0% - 4.0%
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-brand-green" />
              Taylor Rule Calibrated
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-brand-green" />
              Real-time Ingestion Feed
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Dashboard: Core Variables */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { id: "gdp_growth", label: "GDP Growth", value: `${metrics.gdp_growth}%`, sub: "YoY Trend", icon: Activity, color: "text-brand-blue" },
          { id: "cpi_inflation", label: "CPI Inflation", value: `${metrics.cpi_inflation}%`, sub: `Core vs target`, icon: Percent, color: metrics.cpi_inflation > 4.0 ? "text-brand-red" : "text-brand-green" },
          { id: "repo_rate", label: "Repo Rate", value: `${metrics.repo_rate.toFixed(2)}%`, sub: "Policy rate", icon: Coins, color: "text-brand-yellow" },
          { id: "crr", label: "Cash Reserve (CRR)", value: `${metrics.crr.toFixed(2)}%`, sub: "Reserve req", icon: Coins, color: "text-brand-yellow" },
          { id: "unemployment", label: "Unemployment", value: `${metrics.unemployment}%`, sub: "Labor force", icon: Briefcase, color: "text-gray-400" },
          { id: "credit_growth", label: "Credit Growth", value: `${metrics.credit_growth}%`, sub: "Lending YoY", icon: TrendingUp, color: "text-brand-green" },
          { id: "iip", label: "Industrial (IIP)", value: `${metrics.iip}%`, sub: "Factory output", icon: Building2, color: metrics.iip > 0 ? "text-brand-green" : "text-brand-red" },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => fetchTrendHistory(item.id, item.label, item.value)}
            className="bg-[#13151e] border border-gray-800/40 rounded-xl p-3.5 shadow-md flex flex-col justify-between text-left cursor-pointer hover:border-brand-blue/40 hover:bg-[#181b28] transition-all hover:scale-[1.02] duration-200"
          >
            <div className="flex justify-between items-start w-full">
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider leading-tight max-w-[70%]">{item.label}</span>
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            </div>
            <div className="mt-2.5">
              <span className="text-lg font-bold font-mono text-white block">{item.value}</span>
              <span className="text-[8px] font-mono text-gray-600 mt-0.5 block flex items-center gap-1">
                {item.sub} <span className="text-[7px] text-brand-blue/70">🔍 Trend</span>
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Secondary Economic Variables Panel */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-[#13151e] border border-gray-800/40 p-4 rounded-xl text-xs">
        <button 
          onClick={() => fetchTrendHistory("iip", "Industrial Output (IIP)", `${metrics.iip}%`)}
          className="p-3 bg-gray-950/30 rounded-lg border border-gray-900 text-left hover:border-brand-blue/30 transition-colors"
        >
          <span className="text-[8px] font-mono text-gray-500 uppercase block">PMI Index</span>
          <span className="text-white font-bold block mt-1">Mfg: {metrics.pmi_mfg} • Svc: {metrics.pmi_svc}</span>
          <span className="text-[7px] font-mono text-brand-green mt-0.5 block flex justify-between">
            <span>Expansion (&gt;50)</span> <span className="text-brand-blue/70">🔍 Trend</span>
          </span>
        </button>

        <button 
          onClick={() => fetchTrendHistory("trade_balance", "Trade Balance", `${metrics.trade_balance} $B`)}
          className="p-3 bg-gray-950/30 rounded-lg border border-gray-900 text-left hover:border-brand-blue/30 transition-colors"
        >
          <span className="text-[8px] font-mono text-gray-500 uppercase block">Trade Balance</span>
          <span className="text-white font-bold block mt-1">{metrics.trade_balance > 0 ? `+` : ``}{metrics.trade_balance} $B</span>
          <span className="text-[7px] font-mono text-gray-600 mt-0.5 block flex justify-between">
            <span>Net Exports surplus</span> <span className="text-brand-blue/70">🔍 Trend</span>
          </span>
        </button>

        <button 
          onClick={() => fetchTrendHistory("fx_reserves", "Foreign Exchange Reserves", `${metrics.fx_reserves.toFixed(1)} $B`)}
          className="p-3 bg-gray-950/30 rounded-lg border border-gray-900 text-left hover:border-brand-blue/30 transition-colors"
        >
          <span className="text-[8px] font-mono text-gray-500 uppercase block">Foreign Reserves</span>
          <span className="text-white font-bold block mt-1">{metrics.fx_reserves.toFixed(1)} $B</span>
          <span className="text-[7px] font-mono text-brand-blue mt-0.5 block flex justify-between">
            <span>Reserves Cushion</span> <span className="text-brand-blue/70">🔍 Trend</span>
          </span>
        </button>

        <button 
          onClick={() => fetchTrendHistory("exchange_rate", "FX Exchange Rate", metrics.exchange_rate)}
          className="p-3 bg-gray-950/30 rounded-lg border border-gray-900 text-left hover:border-brand-blue/30 transition-colors"
        >
          <span className="text-[8px] font-mono text-gray-500 uppercase block">FX Spot Rate</span>
          <span className="text-white font-bold block mt-1">{metrics.exchange_rate}</span>
          <span className="text-[7px] font-mono text-gray-600 mt-0.5 block flex justify-between">
            <span>Currency Value</span> <span className="text-brand-blue/70">🔍 Trend</span>
          </span>
        </button>

        <button 
          onClick={() => fetchTrendHistory("import_cover", "Import Cover Index", `${metrics.import_cover} Months`)}
          className="p-3 bg-gray-950/30 rounded-lg border border-gray-900 text-left hover:border-brand-blue/30 transition-colors"
        >
          <span className="text-[8px] font-mono text-gray-500 uppercase block">Import Cover Index</span>
          <span className="text-white font-bold block mt-1">{metrics.import_cover ? `${metrics.import_cover} Months` : "N/A"}</span>
          <span className="text-[7px] font-mono mt-0.5 block flex justify-between">
            <span className={metrics.import_cover >= 10 ? "text-brand-green" : metrics.import_cover >= 6 ? "text-brand-blue" : "text-brand-yellow"}>
              {metrics.import_cover >= 10 ? "Excellent Cover" : metrics.import_cover >= 6 ? "Sufficient Cover" : "Vulnerable Cover"}
            </span> 
            <span className="text-brand-blue/70">🔍 Trend</span>
          </span>
        </button>
      </div>

      {/* Advanced Charting panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Growth & Industrial Output */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
          <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-4">
            📈 Real Economy: GDP vs Industrial Output (IIP) YoY
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="gdpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#29b6f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#29b6f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="iipGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fontSize: 8, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 8, fill: "#9ca3af" }} domain={["auto", "auto"]} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Area type="monotone" name="GDP Growth" dataKey="gdp" stroke="#29b6f6" strokeWidth={1.5} fillOpacity={1} fill="url(#gdpGrad)" />
                <Area type="monotone" name="IIP Growth" dataKey="iip" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#iipGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Inflation vs Policy Rate */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
          <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-4">
            🎯 Policy Stance: CPI Inflation vs central bank Repo rate
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fontSize: 8, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 8, fill: "#9ca3af" }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Line type="monotone" name="CPI Inflation" dataKey="cpi" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" name="Policy Repo Rate" dataKey="repo" stroke="#ffa726" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Yield Curve Spreads */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
          <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-4">
            📊 Debt Markets: Yield Curve Spread (10Y vs 2Y)
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fontSize: 8, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 8, fill: "#9ca3af" }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Line type="monotone" name="10Y Yield" dataKey="yield_10y" stroke="#ab47bc" strokeWidth={1.5} dot={false} />
                <Line type="monotone" name="2Y Yield" dataKey="yield_2y" stroke="#26a69a" strokeWidth={1.5} dot={false} />
                <Line type="monotone" name="10Y-2Y Spread" dataKey="spread" stroke="#29b6f6" strokeWidth={2} dot={{ r: 1 }} />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Credit vs Liquidity */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
          <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-4">
            🏦 Monetary Plumbing: Credit Growth vs Injected Liquidity Index
          </h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="liquidityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffa726" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ffa726" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fontSize: 8, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 8, fill: "#9ca3af" }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Area type="monotone" name="Liquidity Index" dataKey="liquidity" stroke="#ffa726" strokeWidth={1.5} fill="url(#liquidityGrad)" />
                <Line type="monotone" name="Bank Loan Growth" dataKey="credit" stroke="#00e676" strokeWidth={2} dot={{ r: 1 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 30-Year Trend Analysis Modal */}
      {activeTrend && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setActiveTrend(null)} />
          
          <div className="relative w-full max-w-2xl bg-bg-card border border-gray-800 shadow-2xl rounded-2xl flex flex-col z-10 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-start bg-gray-950/40">
              <div>
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">
                  30-Year Long-Term Analysis
                </span>
                <h3 className="text-md font-heading font-extrabold text-white mt-0.5">
                  {flag} {name} — {activeTrend.label} Trend (1996 - 2026)
                </h3>
              </div>
              <button 
                onClick={() => setActiveTrend(null)}
                className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            {trendLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-brand-green/30 border-t-brand-green animate-spin" />
                <span className="text-xs font-mono text-gray-500">Querying 30-Year historical database...</span>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Stats Summary bar */}
                <div className="flex justify-between items-center bg-gray-950/40 p-4 rounded-xl border border-gray-900 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <span className="text-[8px] text-gray-550 uppercase block">Current Stated Stance Value</span>
                      <span className="text-base font-bold text-white mt-0.5 block">{activeTrend.currentVal}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-550 uppercase block">Historical Range</span>
                      <span className="text-base font-bold text-brand-blue mt-0.5 block">
                        {trendHistory.length > 0 
                          ? `${Math.min(...trendHistory.map(h => h.value))}${isTrendPercentage ? "%" : ""} to ${Math.max(...trendHistory.map(h => h.value))}${isTrendPercentage ? "%" : ""}`
                          : "—"
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end pl-4 border-l border-gray-800">
                    <span className="text-[8px] text-gray-550 uppercase tracking-wider block">Frequency</span>
                    <select
                      value={selectedFrequency}
                      onChange={(e) => {
                        const freq = e.target.value;
                        setSelectedFrequency(freq);
                        fetchTrendHistory(activeTrend.indicator, activeTrend.label, activeTrend.currentVal, freq);
                      }}
                      className="bg-gray-950 border border-gray-800 text-[10px] text-white rounded px-2 py-1 focus:ring-1 focus:ring-brand-blue focus:outline-none cursor-pointer"
                    >
                      <option value="yearly">Yearly</option>
                      <option value="monthly">Monthly (MoM)</option>
                      <option value="quarterly">Quarterly (3-Months)</option>
                    </select>
                  </div>
                </div>

                {/* The 30Y Recharts Curve */}
                <div className="h-64 border border-gray-900 rounded-xl p-4 bg-gray-950/20">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={trendHistory}>
                      <defs>
                        <linearGradient id="modalTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#29b6f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#29b6f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="year" tick={{ fontSize: 8, fill: "#6b7280" }} interval={3} />
                      <YAxis tick={{ fontSize: 8, fill: "#9ca3af" }} />
                      <Tooltip content={<ModalChartTooltip />} />
                      <Area 
                        type="monotone" 
                        name={activeTrend.label} 
                        dataKey="value" 
                        stroke="#29b6f6" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#modalTrendGrad)" 
                      />
                      {activeTrend.indicator === "gdp_growth" && (
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Historical Milestones */}
                <div className="space-y-2">
                  <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-blue" />
                    <span>Key Macro Historical Milestones (1996 - 2026)</span>
                  </h4>
                  <div className="space-y-2 font-sans text-xs">
                    {getTrendMilestones(activeTrend.indicator).map((milestone, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start p-2 rounded-lg bg-gray-900/30 border border-gray-900">
                        <span className="font-bold text-brand-blue font-mono min-w-[35px]">{milestone.year}</span>
                        <p className="text-gray-400 leading-snug">{milestone.event}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Modal Footer */}
            <div className="p-4 bg-gray-950/40 border-t border-gray-900 flex justify-end">
              <button 
                onClick={() => setActiveTrend(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
