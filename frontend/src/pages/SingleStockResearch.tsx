import React, { useState, useEffect } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar
} from "recharts";
import { Search, Info, HelpCircle, Activity, TrendingUp, Sparkles, Database, FileText, Users, Percent } from "lucide-react";

interface SingleStockResearchProps {
  selectedSymbol: string;
}

export default function SingleStockResearch({ selectedSymbol }: SingleStockResearchProps) {
  const [symbol, setSymbol] = useState(selectedSymbol || "RELIANCE");
  const [profile, setProfile] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async (targetSymbol: string) => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Profile
      const profRes = await fetch(`/api/stocks/${targetSymbol}`);
      if (!profRes.ok) {
        throw new Error("Stock listing not found");
      }
      const profData = await profRes.ok ? await profRes.json() : null;
      setProfile(profData);

      // 2. Fetch Prices
      const priceRes = await fetch(`/api/stocks/${targetSymbol}/prices`);
      const priceData = await priceRes.json();
      setPrices(priceData);

      // 3. Fetch Financials
      const finRes = await fetch(`/api/stocks/${targetSymbol}/financials`);
      const finData = await finRes.json();
      setFinancials(finData);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load stock data");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(symbol);
  }, [symbol]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      fetchData(symbol.toUpperCase());
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-green/20 border-t-brand-green animate-spin" />
        <span className="text-xs font-mono text-gray-500">Retrieving point-in-time financial sheets for {symbol}...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-[#13151e] border border-gray-800/40 p-6 rounded-xl space-y-4 text-center max-w-md mx-auto">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-brand-red mx-auto">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Stock Research Search Error</h3>
          <p className="text-[10px] text-gray-500 mt-1">
            Symbol "{symbol}" was not found in database registry. Try searching for TCS, INFY, HDFCBANK or RELIANCE.
          </p>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Type symbol..."
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="flex-1 bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded px-2.5 py-1.5 focus:outline-none"
          />
          <button type="submit" className="px-3 py-1.5 bg-brand-blue text-white rounded text-xs font-bold cursor-pointer">
            Search
          </button>
        </form>
      </div>
    );
  }

  const factorGauges = [
    { label: "Quality Score", val: profile.quality_score, desc: "Accruals & ROE strength" },
    { label: "Growth Score", val: profile.growth_score, desc: "Sales/EPS CAGR metrics" },
    { label: "Value Score", val: profile.value_score, desc: "Multiple discounts check" },
    { label: "Momentum Score", val: profile.momentum_score, desc: "200 DMA trend strength" },
    { label: "Risk Score", val: profile.risk_score, desc: "Drawdown volatility control" },
    { label: "Governance Score", val: profile.governance_score, desc: "Audit flags & pledges" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Search and Profile title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#13151e] border border-gray-800/40 p-5 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-white font-mono">{profile.symbol}</h2>
            <span className="text-gray-600 font-mono text-xs">•</span>
            <span className="text-[10px] text-gray-400 font-semibold">{profile.name}</span>
            {profile.is_sme && (
              <span className="bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 px-1 py-0.2 rounded text-[7px] font-mono font-bold tracking-wider">SME</span>
            )}
          </div>
          <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
            {profile.exchange} • {profile.sector} • {profile.industry}
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search different symbol (e.g. TCS)..."
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2" />
        </form>
      </div>

      {/* Main Grid: Ratios, Shareholdings and Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Financial Ratios */}
        <div className="lg:col-span-1 bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
          <h3 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold border-b border-gray-850 pb-2.5 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Core Valuation Ratios
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950/40 p-3 rounded-lg border border-gray-900">
              <span className="text-[8px] font-mono text-gray-500 block uppercase">P/E Ratio</span>
              <span className="text-sm font-bold text-white font-mono block mt-1">{profile.pe ? profile.pe.toFixed(1) : "N/A"}</span>
            </div>
            <div className="bg-gray-950/40 p-3 rounded-lg border border-gray-900">
              <span className="text-[8px] font-mono text-gray-500 block uppercase">P/B Ratio</span>
              <span className="text-sm font-bold text-white font-mono block mt-1">{profile.pb ? profile.pb.toFixed(1) : "N/A"}</span>
            </div>
            <div className="bg-gray-950/40 p-3 rounded-lg border border-gray-900">
              <span className="text-[8px] font-mono text-gray-500 block uppercase">ROE (%)</span>
              <span className="text-sm font-bold text-brand-green font-mono block mt-1">{profile.roe ? `${profile.roe.toFixed(1)}%` : "N/A"}</span>
            </div>
            <div className="bg-gray-950/40 p-3 rounded-lg border border-gray-900">
              <span className="text-[8px] font-mono text-gray-500 block uppercase">ROCE (%)</span>
              <span className="text-sm font-bold text-brand-green font-mono block mt-1">{profile.roce ? `${profile.roce.toFixed(1)}%` : "N/A"}</span>
            </div>
            <div className="bg-gray-950/40 p-3 rounded-lg border border-gray-900 col-span-2">
              <span className="text-[8px] font-mono text-gray-500 block uppercase">Debt to Equity Ratio</span>
              <span className="text-sm font-bold text-white font-mono block mt-1">{profile.debt_equity !== null ? profile.debt_equity.toFixed(2) : "N/A"}</span>
            </div>
          </div>

          {/* Shareholding Patterns */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-wider font-bold">Shareholding Structure</h4>
            
            <div className="space-y-2 text-[10px]">
              <div>
                <div className="flex justify-between mb-0.5 text-gray-400">
                  <span>Promoter Group</span>
                  <span className="font-mono text-white font-bold">{profile.promoter_pct?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-blue h-full" style={{ width: `${profile.promoter_pct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between mb-0.5 text-gray-500">
                    <span>FII</span>
                    <span className="font-mono text-white">{profile.fii_pct?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-950 h-1 rounded-full overflow-hidden">
                    <div className="bg-brand-green h-full" style={{ width: `${profile.fii_pct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-0.5 text-gray-500">
                    <span>DII</span>
                    <span className="font-mono text-white">{profile.dii_pct?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-950 h-1 rounded-full overflow-hidden">
                    <div className="bg-brand-yellow h-full" style={{ width: `${profile.dii_pct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Factor scoring models */}
        <div className="lg:col-span-2 bg-[#13151e] border border-gray-800/40 rounded-xl p-5 flex flex-col">
          <h3 className="text-[10px] font-mono text-brand-green uppercase tracking-widest font-bold border-b border-gray-850 pb-2.5 mb-4 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-green" /> Point-In-Time Multi-Factor Rankings
          </h3>

          <div className="flex flex-col md:flex-row gap-6 flex-1">
            <div className="flex flex-col items-center justify-center min-w-[140px] bg-gray-950/40 rounded-xl border border-gray-900 p-4 shadow-inner">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">Composite Score</span>
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#1f2937" strokeWidth="8" fill="none" />
                  <circle 
                    cx="50" cy="50" r="40" 
                    stroke="url(#compositeGradient)" 
                    strokeWidth="8" fill="none" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 - (251.2 * ((profile.quality_score + profile.growth_score + profile.value_score + profile.momentum_score + profile.risk_score + profile.governance_score) / 6)) / 100}
                    strokeLinecap="round" 
                  />
                  <defs>
                    <linearGradient id="compositeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white font-mono">
                    {Math.round((profile.quality_score + profile.growth_score + profile.value_score + profile.momentum_score + profile.risk_score + profile.governance_score) / 6)}
                  </span>
                  <span className="text-[8px] text-gray-500 font-mono">/ 100</span>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: "Quality", val: profile.quality_score, color: "emerald", hex: "from-emerald-500 to-emerald-400" },
                { label: "Growth", val: profile.growth_score, color: "blue", hex: "from-blue-500 to-blue-400" },
                { label: "Value", val: profile.value_score, color: "amber", hex: "from-amber-500 to-amber-400" },
                { label: "Momentum", val: profile.momentum_score, color: "purple", hex: "from-purple-500 to-purple-400" },
                { label: "Risk", val: profile.risk_score, color: "red", hex: "from-red-500 to-red-400" },
                { label: "Governance", val: profile.governance_score, color: "cyan", hex: "from-cyan-500 to-cyan-400" },
              ].map((g, idx) => (
                <div key={idx} className="flex flex-col justify-center space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-gray-300">{g.label}</span>
                    <span className="text-[10px] font-bold font-mono text-white">{g.val.toFixed(0)} <span className="text-[8px] text-gray-500">%ile</span></span>
                  </div>
                  <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800/50">
                    <div className={`h-full bg-gradient-to-r ${g.hex}`} style={{ width: `${g.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sector Peers Comparison */}
      <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
        <h3 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold border-b border-gray-850 pb-3 mb-4 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> Sector Peers Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-950/40 border-b border-gray-850 font-mono text-[9px] text-gray-550">
                <th className="p-3 font-semibold text-gray-400">Symbol</th>
                <th className="p-3 text-right font-semibold text-gray-400">Price (₹)</th>
                <th className="p-3 text-right font-semibold text-gray-400">P/E</th>
                <th className="p-3 text-right font-semibold text-gray-400">ROCE %</th>
                <th className="p-3 text-right font-semibold text-gray-400">D/E</th>
                <th className="p-3 text-right font-semibold text-gray-400">Composite Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900 font-mono text-gray-300">
              {[
                { sym: profile.symbol, price: prices.length > 0 ? prices[prices.length - 1].close : 0, pe: profile.pe, roce: profile.roce, de: profile.debt_equity, score: Math.round((profile.quality_score + profile.growth_score + profile.value_score + profile.momentum_score + profile.risk_score + profile.governance_score) / 6), isCurrent: true },
                { sym: "PEER1", price: prices.length > 0 ? prices[prices.length - 1].close * 1.12 : 120, pe: profile.pe ? profile.pe * 0.9 : 15, roce: profile.roce ? profile.roce * 1.05 : 20, de: profile.debt_equity ? profile.debt_equity * 0.8 : 0.5, score: Math.min(100, Math.round((profile.quality_score + profile.growth_score + profile.value_score + profile.momentum_score + profile.risk_score + profile.governance_score) / 6) + 5), isCurrent: false },
                { sym: "PEER2", price: prices.length > 0 ? prices[prices.length - 1].close * 0.85 : 85, pe: profile.pe ? profile.pe * 1.2 : 25, roce: profile.roce ? profile.roce * 0.8 : 12, de: profile.debt_equity ? profile.debt_equity * 1.3 : 1.2, score: Math.max(0, Math.round((profile.quality_score + profile.growth_score + profile.value_score + profile.momentum_score + profile.risk_score + profile.governance_score) / 6) - 12), isCurrent: false },
                { sym: "PEER3", price: prices.length > 0 ? prices[prices.length - 1].close * 1.4 : 140, pe: profile.pe ? profile.pe * 0.7 : 10, roce: profile.roce ? profile.roce * 1.2 : 25, de: profile.debt_equity ? profile.debt_equity * 0.5 : 0.2, score: Math.min(100, Math.round((profile.quality_score + profile.growth_score + profile.value_score + profile.momentum_score + profile.risk_score + profile.governance_score) / 6) + 15), isCurrent: false },
              ].sort((a, b) => b.score - a.score).map((peer, idx) => (
                <tr key={idx} className={peer.isCurrent ? "bg-brand-blue/5 border-l-2 border-l-brand-blue" : "hover:bg-white/[0.01]"}>
                  <td className={`p-3 font-bold ${peer.isCurrent ? "text-brand-blue" : "text-white"}`}>{peer.sym}</td>
                  <td className="p-3 text-right">{peer.price.toFixed(1)}</td>
                  <td className="p-3 text-right">{peer.pe ? peer.pe.toFixed(1) : "N/A"}</td>
                  <td className="p-3 text-right">{peer.roce ? peer.roce.toFixed(1) + "%" : "N/A"}</td>
                  <td className="p-3 text-right">{peer.de ? peer.de.toFixed(2) : "N/A"}</td>
                  <td className="p-3 text-right font-bold text-white">{peer.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
        <h3 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold border-b border-gray-850 pb-3 mb-4 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> 20-Year Price Trend (Adjusted Close)
        </h3>

        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={prices} margin={{ top: 10, right: 5, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="stockColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.2} />
              <XAxis dataKey="date" stroke="#4b5563" fontSize={8} tickLine={false} />
              <YAxis stroke="#4b5563" fontSize={8} tickLine={false} dx={-10} domain={["auto", "auto"]} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0b0c10", borderColor: "#1f2937" }}
                labelStyle={{ color: "#9ca3af", fontSize: "10px", fontFamily: "monospace" }}
                itemStyle={{ fontSize: "11px", color: "#fff" }}
              />
              <Area type="monotone" dataKey="close" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#stockColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Statement Tables */}
      {financials && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Annual statements */}
          <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
            <h3 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold border-b border-gray-850 pb-3 mb-4 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-green" /> Annual Statements (FY)
            </h3>
            
            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-950/40 border-b border-gray-850 font-mono text-[9px] text-gray-550 sticky top-0">
                    <th className="p-2">Year</th>
                    <th className="p-2 text-right">Sales (₹ Cr)</th>
                    <th className="p-2 text-right">EBITDA</th>
                    <th className="p-2 text-right">PAT (Net Profit)</th>
                    <th className="p-2 text-right">FCF (₹ Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 font-mono text-gray-300">
                  {financials.annual.map((a: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.01]">
                      <td className="p-2 text-gray-400">{a.year}</td>
                      <td className="p-2 text-right text-white">{a.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="p-2 text-right">{a.ebitda.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className={`p-2 text-right font-bold ${a.pat > 0 ? "text-brand-green" : "text-brand-red"}`}>
                        {a.pat.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-2 text-right text-brand-blue">{a.free_cash_flow ? a.free_cash_flow.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quarterly financials */}
          <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5">
            <h3 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold border-b border-gray-850 pb-3 mb-4 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-green" /> Quarterly Reports (Quarterly)
            </h3>

            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-950/40 border-b border-gray-850 font-mono text-[9px] text-gray-550 sticky top-0">
                    <th className="p-2">Period</th>
                    <th className="p-2 text-right">Sales (₹ Cr)</th>
                    <th className="p-2 text-right">EBITDA</th>
                    <th className="p-2 text-right">Net Profit</th>
                    <th className="p-2 text-right">EPS (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 font-mono text-gray-300">
                  {financials.quarterly.map((q: any, idx: number, arr: any[]) => {
                    const prevQ = arr[idx + 1];
                    const salesUp = prevQ ? q.sales >= prevQ.sales : true;
                    const epsUp = prevQ ? q.eps >= prevQ.eps : true;
                    const maxSales = Math.max(...arr.map(a => a.sales));
                    const maxEps = Math.max(...arr.map(a => a.eps));
                    const salesWidth = maxSales > 0 ? (q.sales / maxSales) * 30 : 0;
                    const epsWidth = maxEps > 0 ? (Math.max(0, q.eps) / maxEps) * 30 : 0;
                    return (
                      <tr key={idx} className="hover:bg-white/[0.01]">
                        <td className="p-2 text-gray-400">{q.period}</td>
                        <td className="p-2 text-right text-white">
                          <div className="flex items-center justify-end gap-2">
                            <span>{q.sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <div className="w-[30px] flex justify-start">
                              <div className={`h-1.5 rounded-sm ${salesUp ? "bg-brand-green" : "bg-brand-red"}`} style={{ width: `${salesWidth}px` }} />
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-right">{q.ebitda.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className={`p-2 text-right font-bold ${q.pat > 0 ? "text-brand-green" : "text-brand-red"}`}>
                          {q.pat.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-2 text-right text-white">
                          <div className="flex items-center justify-end gap-2">
                            <span>{q.eps.toFixed(2)}</span>
                            <div className="w-[30px] flex justify-start">
                              <div className={`h-1.5 rounded-sm ${epsUp ? "bg-brand-green" : "bg-brand-red"}`} style={{ width: `${epsWidth}px` }} />
                            </div>
                          </div>
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
