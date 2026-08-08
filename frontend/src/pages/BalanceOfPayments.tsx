import React, { useState, useEffect, useMemo } from "react";
import { ArrowRightLeft, Scale, Compass, TrendingUp, AlertCircle } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";

export default function BalanceOfPayments() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("All");
  const [visibleCountries, setVisibleCountries] = useState<Record<string, boolean>>({
    US: true,
    China: true,
    GCC: true,
    Japan: true,
    India: true
  });

  // Historical data from expanded API
  const niipHistory = data?.historical || {};
  const caHistory = data?.current_account_history || {};

  // Helper formatting functions
  const formatTrillion = (valInBillions: number) => {
    if (valInBillions === undefined || valInBillions === null) return "N/A";
    const absVal = Math.abs(valInBillions);
    if (absVal >= 1000) {
      return `$${(absVal / 1000).toFixed(2)}T`;
    }
    return `$${valInBillions.toFixed(0)}B`;
  };

  const formatNIIP = (valInBillions: number) => {
    if (valInBillions === undefined || valInBillions === null) return "N/A";
    const prefix = valInBillions >= 0 ? "+" : "-";
    const absVal = Math.abs(valInBillions);
    if (absVal >= 1000) {
      return `${prefix}$${(absVal / 1000).toFixed(2)}T`;
    }
    return `${prefix}$${absVal.toFixed(0)}B`;
  };

  const NIIP_COLORS: Record<string, string> = {
    US: "#ff1744",
    Japan: "#29b6f6",
    China: "#ffa726",
    GCC: "#00e676",
    India: "#ab47bc",
  };

  const CA_COLORS: Record<string, string> = {
    US: "#ff1744",
    Japan: "#29b6f6",
    China: "#ffa726",
    GCC: "#00e676",
    India: "#ab47bc",
  };

  // Helper to merge country series into a flat array of objects
  const mergeCountryHistory = (historyObj: Record<string, any[]>, dataKeyName: string) => {
    const nameMap: Record<string, string> = {
      "United States": "US",
      "Japan": "Japan",
      "China": "China",
      "Gulf Nations (GCC)": "GCC",
      "India": "India"
    };

    const merged: Record<number, any> = {};
    Object.entries(historyObj).forEach(([country, list]) => {
      const mappedKey = nameMap[country] || country;
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          const yr = item.year;
          if (yr !== undefined) {
            if (!merged[yr]) {
              merged[yr] = { year: yr };
            }
            merged[yr][mappedKey] = item[dataKeyName];
          }
        });
      }
    });

    return Object.values(merged).sort((a: any, b: any) => a.year - b.year);
  };

  // Filter by period
  const filterByPeriod = (arr: any[]) => {
    if (!arr || arr.length === 0 || period === "All") return arr;
    const now = new Date().getFullYear();
    const yearsBack = period === "5Y" ? 5 : period === "10Y" ? 10 : 20;
    const cutoff = now - yearsBack;
    return arr.filter((d: any) => {
      const year = parseInt(d.year || d.date);
      return !isNaN(year) && year >= cutoff;
    });
  };

  const formattedNIIP = useMemo(() => mergeCountryHistory(niipHistory, "niip"), [niipHistory]);
  const formattedCA = useMemo(() => mergeCountryHistory(caHistory, "ca"), [caHistory]);
  
  const capHistory = data?.capital_account_history || {};
  const formattedCAP = useMemo(() => mergeCountryHistory(capHistory, "cap"), [capHistory]);

  const filteredNIIP = useMemo(() => filterByPeriod(formattedNIIP), [formattedNIIP, period]);
  const filteredCA = useMemo(() => filterByPeriod(formattedCA), [formattedCA, period]);
  const filteredCAP = useMemo(() => filterByPeriod(formattedCAP), [formattedCAP, period]);

  // Dynamic Y-axis scaling functions to force Recharts to zoom in when countries (like US) are hidden
  const niipYDomain = useMemo(() => {
    if (filteredNIIP.length === 0) return [0, 100];
    let minVal = Infinity;
    let maxVal = -Infinity;
    filteredNIIP.forEach((d: any) => {
      Object.entries(visibleCountries).forEach(([countryCode, isVisible]) => {
        if (isVisible && d[countryCode] !== undefined) {
          const v = d[countryCode];
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      });
    });
    if (minVal === Infinity) return [0, 100];
    const pad = Math.abs(maxVal - minVal) * 0.1 || 100;
    return [Math.floor(minVal - pad), Math.ceil(maxVal + pad)];
  }, [filteredNIIP, visibleCountries]);

  const caYDomain = useMemo(() => {
    if (filteredCA.length === 0) return [0, 100];
    let minVal = Infinity;
    let maxVal = -Infinity;
    filteredCA.forEach((d: any) => {
      Object.entries(visibleCountries).forEach(([countryCode, isVisible]) => {
        if (isVisible && d[countryCode] !== undefined) {
          const v = d[countryCode];
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      });
    });
    if (minVal === Infinity) return [0, 100];
    const pad = Math.abs(maxVal - minVal) * 0.15 || 50;
    return [Math.floor(minVal - pad), Math.ceil(maxVal + pad)];
  }, [filteredCA, visibleCountries]);

  const capYDomain = useMemo(() => {
    if (filteredCAP.length === 0) return [0, 100];
    let minVal = Infinity;
    let maxVal = -Infinity;
    filteredCAP.forEach((d: any) => {
      Object.entries(visibleCountries).forEach(([countryCode, isVisible]) => {
        if (isVisible && d[countryCode] !== undefined) {
          const v = d[countryCode];
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      });
    });
    if (minVal === Infinity) return [0, 100];
    const pad = Math.abs(maxVal - minVal) * 0.15 || 25;
    return [Math.floor(minVal - pad), Math.ceil(maxVal + pad)];
  }, [filteredCAP, visibleCountries]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/balance-of-payments")
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  const NIIPTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Filter out hidden country values from tooltip
      const visiblePayload = payload.filter((entry: any) => visibleCountries[entry.dataKey] !== false);
      if (visiblePayload.length === 0) return null;
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left max-w-[220px]">
          <p className="text-gray-400 font-semibold mb-1">{label}</p>
          {visiblePayload.map((entry: any) => (
            <div key={entry.dataKey} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.dataKey}</span>
              <span className="text-white font-semibold">
                {entry.value >= 1000 || entry.value <= -1000 
                  ? `$${(entry.value / 1000).toFixed(2)}T` 
                  : `$${entry.value.toFixed(0)}B`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const toggleCountry = (country: string) => {
    setVisibleCountries(prev => ({
      ...prev,
      [country]: !prev[country]
    }));
  };

  const selectExportersOnly = () => {
    setVisibleCountries({
      US: false,
      China: true,
      GCC: true,
      Japan: true,
      India: true
    });
  };

  const selectAll = () => {
    setVisibleCountries({
      US: true,
      China: true,
      GCC: true,
      Japan: true,
      India: true
    });
  };

  // Extract country positions dynamically from the matrix
  const us = data.debt_matrix.find((c: any) => c.country === "United States") || {};
  const jp = data.debt_matrix.find((c: any) => c.country === "Japan") || {};
  const cn = data.debt_matrix.find((c: any) => c.country === "China") || {};
  const gcc = data.debt_matrix.find((c: any) => c.country === "Gulf Nations (GCC)") || {};
  const ind = data.debt_matrix.find((c: any) => c.country === "India") || {};

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Global Balance of Payments & Debt Matrix</h2>
          <p className="text-sm text-gray-550">Analyze Net International Investment Positions (NIIP), current/capital accounts, and leverage profiles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Action filters */}
          <div className="flex gap-1.5 bg-gray-900/60 border border-gray-800 rounded-lg p-0.5">
            <button
              onClick={selectAll}
              className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
                visibleCountries.US ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Show All
            </button>
            <button
              onClick={selectExportersOnly}
              className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
                !visibleCountries.US && visibleCountries.China ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Exporters Only (Scale Zoom)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            {["5Y", "10Y", "20Y", "All"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all duration-150 ${
                  period === p
                    ? "bg-brand-green text-gray-950 font-bold"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Legend Toggles */}
      <div className="bg-bg-card border border-gray-850 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-gray-400 font-mono text-[10px] uppercase">Toggle Countries (Auto-scales Y-Axis):</span>
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(NIIP_COLORS).map(([name, color]) => {
            const isVisible = visibleCountries[name] !== false;
            return (
              <button
                key={name}
                onClick={() => toggleCountry(name)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  isVisible 
                    ? "bg-gray-900 text-white" 
                    : "bg-transparent text-gray-600 border-dashed border-gray-800"
                }`}
                style={{ borderColor: isVisible ? `${color}40` : "" }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isVisible ? color : "#374151" }} />
                <span className="font-mono">{name}</span>
                <span className="text-[9px] font-bold text-gray-500">{isVisible ? "ON" : "OFF"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Macro Expert's Asset Prediction Playbook */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand-green animate-pulse" />
          <h3 className="text-md font-heading font-semibold text-white">
            Macro Expert's Asset Prediction Playbook (BOP & Reserves Flow Transmission)
          </h3>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          How balance of payments and sovereign reserve accumulations directly transmit into global asset prices. The world's top macro funds track these rules to position for major capital relocations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
          {data.predictive_rules.map((rule: any, idx: number) => (
            <div key={idx} className="bg-gray-950/40 border border-gray-850 p-4 rounded-xl flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono font-bold tracking-wider text-gray-500 uppercase">Signal Regime #{idx + 1}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold ${
                    rule.probability.includes("HIGH") 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {rule.probability}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white leading-snug">{rule.trigger}</h4>
              </div>

              <div className="space-y-2 border-t border-gray-900 pt-2 text-[11px]">
                <div>
                  <span className="text-gray-500 font-mono block text-[9px] uppercase tracking-wider">Expected Capital Flow:</span>
                  <p className="text-gray-400 mt-0.5 leading-relaxed">{rule.expected_flow}</p>
                </div>
                <div className="bg-gray-900/60 p-2 rounded-lg border border-gray-850">
                  <span className="text-brand-green font-mono block text-[9px] uppercase tracking-wider font-bold">Predicted Asset Beneficiaries:</span>
                  <p className="text-brand-blue font-bold mt-1 text-[11px] font-mono">{rule.asset_rise}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Expert Synthesis Panel */}
          <div className="bg-gradient-to-br from-brand-blue/10 to-brand-green/5 border border-brand-blue/20 p-4 rounded-xl flex flex-col justify-between space-y-3 md:col-span-2 xl:col-span-1">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold tracking-wider text-brand-blue uppercase">Global Liquidity Command Advisor</span>
              <h4 className="text-xs font-bold text-white">Active Regime Synthesis</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                China and GCC surplus recycling has structurally shifted. Instead of buying US Treasuries, current account windfalls are recycled directly to purchase commodities and physical Gold. This explains the secular breakout in <strong>Gold (GLD)</strong> despite high US real rates.
              </p>
            </div>
            <div className="text-[11px] leading-relaxed text-gray-305 border-t border-brand-blue/10 pt-2 font-mono">
              <span className="text-brand-green font-bold">India Outlook:</span> Capital Account Inflow surplus offsets CA deficit. Domestically, RBI accumulation of forex reserves acts as a local liquidity multiplier. <strong>Bullish Nifty 50.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* NIIP Evolution Chart */}
      {filteredNIIP.length > 0 && (
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-blue" />
            <span>NIIP Evolution (USD Billions)</span>
          </h3>
          <p className="text-xs text-gray-550">
            Net International Investment Position trajectory for major economies. Positive = net creditor, negative = net debtor. <strong>Toggle off the US above to auto-scale the creditor trends!</strong>
          </p>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={filteredNIIP} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e303a" vertical={false} />
                <XAxis dataKey="year" stroke="#6b7280" tickLine={false} style={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis 
                  stroke="#6b7280" 
                  tickLine={false} 
                  style={{ fontSize: 10, fontFamily: "monospace" }}
                  domain={niipYDomain}
                  tickFormatter={(v: number) => {
                    const absV = Math.abs(v);
                    const prefix = v >= 0 ? "" : "-";
                    return absV >= 1000 ? `${prefix}$${(absV / 1000).toFixed(1)}T` : `${prefix}$${absV}B`;
                  }} 
                />
                <ReferenceLine y={0} stroke="#4b5563" strokeWidth={1} strokeDasharray="4 2" />
                <Tooltip content={<NIIPTooltip />} />
                {Object.entries(NIIP_COLORS).map(([key, color]) => (
                  visibleCountries[key] !== false && (
                    <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Current Account Trend Chart */}
      {filteredCA.length > 0 && (
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-brand-yellow" />
            <span>Current Account Balance Trends (USD Billions)</span>
          </h3>
          <p className="text-xs text-gray-550">
            Current account surplus/deficit for each country over time. Surplus nations export capital; deficit nations import it.
          </p>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={filteredCA} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  {Object.entries(CA_COLORS).map(([key, color]) => (
                    <linearGradient key={key} id={`ca-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e303a" vertical={false} />
                <XAxis dataKey="year" stroke="#6b7280" tickLine={false} style={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis 
                  stroke="#6b7280" 
                  tickLine={false} 
                  style={{ fontSize: 10, fontFamily: "monospace" }} 
                  domain={caYDomain}
                  tickFormatter={(v: number) => `$${v}B`} 
                />
                <ReferenceLine y={0} stroke="#4b5563" strokeWidth={1} strokeDasharray="4 2" />
                <Tooltip content={<NIIPTooltip />} />
                {Object.entries(CA_COLORS).map(([key, color]) => (
                  visibleCountries[key] !== false && (
                    <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} fill={`url(#ca-grad-${key})`} />
                  )
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Capital Account Trend Chart */}
      {filteredCAP.length > 0 && (
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-green" />
            <span>Capital Account Balance Trends (USD Billions)</span>
          </h3>
          <p className="text-xs text-gray-555">
            Capital account net transactions (FDI, FPI, and Official Reserves flows). Capital flows offset trade imbalances to clear global payments.
          </p>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={filteredCAP} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  {Object.entries(NIIP_COLORS).map(([key, color]) => (
                    <linearGradient key={key} id={`cap-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e303a" vertical={false} />
                <XAxis dataKey="year" stroke="#6b7280" tickLine={false} style={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis 
                  stroke="#6b7280" 
                  tickLine={false} 
                  style={{ fontSize: 10, fontFamily: "monospace" }} 
                  domain={capYDomain}
                  tickFormatter={(v: number) => `$${v}B`} 
                />
                <ReferenceLine y={0} stroke="#4b5563" strokeWidth={1} strokeDasharray="4 2" />
                <Tooltip content={<NIIPTooltip />} />
                {Object.entries(NIIP_COLORS).map(([key, color]) => (
                  visibleCountries[key] !== false && (
                    <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} fill={`url(#cap-grad-${key})`} />
                  )
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SVG Asset-Liability Flow Graphic */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-brand-blue" />
          <span>Sovereign Money Flow Trail: Creditor Assets vs Debtor Liabilities</span>
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          Visualizes how surplus cash exporter nations (Net Creditors) invest their trade surpluses abroad. One country's international asset (held by SWFs or foreign reserves) acts directly as another country's foreign liability (debt or bank deposit).
        </p>

        <div className="w-full flex justify-center py-4 bg-gray-950/20 rounded-xl p-4 border border-gray-900">
          <svg className="w-full max-w-[800px] h-[310px]" viewBox="0 0 800 310">
            {/* Smooth connecting flows representing assets moving to buy debtor liabilities */}
            {/* Japan -> US Liabilities */}
            <path d="M 190 58 C 330 58, 470 48, 610 48" fill="none" stroke="rgba(0, 230, 118, 0.12)" strokeWidth="30" />
            {/* China -> US Liabilities */}
            <path d="M 190 158 C 330 158, 470 68, 610 68" fill="none" stroke="rgba(0, 230, 118, 0.20)" strokeWidth="24" />
            {/* Gulf Nations -> US Liabilities */}
            <path d="M 190 258 C 330 258, 470 88, 610 88" fill="none" stroke="rgba(0, 230, 118, 0.15)" strokeWidth="18" />

            {/* Gulf Nations -> India Liabilities */}
            <path d="M 190 258 C 330 258, 470 230, 610 230" fill="none" stroke="rgba(171, 71, 188, 0.10)" strokeWidth="10" />
            {/* Japan -> India Liabilities */}
            <path d="M 190 58 C 330 58, 470 210, 610 210" fill="none" stroke="rgba(41, 182, 246, 0.08)" strokeWidth="8" />

            {/* LEFT: Creditor Blocks (Exporters) */}
            <g transform="translate(10, 20)">
              <rect x="0" y="0" width="180" height="75" rx="6" fill="#064e3b" stroke="#059669" strokeWidth="1.5" />
              <text x="90" y="20" fill="#ecfdf5" textAnchor="middle" style={{ fontSize: 11, fontFamily: 'sans-serif', fontWeight: 'bold' }}>JAPAN (Creditor)</text>
              <text x="15" y="38" fill="#a7f3d0" style={{ fontSize: 9, fontFamily: 'monospace' }}>Gross Assets: {formatTrillion(jp.gross_assets)}</text>
              <text x="15" y="52" fill="#a7f3d0" style={{ fontSize: 9, fontFamily: 'monospace' }}>Gross Liabs: {formatTrillion(jp.gross_liabilities)}</text>
              <text x="15" y="66" fill="#34d399" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>Net NIIP: {formatNIIP(jp.niip)}</text>
            </g>

            <g transform="translate(10, 120)">
              <rect x="0" y="0" width="180" height="75" rx="6" fill="#064e3b" stroke="#059669" strokeWidth="1.5" />
              <text x="90" y="20" fill="#ecfdf5" textAnchor="middle" style={{ fontSize: 11, fontFamily: 'sans-serif', fontWeight: 'bold' }}>CHINA (Creditor)</text>
              <text x="15" y="38" fill="#a7f3d0" style={{ fontSize: 9, fontFamily: 'monospace' }}>Gross Assets: {formatTrillion(cn.gross_assets)}</text>
              <text x="15" y="52" fill="#a7f3d0" style={{ fontSize: 9, fontFamily: 'monospace' }}>Gross Liabs: {formatTrillion(cn.gross_liabilities)}</text>
              <text x="15" y="66" fill="#34d399" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>Net NIIP: {formatNIIP(cn.niip)}</text>
            </g>

            <g transform="translate(10, 220)">
              <rect x="0" y="0" width="180" height="75" rx="6" fill="#064e3b" stroke="#059669" strokeWidth="1.5" />
              <text x="90" y="20" fill="#ecfdf5" textAnchor="middle" style={{ fontSize: 11, fontFamily: 'sans-serif', fontWeight: 'bold' }}>GULF SWFS (GCC)</text>
              <text x="15" y="38" fill="#a7f3d0" style={{ fontSize: 9, fontFamily: 'monospace' }}>Gross Assets: {formatTrillion(gcc.gross_assets)}</text>
              <text x="15" y="52" fill="#a7f3d0" style={{ fontSize: 9, fontFamily: 'monospace' }}>Gross Liabs: {formatTrillion(gcc.gross_liabilities)}</text>
              <text x="15" y="66" fill="#34d399" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>Net NIIP: {formatNIIP(gcc.niip)}</text>
            </g>

            {/* RIGHT: Debtor Blocks (Liabilities / Consumers) */}
            <g transform="translate(610, 30)">
              <rect x="0" y="0" width="180" height="95" rx="6" fill="#450a0a" stroke="#b91c1c" strokeWidth="1.5" />
              <text x="90" y="20" fill="#fef2f2" textAnchor="middle" style={{ fontSize: 11, fontFamily: 'sans-serif', fontWeight: 'bold' }}>UNITED STATES (Debtor)</text>
              <text x="15" y="38" fill="#fca5a5" style={{ fontSize: 9, fontFamily: 'monospace' }}>Assets Abroad: {formatTrillion(us.gross_assets)}</text>
              <text x="15" y="52" fill="#fca5a5" style={{ fontSize: 9, fontFamily: 'monospace' }}>Liabs to Foreigners: {formatTrillion(us.gross_liabilities)}</text>
              <text x="15" y="68" fill="#fee2e2" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>Net NIIP: {formatNIIP(us.niip)}</text>
              <text x="15" y="84" fill="#fecaca" style={{ fontSize: 9, fontFamily: 'monospace' }}>Fed Gov Debt: {formatTrillion(us.gross_federal_debt)}</text>
            </g>

            <g transform="translate(610, 190)">
              <rect x="0" y="0" width="180" height="75" rx="6" fill="#1e1b4b" stroke="#4338ca" strokeWidth="1.5" />
              <text x="90" y="20" fill="#e0e7ff" textAnchor="middle" style={{ fontSize: 11, fontFamily: 'sans-serif', fontWeight: 'bold' }}>INDIA (Debtor)</text>
              <text x="15" y="38" fill="#c7d2fe" style={{ fontSize: 9, fontFamily: 'monospace' }}>Gross Assets: {formatTrillion(ind.gross_assets)}</text>
              <text x="15" y="52" fill="#c7d2fe" style={{ fontSize: 9, fontFamily: 'monospace' }}>Gross Liabs: {formatTrillion(ind.gross_liabilities)}</text>
              <text x="15" y="66" fill="#818cf8" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>Net NIIP: {formatNIIP(ind.niip)}</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Current Account vs Capital Account Flow Grid */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-green" />
          <span>Balance of Payments (BOP) Accounting Balance Sheet</span>
        </h3>
        <p className="text-xs text-gray-500">
          Under macro-financial rules, a Current Account (trade surplus/deficit) must be perfectly balanced by the Capital & Financial Account (buying/selling assets). Surplus exporters sell goods and import assets (FA deficit), while deficit countries buy goods and export assets/debt (FA surplus).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-4">
          {data.current_account_flows.map((flow: any) => (
            <div key={flow.country} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col justify-between font-mono text-xs">
              <div>
                <span className="font-semibold text-white block text-sm">{flow.country}</span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">{flow.net_status}</span>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Account (CA):</span>
                  <span className={flow.current_account >= 0 ? "text-brand-green font-bold" : "text-brand-red font-bold"}>
                    {flow.current_account > 0 ? "+" : ""}{flow.current_account}B
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Capital Account (FA):</span>
                  <span className={flow.capital_account >= 0 ? "text-brand-green font-bold" : "text-brand-red font-bold"}>
                    {flow.capital_account > 0 ? "+" : ""}{flow.capital_account}B
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden flex">
                <div 
                  className="bg-brand-red h-full" 
                  style={{ width: `${flow.current_account < 0 ? Math.min(100, Math.abs(flow.current_account)/10) : 0}%` }}
                ></div>
                <div 
                  className="bg-brand-green h-full" 
                  style={{ width: `${flow.current_account > 0 ? Math.min(100, flow.current_account/5) : 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Balance Sheet & Debt Matrix Table */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md">
          <h3 className="text-md font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-brand-green" />
            <span>Sovereign Balance Sheets & Debt Metrics</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-gray-800 text-gray-500 uppercase">
                <tr>
                  <th className="py-2.5">Country / Region</th>
                  <th>Creditor Status</th>
                  <th>Gross Assets</th>
                  <th>Gross Liabs</th>
                  <th>Net NIIP</th>
                  <th>NIIP (% GDP)</th>
                  <th>Gov Debt</th>
                  <th>Key Holdings (Assets / Liabs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {data.debt_matrix.map((row: any) => (
                  <tr key={row.country} className="hover:bg-gray-900/30">
                    <td className="py-3 font-semibold text-white">{row.country}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        row.status.includes("Creditor") ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="text-brand-green font-semibold">{formatTrillion(row.gross_assets)}</td>
                    <td className="text-brand-red font-semibold">{formatTrillion(row.gross_liabilities)}</td>
                    <td className={row.niip >= 0 ? "text-brand-green font-bold" : "text-brand-red font-bold"}>
                      {formatNIIP(row.niip)}
                    </td>
                    <td className={row.niip_pct_gdp >= 0 ? "text-brand-green font-semibold" : "text-brand-red font-semibold"}>
                      {row.niip_pct_gdp >= 0 ? "+" : ""}{row.niip_pct_gdp}%
                    </td>
                    <td className="text-white">
                      {row.gross_federal_debt ? formatTrillion(row.gross_federal_debt) : `Int: ${row.internal_debt}% / Ext: ${row.external_debt}%`}
                    </td>
                    <td className="text-gray-400 max-w-[320px] truncate" title={row.assets_held}>
                      {row.assets_held}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Predictive Money Flow Matrix */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-yellow" />
            <span>Predictive Money Flow Matrix (Expected Asset Class Rises)</span>
          </h3>
          <p className="text-xs text-gray-500">
            Rules framework linking current account balances, currency directions, and carry spreads to forecasted asset trends.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-gray-800 text-gray-500 uppercase">
                <tr>
                  <th className="py-2.5">Macro Trigger Condition</th>
                  <th>Expected Liquidity Flow Direction</th>
                  <th>Asset Class Beneficiaries</th>
                  <th className="text-right">Signal Success Probability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {data.predictive_rules.map((rule: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-900/30">
                    <td className="py-3 font-semibold text-brand-yellow max-w-[280px] leading-relaxed">
                      {rule.trigger}
                    </td>
                    <td className="text-gray-350 max-w-[280px] leading-relaxed">{rule.expected_flow}</td>
                    <td className="text-white font-bold">{rule.asset_rise}</td>
                    <td className="text-right font-bold text-brand-green">{rule.probability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
