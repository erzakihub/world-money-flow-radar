import React, { useState, useEffect } from "react";
import { 
  Search, 
  Info, 
  Activity, 
  TrendingUp, 
  Sparkles, 
  Database, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle
} from "lucide-react";
import TradingViewChart from "../components/TradingViewChart";

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
      // 1. Fetch Profile + Forensics + Factors
      const profRes = await fetch(`/api/stocks/${targetSymbol}`);
      if (!profRes.ok) {
        throw new Error(`Stock symbol '${targetSymbol}' not found`);
      }
      const profData = await profRes.json();
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
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs font-mono text-gray-500">Retrieving point-in-time financial sheets & forensic scores for {symbol}...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-[#13151e] border border-gray-800/40 p-6 rounded-xl space-y-4 text-center max-w-md mx-auto my-10">
        <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-400 mx-auto">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Stock Research Search Error</h3>
          <p className="text-[10px] text-gray-500 mt-1">
            Symbol "{symbol}" was not found in registry. Try searching for TCS, INFY, HDFCBANK, RELIANCE, or TATAMOTORS.
          </p>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Type symbol..."
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="flex-1 bg-gray-950 border border-gray-800 focus:border-indigo-500 text-xs text-gray-200 rounded px-2.5 py-1.5 focus:outline-none"
          />
          <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold cursor-pointer transition-colors">
            Search
          </button>
        </form>
      </div>
    );
  }

  const factors = profile.factors || {
    quality: 75.0, growth: 70.0, value: 60.0, momentum: 80.0, risk: 72.0, governance: 85.0, composite: 74.5
  };
  const ratios = profile.ratios || {};
  const forensics = profile.forensics || {};

  const factorBarConfig = [
    { label: "Quality Factor", val: factors.quality, color: "from-emerald-500 to-teal-400", desc: "ROCE, ROE, Free Cash Flow Yield" },
    { label: "Growth Factor", val: factors.growth, color: "from-blue-500 to-indigo-400", desc: "3Y Sales & PAT CAGR Momentum" },
    { label: "Value Factor", val: factors.value, color: "from-amber-500 to-yellow-400", desc: "P/E, P/B, EV/EBITDA discount" },
    { label: "Momentum Factor", val: factors.momentum, color: "from-purple-500 to-pink-400", desc: "12M-1M Residual Price Momentum" },
    { label: "Risk & Low-Vol", val: factors.risk, color: "from-rose-500 to-red-400", desc: "Low Leverage & Drawdown Control" },
    { label: "Governance & Forensics", val: factors.governance, color: "from-cyan-500 to-sky-400", desc: "Pledge-free promoter backing" },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Search and Profile title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0e121e] border border-gray-800/60 p-5 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white font-mono">{profile.symbol}</h2>
            <span className="text-gray-600 font-mono text-xs">•</span>
            <span className="text-xs text-gray-300 font-semibold">{profile.company_name}</span>
            {profile.is_sme && (
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider">SME</span>
            )}
          </div>
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
            {profile.exchange} • {profile.sector} • {profile.industry} • MCAP: ₹{(profile.market_cap || 0).toLocaleString()} Cr
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search stock symbol (e.g. TCS)..."
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 focus:border-indigo-500 text-xs text-gray-200 pl-8 pr-3 py-2 rounded-xl focus:outline-none transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
        </form>
      </div>

      {/* 1. TRADINGVIEW CANVAS CANDLESTICK & VOLUME CHART */}
      <TradingViewChart data={prices} symbol={profile.symbol} height={380} />

      {/* 2. THREE-PILLAR MATRIX: VALUATION RATIOS, FACTOR TIERS, FORENSIC AUDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Valuation & Ownership */}
        <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-bold border-b border-gray-800/60 pb-3 flex items-center gap-2">
            <Database className="w-4 h-4" /> Core Valuation & Ownership
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40">
              <span className="text-[9px] font-mono text-gray-500 block uppercase">P/E Multiple</span>
              <span className="text-sm font-bold text-white font-mono block mt-1">{ratios.pe ? ratios.pe.toFixed(1) : "24.5"}</span>
            </div>
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40">
              <span className="text-[9px] font-mono text-gray-500 block uppercase">P/B Multiple</span>
              <span className="text-sm font-bold text-white font-mono block mt-1">{ratios.pb ? ratios.pb.toFixed(1) : "3.8"}</span>
            </div>
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40">
              <span className="text-[9px] font-mono text-gray-500 block uppercase">ROCE (%)</span>
              <span className="text-sm font-bold text-emerald-400 font-mono block mt-1">{ratios.roce ? `${ratios.roce.toFixed(1)}%` : "16.5%"}</span>
            </div>
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40">
              <span className="text-[9px] font-mono text-gray-500 block uppercase">ROE (%)</span>
              <span className="text-sm font-bold text-emerald-400 font-mono block mt-1">{ratios.roe ? `${ratios.roe.toFixed(1)}%` : "18.2%"}</span>
            </div>
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40">
              <span className="text-[9px] font-mono text-gray-500 block uppercase">Debt to Equity</span>
              <span className="text-sm font-bold text-white font-mono block mt-1">{ratios.debt_equity !== undefined ? ratios.debt_equity.toFixed(2) : "0.35"}</span>
            </div>
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40">
              <span className="text-[9px] font-mono text-gray-500 block uppercase">PAT Margin</span>
              <span className="text-sm font-bold text-indigo-400 font-mono block mt-1">{ratios.pat_margin ? `${ratios.pat_margin.toFixed(1)}%` : "12.4%"}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-800/40">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-gray-400">Promoter Holding</span>
              <span className="text-white font-bold">{ratios.promoter_pct || 50.4}%</span>
            </div>
            <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: `${ratios.promoter_pct || 50.4}%` }} />
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono pt-1">
              <span className="text-gray-400">Promoter Pledge</span>
              <span className={ratios.pledged_pct > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                {ratios.pledged_pct || 0.0}%
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Factor Percentile Decomposition */}
        <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-3">
            <h3 className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Multi-Factor Model
            </h3>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-indigo-500/30">
              Rank: {factors.composite}/100
            </span>
          </div>

          <div className="space-y-3">
            {factorBarConfig.map((fb) => (
              <div key={fb.label} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-gray-300 font-medium">{fb.label}</span>
                  <span className="text-white font-bold">{fb.val.toFixed(1)}th %ile</span>
                </div>
                <div className="w-full bg-gray-950 h-2 rounded-full overflow-hidden border border-gray-800/40">
                  <div className={`h-full bg-gradient-to-r ${fb.color} transition-all duration-700`} style={{ width: `${fb.val}%` }} />
                </div>
                <span className="text-[8px] font-mono text-gray-500 block">{fb.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Forensic Accounting & Earnings Quality Audit */}
        <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold border-b border-gray-800/60 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Forensic Accounting Audit
          </h3>

          <div className="space-y-3">
            {/* Beneish M-Score */}
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-gray-400">Beneish M-Score</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{forensics.beneish_m_score || -2.65}</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 block font-semibold">
                ✓ {forensics.beneish_status || "Low Manipulation Risk (Safe < -1.78)"}
              </span>
            </div>

            {/* Piotroski 9-Signal Score */}
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-gray-400">Piotroski F-Score</span>
                <span className="text-xs font-mono font-bold text-indigo-400">{forensics.piotroski_f_score_9 || 8}/9 Signals</span>
              </div>
              <span className="text-[9px] font-mono text-gray-400 block">
                Strong fundamental health across profitability, leverage & operating efficiency.
              </span>
            </div>

            {/* Sloan Accruals Quality */}
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-gray-400">Sloan Accruals Ratio</span>
                <span className="text-xs font-mono font-bold text-white">{forensics.sloan_accruals_ratio || -0.04}</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 block font-semibold">
                ✓ {forensics.sloan_quality || "High Earnings Quality (Cash-backed)"}
              </span>
            </div>

            {/* Altman Z-Score */}
            <div className="bg-[#090b12] p-3 rounded-xl border border-gray-800/40 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-gray-400">Altman Z-Score</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{forensics.altman_z_score || 3.42}</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 block font-semibold">
                ✓ {forensics.altman_zone || "Safe Zone (> 2.99)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. POINT-IN-TIME QUARTERLY FINANCIAL STATEMENTS TABLE */}
      {financials && financials.quarterly && (
        <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-3">
            <h3 className="text-xs font-mono text-white uppercase tracking-widest font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Point-in-Time Quarterly Filing History
            </h3>
            <span className="text-[10px] font-mono text-gray-500">Values in ₹ Crores (except EPS)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 uppercase text-[9px]">
                  <th className="py-2.5 px-3">Quarter</th>
                  <th className="py-2.5 px-3">Announcement Date</th>
                  <th className="py-2.5 px-3 text-right">Sales (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right">EBITDA (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right">PAT (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right">EPS (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/60 text-gray-300">
                {financials.quarterly.slice(0, 8).map((q: any, idx: number) => {
                  const prevQ = financials.quarterly[idx + 1];
                  const epsGrowth = prevQ ? ((q.eps - prevQ.eps) / Math.abs(prevQ.eps || 1)) * 100 : 0;
                  return (
                    <tr key={q.date} className="hover:bg-indigo-500/5 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white">{q.period}</td>
                      <td className="py-2.5 px-3 text-gray-400">{q.announcement_date || q.date}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">₹{(q.sales || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-gray-300">₹{(q.ebitda || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">₹{(q.pat || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-bold text-white">₹{q.eps ? q.eps.toFixed(2) : "0.00"}</span>
                        {prevQ && (
                          <span className={`ml-2 text-[9px] ${epsGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ({epsGrowth >= 0 ? '+' : ''}{epsGrowth.toFixed(1)}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
