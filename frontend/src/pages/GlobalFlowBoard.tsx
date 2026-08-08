import React, { useState, useEffect } from "react";
import { 
  Globe, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Zap,
  Info,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  X
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import SignalExplanationDrawer from "../components/SignalExplanationDrawer";
import BullRunSignalBadge from "../components/BullRunSignalBadge";
import LiquidityDrainBadge from "../components/LiquidityDrainBadge";
import DataQualityBadge from "../components/DataQualityBadge";

export default function GlobalFlowBoard() {
  const [boardData, setBoardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30Y");

  const fetchSignalHistory = async (assetName: string, signalType: string = "bull") => {
    if (expandedAsset === assetName) {
      setExpandedAsset(null);
      setHistoryData(null);
      return;
    }
    setExpandedAsset(assetName);
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/backtest/asset-signal-history?asset_name=${encodeURIComponent(assetName)}&signal_type=${signalType}`);
      const data = await res.json();
      setHistoryData(data);
    } catch (e) {
      console.error("Failed to fetch signal history", e);
    }
    setHistoryLoading(false);
  };

  const fetchBoardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/flow-pulse/global-board");
      const data = await res.json();
      setBoardData(data || {});
    } catch (e) {
      console.error("Failed to fetch Global Flow Board data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBoardData();
  }, []);

  if (loading || !boardData) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-brand-green/30 border-t-brand-green animate-spin" />
          <span className="text-xs font-mono text-gray-500">Loading global flow data…</span>
        </div>
      </div>
    );
  }

  const { cards = [], bull_runs = [], distributions = [] } = boardData;

  // Capital routing map — expanded for complete global picture (10x10 nodes matrix)
  // LEFT column = SOURCES (who creates/exports capital)
  // RIGHT column = DESTINATIONS (where capital lands)
  const nodes: Record<string, { x: number; y: number; name: string; flag: string; side: string }> = {
    // Sources (left side - 10 nodes)
    "Norway SWF":      { x: 55,  y: 30,  name: "Norway SWF",        flag: "🇳🇴", side: "source" },
    "Fed USA":         { x: 65,  y: 78,  name: "Fed (QT/RRP)",      flag: "🇺🇸", side: "source" },
    "US Corporates":   { x: 55,  y: 126, name: "US Corporates (Buybacks)", flag: "🏢", side: "source" },
    "PBoC China":      { x: 65,  y: 174, name: "PBoC China",        flag: "🇨🇳", side: "source" },
    "ECB Europe":      { x: 55,  y: 222, name: "ECB Europe",        flag: "🇪🇺", side: "source" },
    "Gulf GCC":        { x: 65,  y: 270, name: "Gulf GCC",          flag: "🇸🇦", side: "source" },
    "BoJ Japan":       { x: 55,  y: 318, name: "BoJ Japan",         flag: "🇯🇵", side: "source" },
    "FII / FPI":       { x: 65,  y: 366, name: "FII / FPI (Hot Money)", flag: "🌐", side: "source" },
    "India DII/SIP":   { x: 55,  y: 414, name: "India DII + SIP",   flag: "🇮🇳", side: "source" },
    "Taiwan/Korea":    { x: 65,  y: 462, name: "Taiwan + Korea",    flag: "🇹🇼", side: "source" },
    
    // Destinations (right side - 10 nodes)
    "US Treasuries":   { x: 530, y: 30,  name: "US Treasuries",     flag: "🏛️", side: "dest" },
    "US Equities":     { x: 540, y: 78,  name: "US Tech / AI",      flag: "📈", side: "dest" },
    "EU Equities":     { x: 530, y: 126, name: "EU Equities",       flag: "🇪🇺", side: "dest" },
    "Gold Reserves":   { x: 540, y: 174, name: "Gold Reserves",     flag: "🥇", side: "dest" },
    "Commodities":     { x: 530, y: 222, name: "Commodities (Cu)",   flag: "⛏️", side: "dest" },
    "India Equities":  { x: 540, y: 270, name: "India (Nifty)",     flag: "🇮🇳", side: "dest" },
    "EM Bonds":        { x: 530, y: 318, name: "EM Local Bonds",    flag: "📊", side: "dest" },
    "Crypto":          { x: 540, y: 366, name: "Crypto / BTC",      flag: "₿",  side: "dest" },
    "USD Cash":        { x: 530, y: 414, name: "USD Cash / DXY",    flag: "💵", side: "dest" },
    "Real Estate":     { x: 540, y: 462, name: "Global Real Estate", flag: "🏢", side: "dest" },
  };

  const arrows = [
    // GREEN — Risk-on capital entering growth assets
    { id: "f1",  source: "Norway SWF",    target: "US Equities",    color: "green",  val: "+$12.5B",    desc: "Sovereign wealth fund recycling oil surplus into mega-cap AI clusters (NVDA, MSFT, GOOG)." },
    { id: "f2",  source: "Gulf GCC",      target: "India Equities", color: "green",  val: "+$4.8B",     desc: "Petrodollar recycling through ADIA/PIF into India capex: infra, defence, solar." },
    { id: "f3",  source: "India DII/SIP", target: "India Equities", color: "green",  val: "+₹18,500Cr", desc: "Domestic mutual fund SIP inflows (₹18,500Cr/month) providing structural floor to Nifty valuation." },
    { id: "f4",  source: "Taiwan/Korea",  target: "US Equities",    color: "green",  val: "+$6.2B",     desc: "Tech pension/insurance funds rotating into US AI supply chain (TSMC ADR, Samsung, SK Hynix)." },
    { id: "f14", source: "PBoC China",    target: "Commodities",    color: "green",  val: "+$5.1B",     desc: "PBoC credit impulse stabilizing factory PMI → copper and base metals demand rising." },
    { id: "f15", source: "US Corporates", target: "US Equities",    color: "green",  val: "+$180B/yr",  desc: "US corporates executing massive share buybacks, creating structural demand and EPS support for tech/AI." },
    { id: "f16", source: "FII / FPI",     target: "India Equities", color: "green",  val: "+$7.5B",     desc: "Global hot money/FII rotating into emerging markets, selecting India Nifty as a core structural growth bet." },

    // BLUE — Defensive flows into safe-haven or reserve assets
    { id: "f5",  source: "Norway SWF",    target: "US Treasuries",  color: "blue",   val: "+$15.4B",    desc: "Pension liability matching: direct duration bond acquisition for 30Y+ guarantees." },
    { id: "f6",  source: "PBoC China",    target: "Gold Reserves",  color: "blue",   val: "+$8.2B",     desc: "De-dollarization: PBoC adding 30+ tonnes/quarter to FX reserve gold allocation." },
    { id: "f7",  source: "ECB Europe",    target: "EU Equities",    color: "blue",   val: "+€9.8B",     desc: "ECB rate cuts easing financial conditions → Eurozone bank lending margins expanding." },
    { id: "f8",  source: "Gulf GCC",      target: "EM Bonds",       color: "blue",   val: "+$3.5B",     desc: "GCC sovereign wealth allocating to high-yield EM local currency bonds (Brazil, Indonesia)." },
    { id: "f17", source: "Norway SWF",    target: "Real Estate",    color: "blue",   val: "+$4.2B",     desc: "Sovereign wealth fund acquiring premium real estate and core infrastructure as a long-term inflation hedge." },
    { id: "f18", source: "Gulf GCC",      target: "Real Estate",    color: "blue",   val: "+$9.4B",     desc: "GCC petrodollar recycling into prime logistics hubs and commercial property globally (diversification focus)." },

    // RED — Liquidity drain / suction events
    { id: "f9",  source: "US Equities",   target: "BoJ Japan",      color: "red",    val: "-$9.5B",     desc: "Japanese insurance/pension capital repatriating to cover rising JGB yields and yen funding costs." },
    { id: "f10", source: "Fed USA",       target: "US Treasuries",  color: "red",    val: "-$60B/mo",   desc: "Quantitative Tightening: Fed shrinking balance sheet at $60B/month, draining reserve liquidity." },
    { id: "f11", source: "Crypto",        target: "Fed USA",        color: "red",    val: "-$4.2B",     desc: "Crypto outflows as rising real yields pull speculative capital back to risk-free deposits." },
    { id: "f19", source: "Fed USA",       target: "USD Cash",       color: "red",    val: "Suction",    desc: "Fed RRP drawdown and QT absorbing dollar liquidity, sucking offshore capital back to safety of USD Cash." },
    { id: "f20", source: "FII / FPI",     target: "USD Cash",       color: "red",    val: "-$3.8B",     desc: "EM capital flight: hot money exiting EM equity/bond assets back to USD safe haven as global risk rises." },

    // PURPLE — Carry trade / forced deleveraging
    { id: "f12", source: "BoJ Japan",     target: "US Equities",    color: "purple", val: "¥ Carry Risk", desc: "USD/JPY carry trade positions at risk: BoJ hiking → forced US equity liquidation cascade." },
    { id: "f13", source: "BoJ Japan",     target: "EM Bonds",       color: "purple", val: "¥ Unwind",    desc: "Yen-funded EM carry trades unwinding: selling Brazilian real, Indonesian rupiah bonds." },
  ];

  const getArrowColorHex = (color: string) => {
    switch (color) {
      case "green": return "#10B981";
      case "blue": return "#29b6f6";
      case "red": return "#EF4444";
      case "purple": return "#ab47bc";
      default: return "#6b7280";
    }
  };

  // Score-based color for cards
  const getCardBorder = (score: number, id: string) => {
    if (id === "top_drain") return "border-brand-red/20 hover:border-brand-red/40";
    if (id === "top_pocket") return "border-brand-green/20 hover:border-brand-green/40";
    if (score >= 75) return "border-brand-green/15 hover:border-brand-green/30";
    if (score >= 50) return "border-gray-800/60 hover:border-gray-700";
    if (score >= 35) return "border-brand-yellow/15 hover:border-brand-yellow/30";
    return "border-brand-red/15 hover:border-brand-red/30";
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-brand-green glow-green";
    if (score >= 50) return "text-white";
    if (score >= 35) return "text-brand-yellow";
    return "text-brand-red glow-red";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-green/20 to-brand-blue/10 border border-brand-green/15 flex items-center justify-center">
              <Globe className="text-brand-green w-4 h-4" />
            </div>
            <span>Global Flow Board</span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-1 ml-9">
            Sovereign liquidity monitor • Capital routing vectors • Walk-forward prediction signals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DataQualityBadge status="Live" />
          <span className="text-[9px] text-gray-600 font-mono bg-gray-900/40 border border-gray-800/30 px-2 py-1 rounded">
            {boardData.timestamp}
          </span>
        </div>
      </div>

      {/* Signal Cards Grid — 2 rows of 5 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {cards.map((card: any) => {
          const isSelected = selectedCard?.id === card.id;
          return (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer text-left card-hover bg-[#13151e] ${
                isSelected ? "border-brand-green/40 ring-1 ring-brand-green/10" : getCardBorder(card.score, card.id)
              }`}
            >
              {/* Title row */}
              <div className="flex justify-between items-start mb-2.5">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider leading-tight max-w-[85%]">{card.title}</span>
                <span className="text-[8px] font-mono text-gray-600 bg-gray-900/60 px-1 py-0.5 rounded uppercase shrink-0">{card.data_quality}</span>
              </div>

              {/* Score */}
              <div className="flex items-baseline justify-between mb-2">
                <span className={`text-[22px] font-extrabold font-mono leading-none ${getScoreColor(card.score)}`}>
                  {typeof card.score === 'number' ? card.score.toFixed(1) : card.score}
                </span>
                <div className="flex items-center gap-0.5 text-[9px] font-mono text-gray-500">
                  {card.direction === "up" ? (
                    <TrendingUp className="w-3 h-3 text-brand-green" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-brand-red" />
                  )}
                  <span>{card.change_1m}</span>
                </div>
              </div>

              {/* Status footer */}
              <div className="flex justify-between items-center text-[9px] font-mono text-gray-600 border-t border-gray-800/30 pt-2">
                <span className="truncate max-w-[70%] text-gray-400">{card.status}</span>
                <span className="shrink-0">{card.confidence}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Capital Routing Map */}
      <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 relative overflow-hidden">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-green" />
              <span>Sovereign Capital Routing Map</span>
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5 ml-6">
              Click flow arcs to audit direction rationale
            </p>
          </div>
          <div className="flex gap-3 text-[9px] font-mono text-gray-500">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span> Risk Assets</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span> Defensive</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span> Suction</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Carry Unwind</span>
          </div>
        </div>

        <div className="min-h-[480px] relative border border-gray-800/20 rounded-xl bg-[#0c0d14]/50 flex items-center justify-center">
          <svg className="w-full max-w-[640px] h-[490px] overflow-visible" viewBox="0 0 620 490">
            <defs>
              <pattern id="grid-fl" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.012)" strokeWidth="1" />
              </pattern>
              {["green", "blue", "red", "purple"].map(c => (
                <marker key={c} id={`arr-${c}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 2 L 8 5 L 0 8 z" fill={getArrowColorHex(c)} />
                </marker>
              ))}
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-fl)" />

            {/* Flow arcs */}
            {arrows.map((arr) => {
              const from = nodes[arr.source];
              const to = nodes[arr.target];
              if (!from || !to) return null;
              const cx = from.x + (to.x - from.x) * 0.5;
              const cy = from.y + (to.y - from.y) * 0.25 - 25;
              const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
              const isSel = selectedFlow?.id === arr.id;
              const hex = getArrowColorHex(arr.color);

              return (
                <g key={arr.id} className="cursor-pointer" onClick={() => setSelectedFlow(arr)}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth="14" />
                  <path d={d} fill="none" stroke={hex} strokeWidth={isSel ? 4 : 1.5} strokeOpacity={isSel ? 0.85 : 0.35} markerEnd={`url(#arr-${arr.color})`} className="transition-all duration-200" />
                  <path d={d} fill="none" stroke={hex} strokeWidth="3" strokeLinecap="round" strokeDasharray="5 28" className="animate-flow-dash" style={{ opacity: 0.6 }} />
                </g>
              );
            })}

            {/* Nodes */}
            {Object.entries(nodes).map(([key, node]) => {
              const isSource = node.side === "source";
              return (
                <g key={key} transform={`translate(${node.x}, ${node.y})`}>
                  <circle r="5" fill="#12141d" stroke={isSource ? "#4b5563" : "#374151"} strokeWidth="2" />
                  <text 
                    x={isSource ? 14 : -14} 
                    y={4} 
                    textAnchor={isSource ? "start" : "end"} 
                    className="text-[8px] font-mono fill-gray-400 font-semibold"
                  >
                    {node.flag} {node.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Flow audit panel */}
          {selectedFlow && (
            <div className="absolute bottom-3 left-3 right-3 bg-[#12141d]/95 border border-gray-800/60 rounded-xl p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 backdrop-blur-md shadow-2xl animate-slide-up">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-brand-green/8 text-brand-green border border-brand-green/15 font-bold">
                    {selectedFlow.val}
                  </span>
                  <span className="text-xs font-semibold text-white flex items-center gap-1">
                    {selectedFlow.source} <ArrowRight className="w-3 h-3 text-gray-600" /> {selectedFlow.target}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">{selectedFlow.desc}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedFlow(null); }}
                className="px-2 py-1 text-[9px] font-mono text-gray-500 hover:text-white hover:bg-gray-800/50 rounded transition-colors shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tables: Bull Runs & Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bull Runs */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800/30 flex items-center justify-between">
            <h3 className="text-[11px] font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-brand-green" />
              <span>Top 10 Bull Runs Starting</span>
            </h3>
            <span className="text-[8px] font-mono text-gray-500">Click row → 30Y proof</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-gray-800/30 text-gray-500 font-mono text-[9px] uppercase">
                  <th className="py-2.5 px-4">Asset</th>
                  <th className="py-2.5 px-3 text-center">Prob</th>
                  <th className="py-2.5 px-3 text-center">Signal</th>
                  <th className="py-2.5 px-3 text-center hidden lg:table-cell">Hit Rate</th>
                  <th className="py-2.5 px-3 text-right">Euphoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/20">
                {bull_runs.map((a: any, idx: number) => (
                  <tr 
                    key={idx} 
                    className={`cursor-pointer transition-colors ${expandedAsset === a.asset ? "bg-brand-green/[0.04]" : "hover:bg-white/[0.015]"}`}
                    onClick={() => fetchSignalHistory(a.asset, "bull")}
                  >
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-gray-200 flex items-center gap-1.5">
                        {expandedAsset === a.asset ? <ChevronDown className="w-3 h-3 text-brand-green" /> : <ChevronRight className="w-3 h-3 text-gray-600" />}
                        {a.asset}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-brand-green">{a.probability}%</td>
                    <td className="py-2.5 px-3 text-center"><BullRunSignalBadge signal={a.status} /></td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-300 hidden lg:table-cell">{a.hit_rate}%</td>
                    <td className="py-2.5 px-3 text-right font-mono text-brand-yellow">{a.euphoria}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distributions */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800/30 flex items-center justify-between">
            <h3 className="text-[11px] font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingDown className="w-3.5 h-3.5 text-brand-red" />
              <span>Top 10 Under Distribution</span>
            </h3>
            <span className="text-[8px] font-mono text-gray-500">Click row → 30Y proof</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-gray-800/30 text-gray-500 font-mono text-[9px] uppercase">
                  <th className="py-2.5 px-4">Asset</th>
                  <th className="py-2.5 px-3 text-center">Dist</th>
                  <th className="py-2.5 px-3 text-center">Exit Signal</th>
                  <th className="py-2.5 px-3 text-center hidden lg:table-cell">Similar Era</th>
                  <th className="py-2.5 px-3 text-right">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/20">
                {distributions.map((a: any, idx: number) => (
                  <tr 
                    key={idx} 
                    className={`cursor-pointer transition-colors ${expandedAsset === a.asset ? "bg-brand-red/[0.04]" : "hover:bg-white/[0.015]"}`}
                    onClick={() => fetchSignalHistory(a.asset, "distribution")}
                  >
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-gray-200 flex items-center gap-1.5">
                        {expandedAsset === a.asset ? <ChevronDown className="w-3 h-3 text-brand-red" /> : <ChevronRight className="w-3 h-3 text-gray-600" />}
                        {a.asset}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{a.score}</td>
                    <td className="py-2.5 px-3 text-center">
                      <LiquidityDrainBadge label={a.score >= 70 ? "Euphoria Warning" : a.score >= 50 ? "Smart Money Exit" : "Mild Drain"} />
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-brand-blue hidden lg:table-cell">{a.similarity}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-brand-red font-bold text-[10px]">{a.expected_risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* === EXPANDED HISTORICAL PROOF PANEL === */}
      {expandedAsset && (
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl overflow-hidden animate-slide-up">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-brand-green/30 border-t-brand-green animate-spin" />
              <span className="ml-3 text-xs font-mono text-gray-500">Loading 30-year signal history for {expandedAsset}…</span>
            </div>
          ) : historyData ? (
            <div className="space-y-0">
              {/* Panel Header */}
              <div className="px-5 py-3.5 border-b border-gray-800/30 flex items-center justify-between bg-gray-950/30">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-brand-green" />
                  <div>
                    <h3 className="text-sm font-heading font-bold text-white">
                      {historyData.asset_name} — 30-Year Signal Proof
                    </h3>
                    <p className="text-[9px] font-mono text-gray-500 mt-0.5">
                      Signal: {historyData.signal_name} • Data from {historyData.data_start_year} • {historyData.total_signals_fired} signals fired
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => { setExpandedAsset(null); setHistoryData(null); }}
                  className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-5 border-b border-gray-800/30">
                <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block">Win Rate</span>
                  <span className={`text-xl font-bold font-mono ${historyData.summary.win_rate >= 70 ? "text-brand-green glow-green" : historyData.summary.win_rate >= 50 ? "text-brand-yellow" : "text-brand-red"}`}>
                    {historyData.summary.win_rate}%
                  </span>
                </div>
                <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block">False Positive</span>
                  <span className="text-xl font-bold font-mono text-brand-red">{historyData.summary.false_positive_rate}%</span>
                </div>
                <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block">Avg 6M Return</span>
                  <span className={`text-xl font-bold font-mono ${historyData.summary.avg_6m_return > 0 ? "text-brand-green" : "text-brand-red"}`}>
                    {historyData.summary.avg_6m_return > 0 ? "+" : ""}{historyData.summary.avg_6m_return}%
                  </span>
                </div>
                <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block">Avg 12M Return</span>
                  <span className={`text-xl font-bold font-mono ${historyData.summary.avg_12m_return > 0 ? "text-brand-green" : "text-brand-red"}`}>
                    {historyData.summary.avg_12m_return > 0 ? "+" : ""}{historyData.summary.avg_12m_return}%
                  </span>
                </div>
                <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block">Best 12M</span>
                  <span className="text-xl font-bold font-mono text-brand-green">+{historyData.summary.best_12m_return}%</span>
                </div>
                <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block">Worst 12M</span>
                  <span className="text-xl font-bold font-mono text-brand-red">{historyData.summary.worst_12m_return}%</span>
                </div>
                <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-900">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block">Confidence</span>
                  <span className={`text-xl font-bold font-mono ${historyData.summary.confidence === "High" ? "text-brand-green" : "text-brand-yellow"}`}>
                    {historyData.summary.confidence}
                  </span>
                </div>
              </div>

              {/* Dynamic Duration Price Chart with Signal Markers & Macro Score Trend */}
              {(() => {
                if (!historyData || !historyData.price_trend_30y || historyData.price_trend_30y.length === 0) return null;
                
                // Filter trend data based on selected duration
                const trend = historyData.price_trend_30y;
                let filteredTrend = trend;
                if (selectedPeriod !== "30Y") {
                  const monthsToKeep = selectedPeriod === "10Y" ? 120 : selectedPeriod === "5Y" ? 60 : 12;
                  filteredTrend = trend.slice(-monthsToKeep);
                }
                
                // Filter reference signal lines so they only render if they fall in the active chart window
                const visibleDates = new Set(filteredTrend.map((d: any) => d.date));
                const filteredInstances = historyData.instances.filter((inst: any) => {
                  const mappedDate = inst.date.slice(0, 7) + "-01";
                  return visibleDates.has(mappedDate);
                });

                const displayTitle = selectedPeriod === "30Y" ? "30-Year" : selectedPeriod === "10Y" ? "10-Year" : selectedPeriod === "5Y" ? "5-Year" : "1-Year";

                return (
                  <div className="p-5 border-b border-gray-800/30">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-[10px] font-mono text-gray-500 uppercase">
                        {displayTitle} Asset Price vs. Macro Signal Score Trend (0-100)
                      </h4>
                      <div className="flex bg-gray-950/60 p-0.5 rounded-lg border border-gray-800/50">
                        {["30Y", "10Y", "5Y", "1Y"].map((period) => (
                          <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={`px-2 py-0.5 text-[9px] font-mono rounded-md transition-colors ${
                              selectedPeriod === period 
                                ? "bg-brand-green/20 text-brand-green border border-brand-green/15 font-bold" 
                                : "text-gray-455 hover:text-white"
                            }`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ width: "100%", height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                        <LineChart data={filteredTrend.filter((_: any, i: number) => selectedPeriod === "1Y" ? true : i % 3 === 0)}>
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 8, fill: "#6b7280" }} 
                            tickFormatter={(v: string) => {
                              if (selectedPeriod === "1Y") {
                                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                return months[parseInt(v.slice(5, 7)) - 1];
                              }
                              if (selectedPeriod === "5Y") {
                                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                return `${v.slice(2, 4)} ${months[parseInt(v.slice(5, 7)) - 1]}`;
                              }
                              return v.slice(0, 4);
                            }} 
                            interval={Math.max(1, Math.floor(filteredTrend.length / 10))}
                          />
                          {/* Left Y-Axis: Price */}
                          <YAxis 
                            yAxisId="left"
                            domain={["auto", "auto"]}
                            tick={{ fontSize: 8, fill: "#29b6f6" }} 
                            width={60}
                            tickFormatter={(v: number) => {
                              const symbol = historyData.currency_local === "INR" ? "₹" : "$";
                              return v >= 1000 ? `${symbol}${(v/1000).toFixed(0)}K` : `${symbol}${v}`;
                            }}
                          />
                          {/* Right Y-Axis: Macro Score (0-100) */}
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 8, fill: "#10b981" }} 
                            width={35}
                            domain={[0, 100]}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#12141d", border: "1px solid #1f2937", borderRadius: "8px", fontSize: "10px" }}
                            formatter={(value: any, name: any, props: any) => {
                              if (name === "Price") {
                                const item = props.payload;
                                const localVal = item.price_local !== undefined ? item.price_local : value;
                                const usdVal = item.price_usd !== undefined ? item.price_usd : value;
                                
                                const symbolLocal = historyData.currency_local === "INR" ? "₹" : "$";
                                const localStr = `${symbolLocal}${Number(localVal).toLocaleString(undefined, {maximumFractionDigits: 1})}`;
                                const usdStr = `$${Number(usdVal).toLocaleString(undefined, {maximumFractionDigits: 1})}`;
                                
                                if (historyData.currency_local !== "USD") {
                                  return [`${localStr} (${usdStr})`, "Asset Price"];
                                } else {
                                  return [usdStr, "Asset Price"];
                                }
                              }
                              if (name === "Score") return [`${value} pts`, "Macro Signal Score"];
                              return [value, name];
                            }}
                          />
                          
                          {/* Asset Price Line */}
                          <Line yAxisId="left" name="Price" type="monotone" dataKey="price" stroke="#29b6f6" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                          
                          {/* Macro Signal Score Line */}
                          <Line yAxisId="right" name="Score" type="monotone" dataKey="score" stroke="#10b981" strokeWidth={1.2} strokeDasharray="3 2" dot={false} opacity={0.7} />
                          
                          {/* Euphoria threshold line */}
                          <ReferenceLine yAxisId="right" y={75} stroke="#10b981" strokeDasharray="2 4" strokeWidth={1} opacity={0.5} label={{ value: "Euphoria (75)", fill: "#10b981", fontSize: 8, position: "insideTopRight" }} />
                          
                          {/* Drain threshold line */}
                          <ReferenceLine yAxisId="right" y={35} stroke="#ef4444" strokeDasharray="2 4" strokeWidth={1} opacity={0.5} label={{ value: "Drain (35)", fill: "#ef4444", fontSize: 8, position: "insideBottomRight" }} />
  
                          {/* Signal fire reference lines */}
                          {filteredInstances.map((inst: any) => (
                            <ReferenceLine 
                              key={inst.date} 
                              yAxisId="left"
                              x={inst.date.slice(0, 7) + "-01"} 
                              stroke={inst.outcome === "WIN" ? "#00e676" : inst.outcome === "LOSS" ? "#ff1744" : "#ffa726"} 
                              strokeWidth={1.5}
                              strokeDasharray="4 4"
                              strokeOpacity={0.6}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-[9px] font-mono text-gray-555">
                      <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-brand-blue inline-block"></span> Price Trend (LHS)</span>
                      <span className="flex items-center gap-1"><span className="w-6 h-0.5 border-t border-dashed border-brand-green inline-block"></span> Macro Signal Score (RHS)</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-brand-green inline-block"></span> WIN signal fire</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-brand-red inline-block"></span> LOSS signal fire</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-brand-yellow inline-block"></span> ACTIVE now</span>
                    </div>
                  </div>
                );
              })()}

              {/* Historical Instances Table */}
              <div className="p-5 border-b border-gray-800/30">
                <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-3">Every Time This Signal Fired — What Happened Next</h4>
                <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead className="sticky top-0 bg-[#13151e] z-10">
                      <tr className="border-b border-gray-800/40 text-gray-500 font-mono text-[8px] uppercase">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-center">Score</th>
                        <th className="py-2 px-3 text-center">Signal</th>
                        <th className="py-2 px-3 text-right">Price</th>
                        <th className="py-2 px-3 text-center">3M</th>
                        <th className="py-2 px-3 text-center">6M</th>
                        <th className="py-2 px-3 text-center">12M</th>
                        <th className="py-2 px-3 text-center">Result</th>
                        <th className="py-2 px-3">Regime</th>
                        <th className="py-2 px-3 hidden xl:table-cell">Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/15">
                      {historyData.instances.map((inst: any, idx: number) => (
                        <tr key={idx} className={`transition-colors ${inst.outcome === "ACTIVE" ? "bg-brand-green/[0.03]" : inst.outcome === "LOSS" ? "bg-brand-red/[0.02]" : "hover:bg-white/[0.01]"}`}>
                          <td className="py-2 px-3 font-mono text-gray-300 whitespace-nowrap">{inst.date}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-white">{inst.signal_score}</td>
                          <td className="py-2 px-3 text-center"><BullRunSignalBadge signal={inst.signal_label} /></td>
                          <td className="py-2 px-3 text-right font-mono text-gray-300 whitespace-nowrap">
                            {(() => {
                              const localVal = inst.price_at_signal_local !== undefined ? inst.price_at_signal_local : inst.price_at_signal;
                              const usdVal = inst.price_at_signal_usd !== undefined ? inst.price_at_signal_usd : inst.price_at_signal;
                              const symbolLocal = historyData.currency_local === "INR" ? "₹" : "$";
                              
                              if (historyData.currency_local !== "USD") {
                                return `${symbolLocal}${localVal.toLocaleString()} ($${usdVal.toLocaleString()})`;
                              } else {
                                return `$${usdVal.toLocaleString()}`;
                              }
                            })()}
                          </td>
                          <td className={`py-2 px-3 text-center font-mono font-bold ${typeof inst.fwd_3m === 'number' ? (inst.fwd_3m > 0 ? "text-brand-green" : "text-brand-red") : "text-brand-yellow"}`}>
                            {typeof inst.fwd_3m === 'number' ? `${inst.fwd_3m > 0 ? "+" : ""}${inst.fwd_3m}%` : inst.fwd_3m}
                          </td>
                          <td className={`py-2 px-3 text-center font-mono font-bold ${typeof inst.fwd_6m === 'number' ? (inst.fwd_6m > 0 ? "text-brand-green" : "text-brand-red") : "text-brand-yellow"}`}>
                            {typeof inst.fwd_6m === 'number' ? `${inst.fwd_6m > 0 ? "+" : ""}${inst.fwd_6m}%` : inst.fwd_6m}
                          </td>
                          <td className={`py-2 px-3 text-center font-mono font-bold ${typeof inst.fwd_12m === 'number' ? (inst.fwd_12m > 0 ? "text-brand-green" : "text-brand-red") : "text-brand-yellow"}`}>
                            {typeof inst.fwd_12m === 'number' ? `${inst.fwd_12m > 0 ? "+" : ""}${inst.fwd_12m}%` : inst.fwd_12m}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {inst.outcome === "WIN" && (
                              <span className="inline-flex items-center gap-0.5 text-brand-green text-[9px] font-mono font-bold">
                                <CheckCircle className="w-3 h-3" /> WIN
                              </span>
                            )}
                            {inst.outcome === "LOSS" && (
                              <span className="inline-flex items-center gap-0.5 text-brand-red text-[9px] font-mono font-bold">
                                <XCircle className="w-3 h-3" /> LOSS
                              </span>
                            )}
                            {inst.outcome === "PARTIAL" && (
                              <span className="inline-flex items-center gap-0.5 text-brand-yellow text-[9px] font-mono font-bold">
                                <Clock className="w-3 h-3" /> PARTIAL
                              </span>
                            )}
                            {inst.outcome === "ACTIVE" && (
                              <span className="inline-flex items-center gap-0.5 text-brand-green text-[9px] font-mono font-bold animate-pulse">
                                <Clock className="w-3 h-3" /> NOW
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-brand-blue text-[9px] whitespace-nowrap">{inst.regime}</td>
                          <td className="py-2 px-3 text-gray-400 text-[9px] hidden xl:table-cell max-w-[200px] truncate">{inst.context}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Diagnostic Checklist & Current Verdict */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 border-b border-gray-800/30 bg-gray-950/20">
                {/* Diagnostic Inception Checklist */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-green" />
                    <span>Bull Run Inception Diagnostic Checklist</span>
                  </h4>
                  <div className="space-y-2">
                    {/* Criterion 1 */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800/30 text-[10px]">
                      <span className="text-gray-300">1. Global Liquidity Inflow (Fed + PBoC impulse)</span>
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${historyData.instances[historyData.instances.length-1].signal_score >= 55 ? "text-brand-green bg-brand-green/8" : "text-brand-red bg-brand-red/8"}`}>
                        {historyData.instances[historyData.instances.length-1].signal_score >= 55 ? "✓ PASSED" : "✗ FAILED"}
                      </span>
                    </div>
                    {/* Criterion 2 */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800/30 text-[10px]">
                      <span className="text-gray-300">2. Private Credit Channel Transmission (Spreads narrow)</span>
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${historyData.instances[historyData.instances.length-1].signal_score >= 60 ? "text-brand-green bg-brand-green/8" : "text-brand-yellow bg-brand-yellow/8"}`}>
                        {historyData.instances[historyData.instances.length-1].signal_score >= 60 ? "✓ CONFIRMED" : "⚡ NEUTRAL"}
                      </span>
                    </div>
                    {/* Criterion 3 */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800/30 text-[10px]">
                      <span className="text-gray-300">3. Relative Strength Alpha (Momentum outperformance)</span>
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${historyData.instances[historyData.instances.length-1].signal_score >= 70 ? "text-brand-green bg-brand-green/8" : "text-gray-500 bg-gray-900"}`}>
                        {historyData.instances[historyData.instances.length-1].signal_score >= 70 ? "✓ STRENGTH" : "⚡ LAGGING"}
                      </span>
                    </div>
                    {/* Criterion 4 */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800/30 text-[10px]">
                      <span className="text-gray-300">4. Smart Money Support (No active distribution)</span>
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${historyData.instances[historyData.instances.length-1].signal_score >= 50 ? "text-brand-green bg-brand-green/8" : "text-brand-red bg-brand-red/8 animate-pulse"}`}>
                        {historyData.instances[historyData.instances.length-1].signal_score >= 50 ? "✓ NO DRAIN" : "⚠️ DISTRIBUTING"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verdict & Signal Inception Stage */}
                <div className="flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase block">Active Inception Verdict</span>
                    <div className={`p-4 rounded-xl border ${historyData.instances[historyData.instances.length-1].signal_score >= 75 ? "bg-brand-green/4 border-brand-green/20" : historyData.instances[historyData.instances.length-1].signal_score >= 55 ? "bg-brand-blue/4 border-brand-blue/20" : "bg-brand-red/4 border-brand-red/20"}`}>
                      <h5 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${historyData.instances[historyData.instances.length-1].signal_score >= 75 ? "text-brand-green" : historyData.instances[historyData.instances.length-1].signal_score >= 55 ? "text-brand-blue" : "text-brand-red"}`}>
                        {historyData.instances[historyData.instances.length-1].signal_score >= 75 
                          ? "✓ STRUCTURAL BULLRUN START CONFIRMED" 
                          : historyData.instances[historyData.instances.length-1].signal_score >= 55 
                          ? "⚡ EARLY STAGE SPECULATIVE ACCUMULATION" 
                          : "⚠️ DRAIN ACTIVE / AVOID REGIME"}
                      </h5>
                      <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                        {historyData.instances[historyData.instances.length-1].signal_score >= 75 
                          ? "Score shows maximum liquidity confluence. Cross-border recycling is highly favorable, backing sustained structural appreciation."
                          : historyData.instances[historyData.instances.length-1].signal_score >= 55
                          ? "Early stages of capital positioning. Flows are shifting but credit channels need to demonstrate sustained transmission."
                          : "Avoid/Hedge: Smart money distribution is actively draining liquidity from this sector. Risk parameters are elevated."}
                      </p>
                    </div>
                  </div>

                  {historyData.verdict && (
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                      <Info className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                      <span>
                        System Verdict: <strong className="text-white">{historyData.verdict.reliability} reliability</strong> based on {historyData.total_signals_fired} past instances.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Net Flow Conclusion — the "so what?" card */}
      <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
        <h3 className="text-[11px] font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-brand-green" />
          <span>Net Flow Conclusion</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Where money is being created */}
          <div className="p-3.5 bg-brand-green/4 border border-brand-green/10 rounded-xl">
            <span className="text-[8px] font-mono text-brand-green uppercase font-bold block mb-1.5">💰 Where Money Is Being Created</span>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Norway (oil surplus), Gulf GCC (petrodollar recycling), PBoC (credit impulse + RRR cuts), India domestic SIP (₹18,500Cr/month structural).
              <span className="block mt-1 text-brand-green font-semibold text-[10px]">Net creation: Strong → risk assets benefit.</span>
            </p>
          </div>
          {/* Where it is flowing */}
          <div className="p-3.5 bg-brand-blue/4 border border-brand-blue/10 rounded-xl">
            <span className="text-[8px] font-mono text-brand-blue uppercase font-bold block mb-1.5">🌊 Where Capital Is Flowing</span>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Primary: US Tech/AI (NVDA, MSFT), Gold (PBoC + GCC), India Nifty (DII + GCC). Secondary: EU equities (ECB easing), EM bonds (Gulf carry).
              <span className="block mt-1 text-brand-blue font-semibold text-[10px]">US + Gold + India = Top 3 destinations.</span>
            </p>
          </div>
          {/* What could reverse the flow */}
          <div className="p-3.5 bg-brand-red/4 border border-brand-red/10 rounded-xl">
            <span className="text-[8px] font-mono text-brand-red uppercase font-bold block mb-1.5">⚠️ What Could Reverse The Flow</span>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Fed QT (-$60B/mo drain), BoJ yield hike (carry unwind), USD/JPY break below 145 (forced deleveraging cascade across US tech + EM bonds).
              <span className="block mt-1 text-brand-red font-semibold text-[10px]">Key risk: Yen carry unwind → global risk-off.</span>
            </p>
          </div>
        </div>
      </div>

      {/* How to Read Guide — expanded */}
      <div className="bg-brand-blue/3 border border-brand-blue/8 rounded-xl p-4 flex gap-3 text-[11px] text-gray-400 leading-relaxed">
        <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <span className="font-semibold text-gray-300 block">How to read this board</span>
          <p>
            <strong className="text-white">Signal Cards (top):</strong>{" "}
            Score ≥ 75 (green glow) = macro tailwind active. 50–74 (white) = neutral, watch transmission. &lt; 35 (red glow) = drain/stress.
            Click any card to audit its impact on assets, what confirms it, and what invalidates it.
          </p>
          <p>
            <strong className="text-white">Routing Map:</strong>{" "}
            <span className="text-brand-green">Green arcs</span> = surplus capital entering growth assets.{" "}
            <span className="text-brand-blue">Blue arcs</span> = defensive/reserve parking.{" "}
            <span className="text-brand-red">Red arcs</span> = liquidity being sucked out (drain events).{" "}
            <span className="text-purple-400">Purple arcs</span> = carry trade unwind risk (forced selling).
            Click any arc to see the dollar amount and rationale.
          </p>
          <p>
            <strong className="text-white">Tables:</strong>{" "}
            "Bull Runs Starting" = assets where multiple macro indicators converge into bullish signal (check Hit Rate column).{" "}
            "Under Distribution" = assets where smart money is exiting — check Euphoria % and Similar Era for historical context.
          </p>
        </div>
      </div>

      {/* Signal Explanation Drawer */}
      <SignalExplanationDrawer 
        isOpen={selectedCard !== null}
        onClose={() => setSelectedCard(null)}
        data={selectedCard}
      />
    </div>
  );
}
