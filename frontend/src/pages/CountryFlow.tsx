import React, { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from "recharts";
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle,
  Database,
  ArrowRightLeft,
  Coins,
  Shield,
  Activity,
  ArrowRight
} from "lucide-react";
import DataQualityBadge from "../components/DataQualityBadge";

export default function CountryFlow() {
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [countryHistory, setCountryHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/flow-pulse/countries");
      const data = await response.json();
      setCountries(data || []);
      
      if (data && data.length > 0) {
        setSelectedCountry(data[0]);
        fetchCountryHistory(data[0].id);
      }
    } catch (e) {
      console.error("Failed to fetch country flow scores", e);
    }
    setLoading(false);
  };

  const fetchCountryHistory = async (countryId: string) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/flow-pulse/country/${countryId}`);
      const data = await response.json();
      setCountryHistory(data.history || []);
    } catch (e) {
      console.error("Failed to fetch country history details", e);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleCountrySelect = (c: any) => {
    setSelectedCountry(c);
    fetchCountryHistory(c.id);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-brand-green border-brand-green/20 bg-brand-green/5";
    if (score >= 52) return "text-brand-yellow border-brand-yellow/20 bg-brand-yellow/5";
    return "text-brand-red border-brand-red/20 bg-brand-red/5";
  };

  const getRiskColor = (risk: string) => {
    if (risk === "Low") return "text-brand-green";
    if (risk === "Medium") return "text-brand-yellow";
    return "text-brand-red animate-pulse font-bold";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="text-brand-blue w-6 h-6 animate-spin-slow" />
            <span>Country Money Flow Radar</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit sovereign official liquidity, credit impulses, yield curves, and external balances for 15 major global economies.
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-blue" />
          <span>Covered Sovereigns: 15 Countries</span>
        </div>
      </div>

      {/* Main Grid: Country Tiles (8 cols) vs detail panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Grid of country tiles */}
        {loading ? (
          <div className="lg:col-span-8 flex items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-blue"></div>
          </div>
        ) : (
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {countries.map((c) => {
              const isSelected = selectedCountry?.id === c.id;
              return (
                <div 
                  key={c.id}
                  onClick={() => handleCountrySelect(c)}
                  className={`bg-bg-card border rounded-xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between h-[210px] ${
                    isSelected ? "border-brand-blue shadow-brand-blue/5" : "border-gray-850 hover:border-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl select-none">{c.flag}</span>
                      <div>
                        <h4 className="font-bold text-white leading-tight">{c.name}</h4>
                        <span className="text-[9px] font-mono text-gray-500 uppercase mt-0.5 block">{c.central_bank}</span>
                      </div>
                    </div>
                    <DataQualityBadge status={c.data_quality} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-y border-gray-900 py-3 mt-3 text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-gray-500 uppercase">Flow Score</span>
                      <span className={`text-md font-extrabold mt-0.5 ${getScoreColor(c.score).split(" ")[0]}`}>
                        {c.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-gray-500 uppercase">Curve Regime</span>
                      <span className="text-gray-300 font-bold mt-0.5 leading-snug overflow-hidden text-ellipsis whitespace-nowrap">
                        {c.yield_curve_regime}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono text-gray-400">
                    <div>
                      <span className="text-[8px] text-gray-500 uppercase block">Liquidity</span>
                      <span className="font-bold text-white">{c.official_liquidity.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-500 uppercase block">Credit Imp</span>
                      <span className="font-bold text-white">{c.credit_impulse.toFixed(0)}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-500 uppercase block">FX Risk</span>
                      <span className={`font-bold ${getRiskColor(c.currency_risk)}`}>{c.currency_risk}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Right Column: Country detail panel (4 cols) */}
        <div className="lg:col-span-4">
          {selectedCountry ? (
            <div className="bg-bg-card border border-gray-850 rounded-xl p-5 space-y-5 sticky top-24 shadow-xl flex flex-col justify-between">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-800/85 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl select-none">{selectedCountry.flag}</span>
                  <div>
                    <h3 className="text-md font-heading font-extrabold text-white">{selectedCountry.name}</h3>
                    <span className="text-[9px] font-mono text-gray-500 uppercase block">{selectedCountry.central_bank} Audit</span>
                  </div>
                </div>
                <DataQualityBadge status={selectedCountry.data_quality} />
              </div>

              {/* Grid indicators */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-gray-950/40 rounded-xl border border-gray-900">
                  <span className="text-[8px] text-gray-500 uppercase block">Equity Bull Prob</span>
                  <span className="text-lg font-bold text-brand-green mt-0.5 block">{selectedCountry.equity_bull_probability}%</span>
                </div>
                <div className="p-3 bg-gray-955/40 rounded-xl border border-gray-900">
                  <span className="text-[8px] text-gray-500 uppercase block">Bond Bull Prob</span>
                  <span className="text-lg font-bold text-brand-blue mt-0.5 block">{selectedCountry.bond_bull_probability}%</span>
                </div>
              </div>

              {/* Central Bank Trend Chart */}
              {historyLoading ? (
                <div className="h-[120px] flex items-center justify-center border border-gray-850/50 rounded-lg bg-gray-955/10">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-brand-blue"></div>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-gray-500 uppercase">CB Reserve & Credit Impulse Trend (12 Months)</span>
                  <div className="h-[110px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={countryHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                        <XAxis dataKey="date" stroke="#6b7280" tickLine={false} style={{ fontSize: 7, fontFamily: "monospace" }} />
                        <YAxis stroke="#6b7280" tickLine={false} style={{ fontSize: 7, fontFamily: "monospace" }} domain={[0, 100]} />
                        <Line type="monotone" dataKey="liquidity" name="Liquidity" stroke="#00b0ff" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="credit" name="Credit Impulse" stroke="#ffb300" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Yield curve & external balance */}
              <div className="bg-gray-955/40 p-4 rounded-xl border border-gray-900 text-xs space-y-3 leading-relaxed">
                <div>
                  <span className="text-[8px] font-mono text-gray-500 uppercase flex items-center gap-1">
                    <Activity className="w-3 h-3 text-orange-400" />
                    <span>Yield Curve: {selectedCountry.yield_curve_regime}</span>
                  </span>
                  <p className="text-gray-300 mt-1 leading-snug font-sans">{selectedCountry.yield_curve_desc}</p>
                </div>
                
                <div className="flex justify-between items-center border-t border-gray-900 pt-3 text-xs font-mono">
                  <span className="text-gray-500">External Balance / CA AUM:</span>
                  <span className="font-bold text-white">{selectedCountry.external_balance.toFixed(1)}/100</span>
                </div>
                
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-500">Currency FX Risk Rating:</span>
                  <span className={`font-bold ${getRiskColor(selectedCountry.currency_risk)}`}>{selectedCountry.currency_risk}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-900 pt-3 text-[10px] font-mono text-gray-550 flex items-center gap-1.5 justify-between">
                <span>Central Bank: {selectedCountry.central_bank}</span>
                <span className="text-gray-500">World Money Flow Radar</span>
              </div>

            </div>
          ) : (
            <div className="bg-bg-card border border-gray-850 rounded-xl p-6 text-center h-full flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
              <HelpCircle className="w-9 h-9 text-gray-700 mb-3" />
              <p className="text-xs">
                Select any country tile in the grid to audit central bank balance sheet momentum, loan growth rates, and yield curve regimes.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
