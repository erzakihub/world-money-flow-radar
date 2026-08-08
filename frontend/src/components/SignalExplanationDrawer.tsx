import React from "react";
import { X, CheckCircle, AlertTriangle, Activity, TrendingUp, TrendingDown, Info } from "lucide-react";

interface ExplanationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export default function SignalExplanationDrawer({ isOpen, onClose, data }: ExplanationDrawerProps) {
  if (!isOpen || !data) return null;

  const title = data.title || data.id || "Signal";
  const score = data.score ?? 0;
  const status = data.status || data.value || "—";
  const explanation = data.explanation || data.drawer_reason || "No detailed explanation available.";
  const confidence = data.confidence ?? 88;
  const direction = data.direction || "up";
  const change1m = data.change_1m || "0";
  const change3m = data.change_3m || "0";
  const dataQuality = data.data_quality || "Live";

  // Deduce impacts based on card title
  const getImpacts = () => {
    const t = title.toLowerCase();
    if (t.includes("creation") || t.includes("global liquidity")) {
      return {
        benefits: "Emerging Markets, Tech Equities, Cryptocurrencies, Gold",
        risks: "Cash, Short-term sovereign debt, defensive staples",
        confirm: "PBoC RRR cuts + Fed balance sheet stabilizing above key margins.",
        invalidate: "Resurgent consumer price inflation forcing renewed central bank quantitative tightening (QT)."
      };
    } else if (t.includes("transmission") || t.includes("credit")) {
      return {
        benefits: "Domestic banking sector, capital goods, infrastructure, capex companies",
        risks: "High-yield bond issuers, unprofitable structural growth tech",
        confirm: "Double-digit private sector bank loan growth and tightening credit spreads.",
        invalidate: "Rising corporate default rates or sharp monetary policy hikes slowing systemic loan demand."
      };
    } else if (t.includes("dollar")) {
      return {
        benefits: "Emerging market equities and currencies, commodities",
        risks: "US dollar cash, inverse-leveraged asset models",
        confirm: "Cross-currency basis swap remaining tight near zero.",
        invalidate: "Systemic offshore credit squeeze or sudden high volatility triggering USD flight-to-safety."
      };
    } else if (t.includes("yield curve") || t.includes("curve")) {
      return {
        benefits: "Financials, cyclical energy, industrial producers",
        risks: "Long-duration defensive growth stocks, corporate utilities",
        confirm: "Rising 10Y-2Y sovereign spread with falling short rates.",
        invalidate: "Aggressive fiscal deficit auction failures pushing long rates higher under term-premium spikes."
      };
    } else if (t.includes("real yield")) {
      return {
        benefits: "Duration equities, technology, physical gold",
        risks: "Real estate investment trusts (REITs), highly leveraged infrastructure",
        confirm: "10Y real yields dropping below 1.80%.",
        invalidate: "Nominal yields rising while break-even expectations crash (bear steepening stress)."
      };
    } else if (t.includes("cross-border") || t.includes("cross border")) {
      return {
        benefits: "US mega-cap technology index funds, physical gold reserves",
        risks: "Highly leveraged peripheral frontier markets",
        confirm: "SWF filings showing expanded allocations to tech.",
        invalidate: "Capital repatriation due to domestic currency devaluation or local banking crises."
      };
    } else if (t.includes("carry trade") || t.includes("carry")) {
      return {
        benefits: "Japanese Yen, volatility traders, safe-haven bonds",
        risks: "High-yielding EM bonds, technology equities, carry arbitrage targets",
        confirm: "USD/JPY breaking below its 200-day moving average.",
        invalidate: "Bank of Japan pausing hikes while Fed delays cuts (stabilizing yield spread)."
      };
    } else if (t.includes("bull pocket") || t.includes("top bull")) {
      return {
        benefits: "Gold, India equities, select commodity cyclicals",
        risks: "Cash, money market funds, short-duration sovereign bonds",
        confirm: "Multiple macro indicators confirming strong bull configuration.",
        invalidate: "Sudden liquidity drain event (e.g. bank stress, geopolitical shock)."
      };
    } else if (t.includes("drain") || t.includes("top liquidity")) {
      return {
        benefits: "USD cash, volatility hedges, inverse ETFs",
        risks: "High-beta growth equities, leveraged crypto, EM local currency bonds",
        confirm: "Sustained DXY above 105 with rising real yields.",
        invalidate: "Fed emergency rate cut or coordinated global central bank intervention."
      };
    } else if (t.includes("euphoria") || t.includes("distribution")) {
      return {
        benefits: "Defensive quality, low-vol factor, dividend aristocrats",
        risks: "Momentum-chasing small-caps, IPO/SPAC-heavy portfolios",
        confirm: "Breadth divergence widening with rising VIX term structure.",
        invalidate: "Renewed broad-based earnings growth reigniting market breadth."
      };
    } else {
      return {
        benefits: "Commodities, precious metals, defensive quality indices",
        risks: "Unprofitable growth equities, high-leverage credit issuers",
        confirm: "ETF fund flow changes and trend breakouts.",
        invalidate: "Sudden central bank pivot to restriction."
      };
    }
  };

