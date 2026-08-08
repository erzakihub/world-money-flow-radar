import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Database, 
  ChevronRight, 
  ChevronDown,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  Flame,
  Scale
} from "lucide-react";
import DataQualityBadge from "../components/DataQualityBadge";

export default function CountryLiquidityGrid() {
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  const fetchCountries = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/flow-pulse/countries");
      const data = await response.json();
      setCountries(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const toggleExpand = (cid: string) => {
    if (expandedCountry === cid) {
      setExpandedCountry(null);
    } else {
      setExpandedCountry(cid);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-blue"></div>
      </div>
    );
  }

  // Filter top 10 economies (US, CN, JP, DE, IN, UK, FR, IT, CA, KR)
  const top10Ids = ["us", "cn", "jp", "de", "in", "uk", "fr", "it", "ca", "kr"];
  const top10Economies = countries.filter((c: any) => top10Ids.includes(c.id));
  const otherEconomies = countries.filter((c: any) => !top10Ids.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="text-brand-blue w-6 h-6 animate-spin-slow" />
            <span>Country Liquidity Diagnostics Grid</span>
          </h2>
          <p className="text-xs text-gray-550 mt-0.5">
            Audit core money market stress, credit impulses, SLOOS lending standards, and interest fiscal drags across the Top 10 economies.
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-blue" />
          <span>Top 10 Economies Mapped</span>
        </div>
      </div>

      {/* Grid of Top 10 Economies */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {top10Economies.map((c: any) => {
          const isExpanded = expandedCountry === c.id;
          
          return (
            <div 
              key={c.id} 
              className={`bg-bg-card border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
                isExpanded ? "border-brand-blue bg-brand-blue/[0.02]" : "border-gray-850 hover:border-gray-700"
              }`}
              onClick={() => toggleExpand(c.id)}
            >
              {/* Header Info */}
              <div className="p-5 flex justify-between items-center bg-gray-950/20">
                <div className="flex items-center gap-3">
                  <span className="text-3xl select-none">{c.flag}</span>
                  <div>
                    <h4 className="font-bold text-white leading-tight flex items-center gap-2">
                      <span>{c.name}</span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                        c.score >= 70 ? "text-brand-green bg-brand-green/8 border-brand-green/20" :
                        c.score >= 50 ? "text-brand-blue bg-brand-blue/8 border-brand-blue/20" :
                        "text-brand-red bg-brand-red/8 border-brand-red/20"
                      }`}>
                        {c.diagnostic_stage}
                      </span>
                    </h4>
                    <span className="text-[9px] font-mono text-gray-500 uppercase mt-0.5 block">{c.central_bank}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[8px] text-gray-500 uppercase block font-mono">Flow Score</span>
                    <span className={`text-lg font-extrabold font-mono ${
                      c.score >= 70 ? "text-brand-green" : c.score >= 50 ? "text-white" : "text-brand-red"
                    }`}>{c.score.toFixed(1)}</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-brand-blue" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                </div>
              </div>

              {/* Collapsed Standard Stats */}
              {!isExpanded && (
                <div className="grid grid-cols-3 gap-2 px-5 py-3 border-t border-gray-900 text-[10px] font-mono text-gray-400">
                  <div>
                    <span className="text-[8px] text-gray-500 block uppercase">Credit Impulse</span>
                    <span className="font-bold text-white">{(c.credit_impulse_yoy || 0) >= 0 ? "+" : ""}{c.credit_impulse_yoy}%</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-500 block uppercase">Funding Stress</span>
                    <span className={`font-bold ${(c.funding_stress_spread || 0) > 0.04 ? "text-brand-red" : "text-brand-green"}`}>
                      {(c.funding_stress_spread || 0).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-500 block uppercase">Fiscal Drag</span>
                    <span className="font-bold text-white">{(c.sovereign_fiscal_drag || 0).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {/* Expanded Institutional Diagnostics */}
              {isExpanded && (
                <div className="p-5 border-t border-gray-900 space-y-4 bg-gray-950/40 animate-slide-up">
                  <h5 className="text-[9px] font-mono text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-1.5 flex items-center justify-between">
                    <span>Institutional Plumbing & Indicators</span>
                    <span className="text-brand-blue">Active Verification</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Indicator 1 */}
                    <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-gray-550 uppercase">1. SOFR-IORB Stress Spread</span>
                        <span className={`text-[9px] font-mono font-bold ${(c.funding_stress_spread || 0) > 0.04 ? "text-brand-red" : "text-brand-green"}`}>
                          {(c.funding_stress_spread || 0) > 0.04 ? "🔒 Tightening" : "🔓 Liquid"}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold font-mono text-white">{(c.funding_stress_spread || 0).toFixed(2)}%</span>
                        <span className="text-[8px] text-gray-500">Fed/CB Overnight Spread</span>
                      </div>
                    </div>

                    {/* Indicator 2 */}
                    <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-gray-550 uppercase">2. Credit Impulse (YoY Velocity)</span>
                        <span className={`text-[9px] font-mono font-bold ${(c.credit_impulse_yoy || 0) > 2 ? "text-brand-green" : "text-brand-yellow"}`}>
                          {(c.credit_impulse_yoy || 0) > 2 ? "📈 Expansion" : "📉 Weak Velocity"}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold font-mono text-white">
                          {(c.credit_impulse_yoy || 0) >= 0 ? "+" : ""}{(c.credit_impulse_yoy || 0).toFixed(1)}%
                        </span>
                        <span className="text-[8px] text-gray-500">Year-on-Year Expansion</span>
                      </div>
                    </div>

                    {/* Indicator 3 */}
                    <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-gray-550 uppercase">3. Lending Standards net Tightening</span>
                        <span className={`text-[9px] font-mono font-bold ${(c.credit_tightening_standards || 0) > 10 ? "text-brand-red" : "text-brand-green"}`}>
                          {(c.credit_tightening_standards || 0) > 10 ? "⚠️ Restricting" : "✓ Accommodating"}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold font-mono text-white">
                          {(c.credit_tightening_standards || 0) >= 0 ? "+" : ""}{(c.credit_tightening_standards || 0).toFixed(1)}%
                        </span>
                        <span className="text-[8px] text-gray-500">Survey net tighten ratio</span>
                      </div>
                    </div>

                    {/* Indicator 4 */}
                    <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/40 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-gray-550 uppercase">4. Cross-Currency Swap Basis</span>
                        <span className={`text-[9px] font-mono font-bold ${(c.currency_basis_spread || 0) < -15 ? "text-brand-red" : "text-brand-green"}`}>
                          {(c.currency_basis_spread || 0) < -15 ? "⚠️ Dollar Squeeze" : "✓ Standard Sourcing"}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold font-mono text-white">{(c.currency_basis_spread || 0).toFixed(1)} bps</span>
                        <span className="text-[8px] text-gray-500">Synthetic Dollar Premium</span>
                      </div>
                    </div>

                    {/* Indicator 5 */}
                    <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/40 space-y-1.5 sm:col-span-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-gray-550 uppercase">5. Sovereign Debt Interest Coverage (Fiscal Drag)</span>
                        <span className={`text-[9px] font-mono font-bold ${(c.sovereign_fiscal_drag || 0) > 15 ? "text-brand-red animate-pulse" : "text-gray-500"}`}>
                          {(c.sovereign_fiscal_drag || 0) > 15 ? "⚠️ Severe Fiscal Burden" : "✓ Sustainable"}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold font-mono text-white">{(c.sovereign_fiscal_drag || 0).toFixed(1)}%</span>
                        <span className="text-[8px] text-gray-500">Interest Payments / Tax Receipts ratio</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-brand-blue/4 border border-brand-blue/10 rounded-xl flex gap-2.5 text-[10px] text-gray-400 leading-relaxed">
                    <Info className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-300 block mb-0.5">Diagnostics & Yield Slope Interpretation</strong>
                      {c.name} yield curve is displaying a <strong className="text-white">{c.yield_curve_regime}</strong> slope. {c.yield_curve_desc}{" "}
                      The net diagnostic confirms the country is in a <strong className="text-white">{c.diagnostic_stage}</strong> regime.
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Secondary Economies section */}
      {otherEconomies.length > 0 && (
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
          <h3 className="text-[11px] font-heading font-bold text-white uppercase tracking-wider">
            Secondary & Resource-Heavy Mapped Economies
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {otherEconomies.map((c: any) => (
              <div key={c.id} className="p-3 bg-gray-900/30 border border-gray-800/40 rounded-lg text-center font-mono">
                <span className="text-xl select-none block mb-1">{c.flag}</span>
                <span className="text-[10px] font-bold text-gray-200 block truncate">{c.name}</span>
                <span className="text-[8px] text-gray-500 block uppercase mt-0.5">{c.central_bank}</span>
                <span className="text-xs font-bold text-brand-green mt-1.5 block">{c.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

