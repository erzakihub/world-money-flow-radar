import React, { useState } from "react";
import { Sliders, Plus, Trash2, Play, Table, AlertCircle, HelpCircle } from "lucide-react";

interface ScreenerProps {
  onSelectStock: (symbol: string) => void;
}

const AVAILABLE_FIELDS = [
  { value: "pe", label: "P/E Ratio", desc: "Price to Earnings Ratio" },
  { value: "roce", label: "ROCE (%)", desc: "Return on Capital Employed" },
  { value: "roe", label: "ROE (%)", desc: "Return on Equity" },
  { value: "debt_equity", label: "Debt/Equity Ratio", desc: "Leasing & Debt to Net Worth" },
  { value: "market_cap", label: "Market Cap (₹ Cr)", desc: "Total shares outstanding value" },
  { value: "quality_score", label: "Quality Score", desc: "Aggregate profitability & accruals" },
  { value: "growth_score", label: "Growth Score", desc: "Revenue & profit CAGR progression" },
  { value: "value_score", label: "Value Score", desc: "Valuation models rank (PE, PB, EBITDA)" },
  { value: "momentum_score", label: "Momentum Score", desc: "Relative price strength trend" },
  { value: "composite_score", label: "Composite Rank", desc: "Unified multi-factor rank score" },
  { value: "piotroski_f_score", label: "Piotroski F-Score", desc: "9-point accounting health score" },
  { value: "altman_z_score", label: "Altman Z-Score", desc: "Bankruptcy likelihood index" },
];

const PRESETS = [
  {
    name: "Undervalued Quality Compounders",
    desc: "ROE > 15%, PE < 25, Quality Score > 70",
    rules: [
      { field: "roe", op: ">", val: "15" },
      { field: "pe", op: "<", val: "25" },
      { field: "quality_score", op: ">=", val: "70" }
    ]
  },
  {
    name: "High Momentum Compounders",
    desc: "Composite Score > 75, Momentum > 70, Debt/Equity < 0.5",
    rules: [
      { field: "composite_score", op: ">=", val: "75" },
      { field: "momentum_score", op: ">=", val: "70" },
      { field: "debt_equity", op: "<", val: "0.5" }
    ]
  },
  {
    name: "Deep Value turnaround",
    desc: "P/E < 15, Value Score > 70, Piotroski F-Score >= 6",
    rules: [
      { field: "pe", op: "<", val: "15" },
      { field: "value_score", op: ">=", val: "70" },
      { field: "piotroski_f_score", op: ">=", val: "6" }
    ]
  }
];

export default function Screener({ onSelectStock }: ScreenerProps) {
  const [rules, setRules] = useState<any[]>([
    { field: "composite_score", op: ">=", val: "60" }
  ]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const handleAddRule = () => {
    setRules([...rules, { field: "pe", op: "<", val: "25" }]);
  };

  const handleRemoveRule = (index: number) => {
    const updated = [...rules];
    updated.splice(index, 1);
    setRules(updated);
  };

  const handleRuleChange = (index: number, key: string, value: string) => {
    const updated = [...rules];
    updated[index][key] = value;
    setRules(updated);
  };

  const loadPreset = (preset: any) => {
    setRules(preset.rules);
  };

  const executeScan = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/screens/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules })
      });
      const data = await response.json();
      setMatches(data.matches || []);
      setHasScanned(true);
    } catch (e) {
      console.error("Failed to run screener rules scan", e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl">
        <h2 className="text-sm font-heading font-extrabold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-green" />
          <span>Composite Multi-Factor Screener</span>
        </h2>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Scan the entire NSE/BSE database by combining fundamental ratios, Piotroski scores, and technical factor rankings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Panel */}
        <div className="lg:col-span-1 bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-850 pb-2.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">Screener Rules</span>
            <button
              onClick={handleAddRule}
              className="text-[9px] font-semibold text-brand-green hover:text-brand-green/80 flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Condition
            </button>
          </div>

          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-gray-950/45 p-2 rounded-lg border border-gray-900">
                <select
                  value={rule.field}
                  onChange={(e) => handleRuleChange(idx, "field", e.target.value)}
                  className="flex-1 bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] font-semibold text-gray-300 rounded p-1.5 focus:outline-none"
                >
                  {AVAILABLE_FIELDS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>

                <select
                  value={rule.op}
                  onChange={(e) => handleRuleChange(idx, "op", e.target.value)}
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
                  onChange={(e) => handleRuleChange(idx, "val", e.target.value)}
                  placeholder="Value"
                  className="w-16 bg-gray-950 border border-gray-800 focus:border-brand-blue text-[10px] text-gray-200 rounded p-1.5 focus:outline-none text-center"
                />

                <button
                  onClick={() => handleRemoveRule(idx)}
                  disabled={rules.length === 1}
                  className="text-gray-500 hover:text-brand-red disabled:opacity-30 disabled:pointer-events-none cursor-pointer p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Quick presets */}
          <div className="pt-2">
            <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Flagship Presets</span>
            <div className="space-y-1.5">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(p)}
                  className="w-full p-2 bg-gray-950/30 border border-gray-900 hover:border-brand-blue/30 rounded-lg text-left transition-colors"
                >
                  <span className="text-[9px] font-bold text-white block">{p.name}</span>
                  <span className="text-[8px] text-gray-500 block truncate">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={executeScan}
            disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-brand-blue to-brand-blue/80 hover:from-brand-blue/90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {loading ? "Scanning Universe..." : "Run Filter Scan"}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 bg-[#13151e] border border-gray-800/40 rounded-xl p-5 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between border-b border-gray-850 pb-2.5 mb-4">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-brand-blue" /> Matches ({matches.length})
            </span>
          </div>

          {!hasScanned && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10">
              <HelpCircle className="w-8 h-8 text-gray-600" />
              <span className="text-xs text-gray-500 font-medium">Define rules and click scan to query database</span>
            </div>
          )}

          {hasScanned && matches.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10">
              <AlertCircle className="w-8 h-8 text-brand-yellow" />
              <span className="text-xs text-gray-500 font-medium">No active stocks matched the filter conditions</span>
            </div>
          )}

          {hasScanned && matches.length > 0 && (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-950/40 border-b border-gray-850 font-mono text-[9px] text-gray-400">
                    <th className="p-3">Symbol</th>
                    <th className="p-3">Company Name</th>
                    <th className="p-3">Sector</th>
                    <th className="p-3 text-right">PE</th>
                    <th className="p-3 text-right">ROCE</th>
                    <th className="p-3 text-right">D/E</th>
                    <th className="p-3 text-center">Composite</th>
                    <th className="p-3 text-center">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 font-sans text-gray-300">
                  {matches.map((m) => (
                    <tr key={m.symbol} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-3 font-bold font-mono text-white">{m.symbol}</td>
                      <td className="p-3 font-medium truncate max-w-[150px]">{m.name}</td>
                      <td className="p-3 text-gray-400">{m.sector}</td>
                      <td className="p-3 font-mono text-right text-white">
                        {m.pe ? m.pe.toFixed(1) : "N/A"}
                      </td>
                      <td className="p-3 font-mono text-right text-brand-green">
                        {m.roce.toFixed(1)}%
                      </td>
                      <td className="p-3 font-mono text-right">
                        {m.debt_equity !== null ? m.debt_equity.toFixed(2) : "N/A"}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-brand-blue/10 text-brand-blue border border-brand-blue/20 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                          {m.composite_score.toFixed(0)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onSelectStock(m.symbol)}
                          className="px-2 py-0.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded text-[9px] font-semibold text-gray-200 transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
