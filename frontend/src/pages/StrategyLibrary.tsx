import React from "react";
import { BookOpen, ArrowRight, Star, Layers, ShieldCheck, Zap } from "lucide-react";

interface StrategyLibraryProps {
  onLoadTemplate: (name: string, config: any) => void;
}

const TEMPLATES = [
  {
    name: "India Quality Momentum 30 (IQM-30)",
    desc: "Institutional multi-factor model combining sector-neutralized residual momentum (12M-1M), high ROCE (>15%), and Piotroski financial health.",
    category: "Institutional Alpha",
    rating: "96/100",
    config: {
      universe: { min_market_cap: 1000, sme_allowed: false },
      portfolio: { rebalance_freq: "quarterly", max_holdings: 30, max_sector_exposure: 25, transaction_cost: 0.002, slippage: 0.002, weight_type: "risk_parity" },
      rules: [
        { field: "roce", op: ">=", val: "15.0" },
        { field: "piotroski_f_score", op: ">=", val: "6" },
        { field: "price_above_dma200", op: "==", val: "1" }
      ],
      exits: [
        { field: "momentum_score", op: "<", val: "40" }
      ],
      ranking: { quality: 35, growth: 25, value: 15, momentum: 25 },
      start_date: "2010-01-01",
      end_date: "2026-06-30"
    }
  },
  {
    name: "Forensic Quality Compounder",
    desc: "Screens for high FCF yield, low Sloan Accruals, zero promoter pledge, and strong balance sheets to eliminate earnings manipulation.",
    category: "Financial Forensics",
    rating: "94/100",
    config: {
      universe: { min_market_cap: 1500, sme_allowed: false },
      portfolio: { rebalance_freq: "quarterly", max_holdings: 20, max_sector_exposure: 20, transaction_cost: 0.002, slippage: 0.002 },
      rules: [
        { field: "pledged_promoter_pct", op: "==", val: "0" },
        { field: "debt_equity", op: "<=", val: "0.4" },
        { field: "roce", op: ">=", val: "18.0" }
      ],
      exits: [
        { field: "pledged_promoter_pct", op: ">", val: "5.0" }
      ],
      ranking: { quality: 50, growth: 20, value: 20, momentum: 10 },
      start_date: "2012-01-01",
      end_date: "2026-06-30"
    }
  },
  {
    name: "CANSLIM Growth Model",
    desc: "Identifies stocks showing strong earnings acceleration (Sales & PAT CAGR > 15%), high ROE, and leading price momentum above 200 DMA.",
    category: "Growth & Momentum",
    rating: "92/100",
    config: {
      universe: { min_market_cap: 1000, sme_allowed: false },
      portfolio: { rebalance_freq: "monthly", max_holdings: 15, max_sector_exposure: 30, transaction_cost: 0.002, slippage: 0.002 },
      rules: [
        { field: "sales_cagr_3y", op: ">=", val: "15.0" },
        { field: "pat_cagr_3y", op: ">=", val: "18.0" },
        { field: "roe", op: ">=", val: "18.0" },
        { field: "price_above_dma200", op: "==", val: "1" }
      ],
      exits: [
        { field: "momentum_score", op: "<", val: "50" }
      ],
      ranking: { quality: 30, growth: 40, value: 10, momentum: 20 },
      start_date: "2015-01-01",
      end_date: "2026-06-30"
    }
  },
  {
    name: "Piotroski High Quality",
    desc: "Filters for prime financial health using Piotroski F-Score >= 7, positive free cash flow, and low debt leverage ratios.",
    category: "Quality Focus",
    rating: "88/100",
    config: {
      universe: { min_market_cap: 500, sme_allowed: true },
      portfolio: { rebalance_freq: "quarterly", max_holdings: 20, max_sector_exposure: 25, transaction_cost: 0.0025, slippage: 0.0025 },
      rules: [
        { field: "piotroski_f_score", op: ">=", val: "7" },
        { field: "debt_equity", op: "<=", val: "0.5" },
        { field: "roce", op: ">=", val: "14.0" }
      ],
      exits: [
        { field: "piotroski_f_score", op: "<", val: "5" }
      ],
      ranking: { quality: 50, growth: 20, value: 20, momentum: 10 },
      start_date: "2010-01-01",
      end_date: "2026-06-30"
    }
  },
  {
    name: "Deep Value turnaround",
    desc: "Screens for out-of-favor companies trading at deep discounts (P/E < 15, high Value Score rank) but with strong Altman Z-Scores to avoid distress.",
    category: "Deep Value",
    rating: "84/100",
    config: {
      universe: { min_market_cap: 800, sme_allowed: false },
      portfolio: { rebalance_freq: "quarterly", max_holdings: 25, max_sector_exposure: 20, transaction_cost: 0.003, slippage: 0.003 },
      rules: [
        { field: "pe", op: "<", val: "15.0" },
        { field: "value_score", op: ">=", val: "70" },
        { field: "altman_z_score", op: ">=", val: "2.9" }
      ],
      exits: [
        { field: "altman_z_score", op: "<", val: "1.8" }
      ],
      ranking: { quality: 20, growth: 10, value: 60, momentum: 10 },
      start_date: "2008-01-01",
      end_date: "2026-06-30"
    }
  },
  {
    name: "SME Alpha Compounders",
    desc: "Targeting high-alpha, small-cap and SME stock listings showing strong ROE and rapid growth metrics before institutional coverage indices catch up.",
    category: "Small-Cap Alpha",
    rating: "79/100",
    config: {
      universe: { min_market_cap: 50, sme_allowed: true },
      portfolio: { rebalance_freq: "monthly", max_holdings: 10, max_sector_exposure: 40, transaction_cost: 0.004, slippage: 0.004 },
      rules: [
        { field: "market_cap", op: "<", val: "800" },
        { field: "roe", op: ">=", val: "20.0" },
        { field: "growth_score", op: ">=", val: "75" }
      ],
      exits: [
        { field: "roe", op: "<", val: "12.0" }
      ],
      ranking: { quality: 20, growth: 50, value: 10, momentum: 20 },
      start_date: "2018-01-01",
      end_date: "2026-06-30"
    }
  }
];

export default function StrategyLibrary({ onLoadTemplate }: StrategyLibraryProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-sm font-heading font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-green" />
            <span>Quantitative Strategy Library</span>
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Pre-assembled factor scoring models designed to extract premium alphas across diverse economic cycles.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TEMPLATES.map((t, idx) => (
          <div key={idx} className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 flex flex-col justify-between hover:border-brand-blue/35 transition-all">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase">
                  {t.category}
                </span>
                <div className="flex items-center gap-1 text-brand-yellow font-mono text-[9px]">
                  <Star className="w-3 h-3 fill-current" />
                  <span>Rating: {t.rating}</span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-white leading-tight">{t.name}</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">{t.desc}</p>

              {/* Param overview list */}
              <div className="bg-gray-950/40 rounded-lg p-3 border border-gray-900 grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-brand-green" />
                  <span>Rebalance: {t.config.portfolio.rebalance_freq.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-brand-blue" />
                  <span>Max Holdings: {t.config.portfolio.max_holdings}</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-gray-500" />
                  <span className="truncate">Rules: {t.config.rules.length} conditions configured</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onLoadTemplate(t.name, t.config)}
              className="w-full mt-4 py-2 bg-gray-900 hover:bg-brand-blue/10 border border-gray-800 hover:border-brand-blue/30 text-gray-200 hover:text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Load Template into Sandbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
