import React, { useState, useEffect } from "react";
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Search, 
  Filter, 
  Clock, 
  Globe, 
  ChevronRight, 
  ArrowUpRight,
  Info,
  X,
  Target
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import DataQualityBadge from "../components/DataQualityBadge";
import BullRunSignalBadge from "../components/BullRunSignalBadge";

export default function ApexLeadPredictor() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const { formatPrice, getSymbol } = useCurrency();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/apex-predictor/all-assets");
      const result = await res.json();
      setData(result || {});
    } catch (e) {
      console.error("Failed to fetch Apex Predictor data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-brand-green/30 border-t-brand-green animate-spin" />
          <span className="text-xs font-mono text-gray-400">Initializing Apex Lead Confluence Engine…</span>
        </div>
      </div>
    );
  }

  const { assets = [], market_confluence_avg, top_lead_asset, top_lead_score, active_twin_regime } = data;

  const categories = ["All", "Indian Equities", "Global Equities", "Commodities & Metals", "Digital Assets", "Fixed Income"];

  const filteredAssets = assets.filter((asset: any) => {
    const matchesCategory = selectedCategory === "All" || asset.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-brand-green glow-green";
    if (score >= 65) return "text-emerald-400";
    if (score >= 50) return "text-white";
    return "text-brand-red glow-red";
  };

  const getBadgeStyle = (score: number) => {
    if (score >= 80) return "bg-brand-green/10 text-brand-green border-brand-green/20";
    if (score >= 65) return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    if (score >= 50) return "bg-gray-800 text-gray-300 border-gray-700";
    return "bg-brand-red/10 text-brand-red border-brand-red/20";
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#121624] via-[#151b2e] to-[#121624] p-5 rounded-2xl border border-brand-green/20 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-green/15 text-brand-green border border-brand-green/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-brand-green fill-brand-green" />
              World-First Invention
            </span>
            <span className="text-[9px] font-mono text-gray-400">Multi-Vector Predictive Lead Engine</span>
          </div>
          <h2 className="text-2xl font-heading font-extrabold text-white tracking-tight flex items-center gap-2">
            Apex Macro Predictor
          </h2>
          <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
            Predicting 3M, 6M, and 12M forward price trajectories across global & Indian asset classes by fusing sovereign liquidity impulses, cross-border capital vectors, SIP absorption velocity, and 30-year macro regime similarity.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 z-10">
          <div className="bg-gray-900/80 border border-gray-800 p-3 rounded-xl flex items-center gap-4">
            <div>
              <span className="text-[8px] font-mono text-gray-500 uppercase block">Top Lead Asset</span>
              <span className="text-sm font-heading font-bold text-brand-green flex items-center gap-1">
                {top_lead_asset} <span className="text-xs text-brand-green font-mono">({top_lead_score})</span>
              </span>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div>
              <span className="text-[8px] font-mono text-gray-500 uppercase block">Market Confluence Avg</span>
              <span className="text-sm font-mono font-bold text-white">{market_confluence_avg} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Twin Regime Spotlight */}
      {active_twin_regime && (
        <div className="bg-[#13151e] border border-gray-800/60 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center shrink-0 mt-0.5">
              <Layers className="w-4 h-4 text-brand-blue" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-brand-blue uppercase tracking-wider font-bold">30Y Historical Twin Regime Match ({active_twin_regime.similarity_score}%)</span>
                <span className="text-[9px] font-mono text-gray-500">{active_twin_regime.period}</span>
              </div>
              <h4 className="text-xs font-semibold text-white">{active_twin_regime.regime_name}</h4>
              <p className="text-[10px] text-gray-400">{active_twin_regime.driver}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-center text-[10px] font-mono shrink-0 bg-gray-900/60 px-4 py-2 rounded-lg border border-gray-800/40">
            <div>
              <span className="text-gray-500 block text-[8px]">Nifty 12M</span>
              <span className="text-brand-green font-bold">{active_twin_regime.nifty_fwd_12m}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[8px]">Gold 12M</span>
              <span className="text-brand-green font-bold">{active_twin_regime.gold_fwd_12m}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[8px]">S&P 500 12M</span>
              <span className="text-brand-green font-bold">{active_twin_regime.sp500_fwd_12m}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap bg-gray-950/60 p-1 rounded-xl border border-gray-800/60 gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-[10px] font-mono rounded-lg transition-all ${
                selectedCategory === cat
                  ? "bg-brand-green/20 text-brand-green border border-brand-green/20 font-bold shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search asset (Nifty, Gold, BTC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#13151e] border border-gray-800/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-green/40 font-mono"
          />
        </div>
      </div>

      {/* 16 Asset Lead Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredAssets.map((asset: any) => (
          <div
            key={asset.id}
            onClick={() => setSelectedAsset(asset)}
            className="bg-[#13151e] border border-gray-800/50 hover:border-brand-green/40 rounded-xl p-4 space-y-3 cursor-pointer transition-all duration-200 hover:shadow-lg card-hover relative group overflow-hidden"
          >
            {/* Top row: Title & Badge */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block">{asset.category}</span>
                <h3 className="text-sm font-heading font-bold text-white group-hover:text-brand-green transition-colors flex items-center gap-1.5">
                  {asset.name}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-brand-green" />
                </h3>
              </div>
              <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded border ${getBadgeStyle(asset.lead_confluence_score)}`}>
                {asset.win_probability}% WIN PROB
              </span>
            </div>

            {/* Score & Lead Status */}
            <div className="flex items-baseline justify-between border-b border-gray-800/30 pb-2.5">
              <div>
                <span className="text-[9px] text-gray-500 font-mono block">Lead Confluence Score</span>
                <span className={`text-2xl font-extrabold font-mono leading-none ${getScoreColor(asset.lead_confluence_score)}`}>
                  {asset.lead_confluence_score}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-gray-400 font-semibold">{asset.lead_status}</span>
              </div>
            </div>

            {/* 3M, 6M, 12M Expected Returns */}
            <div className="grid grid-cols-3 gap-1 bg-gray-950/40 p-2 rounded-lg text-center font-mono text-[9px]">
              <div>
                <span className="text-gray-500 block text-[8px]">3M Lead</span>
                <span className={`font-bold ${asset.expected_returns.val_3m >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                  {asset.expected_returns.fwd_3m}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[8px]">6M Lead</span>
                <span className={`font-bold ${asset.expected_returns.val_6m >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                  {asset.expected_returns.fwd_6m}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[8px]">12M Lead</span>
                <span className={`font-bold ${asset.expected_returns.val_12m >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                  {asset.expected_returns.fwd_12m}
                </span>
              </div>
            </div>

            {/* Recommended Action */}
            <div className="flex justify-between items-center text-[9px] font-mono text-gray-400 pt-1">
              <span>Action: <span className="text-gray-200 font-semibold">{asset.recommended_action}</span></span>
              <span className="text-brand-green text-[8px]">5-Vector Proof →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Deep-Dive 5-Vector Confluence Modal Drawer */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#121520] border border-brand-green/30 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-gray-800/40 pb-4">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-brand-green uppercase tracking-wider font-bold">Deep-Dive 5-Vector Lead Analytics</span>
                <h3 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                  {selectedAsset.name} <span className="text-xs font-mono text-gray-500">({selectedAsset.symbol})</span>
                </h3>
              </div>
              <button 
                onClick={() => setSelectedAsset(null)}
                className="w-8 h-8 rounded-lg bg-gray-800/50 hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score Overview Cards */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800/40">
                <span className="text-[8px] font-mono text-gray-500 uppercase block">Lead Confluence Score</span>
                <span className={`text-2xl font-extrabold font-mono ${getScoreColor(selectedAsset.lead_confluence_score)}`}>
                  {selectedAsset.lead_confluence_score}
                </span>
              </div>
              <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800/40">
                <span className="text-[8px] font-mono text-gray-500 uppercase block">Historical Win Prob</span>
                <span className="text-2xl font-extrabold font-mono text-brand-green">{selectedAsset.win_probability}%</span>
              </div>
              <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800/40">
                <span className="text-[8px] font-mono text-gray-500 uppercase block">Expected 12M Return</span>
                <span className="text-2xl font-extrabold font-mono text-brand-green">{selectedAsset.expected_returns.fwd_12m}</span>
              </div>
            </div>

            {/* 5-Vector Breakdown Bars */}
            <div className="space-y-3 bg-gray-950/40 p-4 rounded-xl border border-gray-800/40">
              <h4 className="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-brand-green" />
                <span>5 Macro Liquidity Vector Scores</span>
              </h4>
              
              {Object.entries(selectedAsset.vectors).map(([key, vector]: [string, any]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-gray-300">{vector.name} <span className="text-gray-500">({vector.weight})</span></span>
                    <span className="font-bold text-white">{vector.score} pts</span>
                  </div>
                  <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${vector.score >= 75 ? "bg-brand-green" : vector.score >= 50 ? "bg-brand-blue" : "bg-brand-red"}`}
                      style={{ width: `${vector.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Historical Twin Match */}
            <div className="bg-brand-blue/10 border border-brand-blue/20 p-3.5 rounded-xl space-y-1">
              <span className="text-[9px] font-mono text-brand-blue font-bold uppercase tracking-wider block">Top Matching Historical Regime</span>
              <div className="flex justify-between items-center text-xs font-semibold text-white">
                <span>{selectedAsset.active_twin_regime?.regime_name}</span>
                <span className="font-mono text-brand-green">{selectedAsset.active_twin_regime?.similarity_score}% Match</span>
              </div>
              <p className="text-[10px] text-gray-400">{selectedAsset.active_twin_regime?.driver}</p>
            </div>

            {/* Footer Action */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 bg-brand-green text-black font-mono font-bold text-xs rounded-xl hover:bg-emerald-400 transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
