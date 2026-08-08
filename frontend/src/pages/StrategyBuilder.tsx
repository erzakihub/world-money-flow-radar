import React, { useState, useEffect } from "react";
import { Play, Sliders, Settings, Calendar, Plus, Trash2, ShieldCheck, Cpu } from "lucide-react";

interface StrategyBuilderProps {
  onRunBacktest: (result: any) => void;
}

const AVAILABLE_FIELDS = [
  { value: "pe", label: "P/E Ratio" },
  { value: "roce", label: "ROCE (%)" },
  { value: "roe", label: "ROE (%)" },
  { value: "debt_equity", label: "Debt/Equity Ratio" },
  { value: "market_cap", label: "Market Cap (₹ Cr)" },
  { value: "quality_score", label: "Quality Score" },
  { value: "growth_score", label: "Growth Score" },
  { value: "value_score", label: "Value Score" },
  { value: "momentum_score", label: "Momentum Score" },
  { value: "composite_score", label: "Composite Score" },
  { value: "piotroski_f_score", label: "Piotroski F-Score" },
  { value: "altman_z_score", label: "Altman Z-Score" },
];

export default function StrategyBuilder({ onRunBacktest }: StrategyBuilderProps) {
  const [name, setName] = useState("Alpha Momentum Master");
  
  // Universe Config
  const [minMcap, setMinMcap] = useState(500);
  const [smeAllowed, setSmeAllowed] = useState(true);

  // Portfolio Config
  const [rebalanceFreq, setRebalanceFreq] = useState("quarterly");
  const [maxHoldings, setMaxHoldings] = useState(15);
  const [maxSectorExposure, setMaxSectorExposure] = useState(30);
  const [transactionCost, setTransactionCost] = useState(0.25);
  const [slippage, setSlippage] = useState(0.25);

  // Date Config
  const [startDate, setStartDate] = useState("2010-01-01");
  const [endDate, setEndDate] = useState("2026-06-30");

  // Rule Builders
  const [entryRules, setEntryRules] = useState<any[]>([
    { field: "composite_score", op: ">=", val: "65" },
    { field: "debt_equity", op: "<", val: "0.8" }
  ]);
  const [exitRules, setExitRules] = useState<any[]>([
    { field: "roce", op: "<", val: "10.0" }
  ]);

  // Ranking weights
  const [qualityWeight, setQualityWeight] = useState(25);
  const [growthWeight, setGrowthWeight] = useState(25);
  const [valueWeight, setValueWeight] = useState(25);
  const [momentumWeight, setMomentumWeight] = useState(25);

  const [loading, setLoading] = useState(false);

  const handleAddEntryRule = () => {
    setEntryRules([...entryRules, { field: "pe", op: "<", val: "25" }]);
  };

  const handleRemoveEntryRule = (idx: number) => {
    const updated = [...entryRules];
    updated.splice(idx, 1);
    setEntryRules(updated);
  };

  const handleEntryRuleChange = (idx: number, key: string, val: string) => {
    const updated = [...entryRules];
    updated[idx][key] = val;
    setEntryRules(updated);
  };

  const handleAddExitRule = () => {
    setExitRules([...exitRules, { field: "debt_equity", op: ">", val: "1.2" }]);
  };

  const handleRemoveExitRule = (idx: number) => {
    const updated = [...exitRules];
    updated.splice(idx, 1);
    setExitRules(updated);
  };

  const handleExitRuleChange = (idx: number, key: string, val: string) => {
    const updated = [...exitRules];
    updated[idx][key] = val;
    setExitRules(updated);
  };

  const executeBacktest = async () => {
    setLoading(true);
    const config = {
      strategy_name: name,
      universe: {
        min_market_cap: Number(minMcap),
        sme_allowed: smeAllowed
      },
      portfolio: {
        rebalance_freq: rebalanceFreq,
        max_holdings: Number(maxHoldings),
        max_sector_exposure: Number(maxSectorExposure),
        transaction_cost: Number(transactionCost) / 100,
        slippage: Number(slippage) / 100
      },
      rules: entryRules,
      exits: exitRules,
      ranking: {
        quality: Number(qualityWeight),
        growth: Number(growthWeight),
        value: Number(valueWeight),
        momentum: Number(momentumWeight)
      },
      start_date: startDate,
      end_date: endDate
    };

    try {
      const response = await fetch("/api/backtests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      onRunBacktest(data);
    } catch (e) {
      console.error("Failed to run backtest simulation", e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-sm font-heading font-extrabold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-green" />
            <span>Strategy Sandbox & Backtest Builder</span>
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Formulate quant factors, set sector thresholds, define entry/exit signals, and simulate results over 20 years.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Setup Configs */}
        <div className="lg:col-span-1 space-y-6">
          {/* General and Universe Parameters */}
          <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
            <h4 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold flex items-center gap-1.5 border-b border-gray-850 pb-2.5">
              <Settings className="w-3.5 h-3.5" /> 1. Strategy Parameters
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">Backtest Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono text-gray-500 block mb-1">Min Cap (₹ Cr)</label>
                  <input
                    type="number"
                    value={minMcap}
                    onChange={(e) => setMinMcap(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 block mb-1">SME Listings</label>
                  <select
                    value={smeAllowed ? "yes" : "no"}
                    onChange={(e) => setSmeAllowed(e.target.value === "yes")}
                    className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none"
                  >
                    <option value="yes">Include</option>
                    <option value="no">Exclude</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio & Sizing Parameters */}
          <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
            <h4 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold flex items-center gap-1.5 border-b border-gray-850 pb-2.5">
              <Sliders className="w-3.5 h-3.5" /> 2. Portfolio Constraints
            </h4>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono text-gray-500 block mb-1">Rebalance Freq</label>
                  <select
                    value={rebalanceFreq}
                    onChange={(e) => setRebalanceFreq(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 block mb-1">Max Holdings</label>
                  <input
                    type="number"
                    value={maxHoldings}
                    onChange={(e) => setMaxHoldings(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono text-gray-500 block mb-1">Max Sector %</label>
                  <input
                    type="number"
                    value={maxSectorExposure}
                    onChange={(e) => setMaxSectorExposure(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 block mb-1">Tx Cost (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={transactionCost}
                    onChange={(e) => setTransactionCost(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">Slippage Drag (%)</label>
                <input
                  type="number"
                  step="0.05"
                  value={slippage}
                  onChange={(e) => setSlippage(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none text-center"
                />
              </div>
            </div>
          </div>

          {/* Date Range Config */}
          <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
            <h4 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold flex items-center gap-1.5 border-b border-gray-850 pb-2.5">
              <Calendar className="w-3.5 h-3.5" /> 3. Historical Range
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none text-center font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs text-gray-200 rounded p-2 focus:outline-none text-center font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Rules, Factor Weights, Launch */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dynamic Selection Signals */}
          <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-850 pb-2.5">
              <h4 className="text-[10px] font-mono text-brand-green uppercase tracking-widest font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-green" /> 4. Stock Entry Signals
              </h4>
              <button
                onClick={handleAddEntryRule}
                className="text-[9px] font-semibold text-brand-green hover:text-brand-green/80 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Signal
              </button>
            </div>

            <div className="space-y-3">
              {entryRules.map((rule, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-gray-950/45 p-2 rounded-lg border border-gray-900">
                  <select
                    value={rule.field}
                    onChange={(e) => handleEntryRuleChange(idx, "field", e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] font-semibold text-gray-300 rounded p-1.5 focus:outline-none"
                  >
                    {AVAILABLE_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>

                  <select
                    value={rule.op}
                    onChange={(e) => handleEntryRuleChange(idx, "op", e.target.value)}
                    className="w-12 bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] font-semibold text-gray-300 rounded p-1.5 focus:outline-none"
                  >
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value="==">==</option>
                  </select>

                  <input
                    type="text"
                    value={rule.val}
                    onChange={(e) => handleEntryRuleChange(idx, "val", e.target.value)}
                    placeholder="Value"
                    className="w-16 bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] text-gray-200 rounded p-1.5 focus:outline-none text-center font-mono"
                  />

                  <button
                    onClick={() => handleRemoveEntryRule(idx)}
                    disabled={entryRules.length === 1}
                    className="text-gray-500 hover:text-brand-red disabled:opacity-30 disabled:pointer-events-none cursor-pointer p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-b border-gray-850 pb-2.5 pt-4">
              <h4 className="text-[10px] font-mono text-brand-red uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-brand-red" /> 5. Custom Stop-Loss / Exits
              </h4>
              <button
                onClick={handleAddExitRule}
                className="text-[9px] font-semibold text-brand-red hover:text-brand-red/80 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Exit Condition
              </button>
            </div>

            <div className="space-y-3">
              {exitRules.map((rule, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-gray-950/45 p-2 rounded-lg border border-gray-900">
                  <select
                    value={rule.field}
                    onChange={(e) => handleExitRuleChange(idx, "field", e.target.value)}
                    className="flex-1 bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] font-semibold text-gray-300 rounded p-1.5 focus:outline-none"
                  >
                    {AVAILABLE_FIELDS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>

                  <select
                    value={rule.op}
                    onChange={(e) => handleExitRuleChange(idx, "op", e.target.value)}
                    className="w-12 bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] font-semibold text-gray-300 rounded p-1.5 focus:outline-none"
                  >
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                    <option value="==">==</option>
                  </select>

                  <input
                    type="text"
                    value={rule.val}
                    onChange={(e) => handleExitRuleChange(idx, "val", e.target.value)}
                    placeholder="Value"
                    className="w-16 bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] text-gray-200 rounded p-1.5 focus:outline-none text-center font-mono"
                  />

                  <button
                    onClick={() => handleRemoveExitRule(idx)}
                    className="text-gray-500 hover:text-brand-red cursor-pointer p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Factor Scoring Weights */}
          <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
            <h4 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold flex items-center gap-1.5 border-b border-gray-850 pb-2.5">
              <Sliders className="w-3.5 h-3.5 text-brand-blue" /> 6. Rank Sizing Weights
            </h4>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-400 font-semibold">Quality Weight</span>
                    <span className="font-mono text-white font-bold">{qualityWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={qualityWeight}
                    onChange={(e) => setQualityWeight(Number(e.target.value))}
                    className="w-full accent-brand-blue"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-400 font-semibold">Growth Weight</span>
                    <span className="font-mono text-white font-bold">{growthWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={growthWeight}
                    onChange={(e) => setGrowthWeight(Number(e.target.value))}
                    className="w-full accent-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-400 font-semibold">Value Weight</span>
                    <span className="font-mono text-white font-bold">{valueWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={valueWeight}
                    onChange={(e) => setValueWeight(Number(e.target.value))}
                    className="w-full accent-brand-blue"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-400 font-semibold">Momentum Weight</span>
                    <span className="font-mono text-white font-bold">{momentumWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={momentumWeight}
                    onChange={(e) => setMomentumWeight(Number(e.target.value))}
                    className="w-full accent-brand-blue"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={executeBacktest}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-brand-green to-brand-green/80 hover:from-brand-green/90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {loading ? "Simulating Historical Portfolios (2006-2026)..." : "Launch Backtest Run"}
          </button>
        </div>
      </div>
    </div>
  );
}