  const { benefits, risks, confirm, invalidate } = getImpacts();

  const scoreColor = score >= 70 ? "text-brand-green" : score >= 45 ? "text-brand-yellow" : "text-brand-red";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-bg-card border-l border-gray-800 shadow-2xl h-full flex flex-col justify-between z-10 animate-slide-in">
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-800 pb-4">
            <div>
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Macro Signal Audit</span>
              <h3 className="text-lg font-heading font-extrabold text-white mt-1 leading-tight">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Score, Status & Direction */}
          <div className="grid grid-cols-3 gap-3 bg-gray-950/40 p-4 rounded-xl border border-gray-900">
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-gray-500 uppercase">Score</span>
              <span className={`text-2xl font-bold font-mono ${scoreColor}`}>{typeof score === 'number' ? score.toFixed(1) : score}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-gray-500 uppercase">Status</span>
              <span className="text-sm font-bold text-white mt-0.5">{status}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-gray-500 uppercase">Direction</span>
              <div className="flex items-center gap-1 mt-1">
                {direction === "up" ? (
                  <TrendingUp className="w-4 h-4 text-brand-green" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-brand-red" />
                )}
                <span className="text-xs font-mono text-gray-400">1M: {change1m}</span>
              </div>
            </div>
          </div>

          {/* Confidence & Data Quality */}
          <div className="flex gap-3">
            <div className="flex-1 p-3 bg-gray-950/30 border border-gray-900 rounded-xl">
              <span className="text-[8px] font-mono text-gray-500 uppercase block">Confidence</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-green h-full rounded-full transition-all" style={{ width: `${confidence}%` }} />
                </div>
                <span className="text-xs font-mono text-white font-bold">{confidence}%</span>
              </div>
            </div>
            <div className="p-3 bg-gray-950/30 border border-gray-900 rounded-xl min-w-[80px]">
              <span className="text-[8px] font-mono text-gray-500 uppercase block">Data Feed</span>
              <span className="text-xs font-mono text-brand-green font-bold mt-1 block">{dataQuality}</span>
            </div>
          </div>

          {/* What's Happening */}
          <div className="space-y-2">
            <h4 className="text-[9px] font-mono text-gray-500 uppercase flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              <span>What's Happening & Why</span>
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed font-sans bg-gray-950/30 p-3 rounded-xl border border-gray-900">
              {explanation}
            </p>
          </div>

          {/* Causality Impact Grid */}
          <div className="space-y-3 border-t border-gray-850 pt-4">
            <h4 className="text-[9px] font-mono text-gray-500 uppercase">Capital Impact</h4>
            <div className="grid grid-cols-1 gap-2.5 text-xs font-sans">
              <div className="p-3 bg-brand-green/5 border border-brand-green/10 rounded-xl">
                <span className="text-[8px] font-mono text-brand-green uppercase font-bold block mb-1">➜ Assets Benefiting</span>
                <p className="text-gray-200 leading-snug">{benefits}</p>
              </div>
              <div className="p-3 bg-brand-red/5 border border-brand-red/10 rounded-xl">
                <span className="text-[8px] font-mono text-brand-red uppercase font-bold block mb-1">➜ Assets At Risk</span>
                <p className="text-gray-200 leading-snug">{risks}</p>
              </div>
            </div>
          </div>

          {/* Confirmation & Invalidation */}
          <div className="space-y-3 border-t border-gray-850 pt-4 text-xs font-sans">
            <div className="flex gap-2.5 items-start">
              <CheckCircle className="w-4 h-4 text-brand-green mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-white block">What Confirms the Signal?</span>
                <p className="text-gray-400 mt-0.5 leading-snug">{confirm}</p>
              </div>
            </div>
            <div className="flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 text-brand-yellow mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-white block">What Invalidates the Signal?</span>
                <p className="text-gray-400 mt-0.5 leading-snug">{invalidate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-950/60 border-t border-gray-850 flex items-center justify-between text-[10px] font-mono text-gray-500">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-brand-green" />
            <span>Confidence: {confidence}%</span>
          </div>
          <span>World Money Flow Radar</span>
        </div>
      </div>
    </div>
  );
}
