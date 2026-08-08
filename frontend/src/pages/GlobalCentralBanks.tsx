import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Landmark, TrendingUp, TrendingDown, Activity } from "lucide-react";

export default function GlobalCentralBanks() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/central-banks")
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  const hero = data.hero_metrics || {};
  const cbCards = data.central_banks || [];
  const bsHistory = data.balance_sheet_history || [];
  const m2History = data.m2_history || [];
  const fedComponents = data.fed_liquidity_components || [];

  const CB_COLORS: Record<string, string> = {
    Fed: "#29b6f6",
    ECB: "#ffa726",
    BoJ: "#ff1744",
    PBoC: "#ff7043",
    BoE: "#ab47bc",
    RBI: "#26a69a",
    SNB: "#f06292",
    RBA: "#66bb6a",
  };

  const CB_FLAGS: Record<string, string> = {
    Fed: "🇺🇸",
    ECB: "🇪🇺",
    BoJ: "🇯🇵",
    PBoC: "🇨🇳",
    BoE: "🇬🇧",
    RBI: "🇮🇳",
    SNB: "🇨🇭",
    RBA: "🇦🇺",
  };

  const M2_COLORS: Record<string, string> = {
    US: "#29b6f6",
    China: "#ff1744",
    EU: "#ffa726",
    Japan: "#f06292",
    India: "#26a69a",
    UK: "#ab47bc",
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left max-w-[220px]">
          <p className="text-gray-400 font-semibold mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.dataKey}</span>
              <span className="text-white font-semibold">
                ${(entry.value || 0).toFixed(2)}T
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const M2Tooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left max-w-[220px]">
          <p className="text-gray-400 font-semibold mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.dataKey}</span>
              <span className="text-white font-semibold">
                ${(entry.value || 0).toFixed(1)}T
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const FedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left max-w-[220px]">
          <p className="text-gray-400 font-semibold mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="text-white font-semibold">
                ${(entry.value || 0).toFixed(2)}T
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            <Landmark className="w-6 h-6 text-brand-blue" />
            Global Central Bank Monitor
          </h2>
          <p className="text-sm text-gray-500">
            Track central bank balance sheets, QE/QT regimes, global M2 aggregates, and Fed net liquidity in real-time.
          </p>
        </div>
      </div>

      {/* Section 1: Hero KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 shadow-md">
          <span className="text-[10px] text-gray-500 uppercase font-mono block">
            Global CB Aggregate
          </span>
          <span className="text-2xl font-bold text-white block mt-1 font-mono">
            ${hero.global_cb_aggregate_usd_t?.toFixed(1) || "—"}T
          </span>
          <span
            className={`text-xs font-mono mt-1 block ${
              (hero.global_cb_3m_change || 0) >= 0
                ? "text-brand-green"
                : "text-brand-red"
            }`}
          >
            {(hero.global_cb_3m_change || 0) >= 0 ? "▲" : "▼"}{" "}
            {hero.global_cb_3m_change > 0 ? "+" : ""}
            {hero.global_cb_3m_change?.toFixed(1) || "0"}% (3M)
          </span>
        </div>

        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 shadow-md">
          <span className="text-[10px] text-gray-500 uppercase font-mono block">
            Fed Net Liquidity
          </span>
          <span className="text-2xl font-bold text-brand-blue block mt-1 font-mono">
            ${hero.fed_net_liquidity_usd_t?.toFixed(2) || "—"}T
          </span>
          <span
            className={`text-xs font-mono mt-1 block ${
              (hero.fed_net_liq_3m_change || 0) >= 0
                ? "text-brand-green"
                : "text-brand-red"
            }`}
          >
            {(hero.fed_net_liq_3m_change || 0) >= 0 ? "▲" : "▼"}{" "}
            {hero.fed_net_liq_3m_change > 0 ? "+" : ""}
            {hero.fed_net_liq_3m_change?.toFixed(1) || "0"}% (3M)
          </span>
        </div>

        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 shadow-md">
          <span className="text-[10px] text-gray-500 uppercase font-mono block">
            Global M2 Aggregate
          </span>
          <span className="text-2xl font-bold text-white block mt-1 font-mono">
            ${hero.global_m2_aggregate_usd_t?.toFixed(1) || "—"}T
          </span>
          <span
            className={`text-xs font-mono mt-1 block ${
              (hero.global_m2_yoy_change || 0) >= 0
                ? "text-brand-green"
                : "text-brand-red"
            }`}
          >
            {(hero.global_m2_yoy_change || 0) >= 0 ? "▲" : "▼"}{" "}
            {hero.global_m2_yoy_change > 0 ? "+" : ""}
            {hero.global_m2_yoy_change?.toFixed(1) || "0"}% (YoY)
          </span>
        </div>

        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 shadow-md">
          <span className="text-[10px] text-gray-500 uppercase font-mono block">
            QE / QT Regime
          </span>
          <span
            className={`text-2xl font-bold block mt-1 font-mono ${
              hero.qe_qt_regime === "QE"
                ? "text-brand-green"
                : hero.qe_qt_regime === "QT"
                ? "text-brand-red"
                : "text-brand-yellow"
            }`}
          >
            {hero.qe_qt_regime || "Mixed"}
          </span>
          <span className="text-xs font-mono mt-1 block text-gray-400">
            {hero.qe_qt_detail || "Net QT dominant globally"}
          </span>
        </div>
      </div>

      {/* Section 2: Central Bank Balance Sheet Stacked Area Chart */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-blue" />
          <span>Central Bank Balance Sheets (USD Trillions) — Stacked</span>
        </h3>
        <p className="text-xs text-gray-500">
          Aggregate balance sheet assets for each of the 8 major central banks,
          stacked to show the evolution of global central bank liquidity (2020–2026).
        </p>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={bsHistory}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {Object.entries(CB_COLORS).map(([key, color]) => (
                  <linearGradient
                    key={key}
                    id={`grad-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2e303a"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(v: number) => `$${v}T`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
              />
              {Object.entries(CB_COLORS).map(([key, color]) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 3: Individual Central Bank Cards Grid (2x4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cbCards.map((cb: any) => {
          const flag = CB_FLAGS[cb.name] || "🏦";
          const color = CB_COLORS[cb.name] || "#6b7280";
          const isQE = cb.qe_qt_status === "QE";
          const sparkData = cb.sparkline || [];

          return (
            <div
              key={cb.name}
              className="bg-bg-card border border-gray-800 rounded-xl p-4 shadow-md space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{flag}</span>
                  <span className="text-sm font-heading font-semibold text-white">
                    {cb.name}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    isQE
                      ? "bg-brand-green/10 text-brand-green"
                      : "bg-brand-red/10 text-brand-red"
                  }`}
                >
                  {cb.qe_qt_status}
                </span>
              </div>

              <div className="font-mono text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Local Ccy:</span>
                  <span className="text-white font-semibold">
                    {cb.total_assets_local || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">USD Equiv:</span>
                  <span className="text-white font-semibold">
                    ${cb.total_assets_usd_t?.toFixed(2) || "—"}T
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">3M Change:</span>
                  <span
                    className={`font-semibold ${
                      (cb.change_3m_pct || 0) >= 0
                        ? "text-brand-green"
                        : "text-brand-red"
                    }`}
                  >
                    {(cb.change_3m_pct || 0) >= 0 ? "+" : ""}
                    {cb.change_3m_pct?.toFixed(1) || "0"}%
                  </span>
                </div>
              </div>

              {/* Mini Sparkline */}
              {sparkData.length > 0 && (
                <div className="h-[40px]">
                  <ResponsiveContainer width="100%" height={40}>
                    <AreaChart data={sparkData}>
                      <defs>
                        <linearGradient
                          id={`spark-${cb.name}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={color}
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor={color}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={1.5}
                        fill={`url(#spark-${cb.name})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Section 4: Global M2 Multi-Line Chart */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-green" />
          <span>Global M2 Money Supply (USD Equivalent)</span>
        </h3>
        <p className="text-xs text-gray-500">
          M2 monetary aggregates for major economies converted to USD. Rising M2
          is a leading indicator for risk asset performance.
        </p>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={m2History}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2e303a"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(v: number) => `$${v}T`}
              />
              <Tooltip content={<M2Tooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
              />
              {Object.entries(M2_COLORS).map(([key, color]) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 5: Fed Net Liquidity Components */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-brand-red" />
          <span>Fed Net Liquidity = WALCL − TGA − RRP</span>
        </h3>
        <p className="text-xs text-gray-500">
          Net Fed liquidity is the effective cash available in the banking
          system. The Treasury General Account (TGA) and Reverse Repo (RRP)
          drain liquidity from reserves.
        </p>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart
              data={fedComponents}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="gradWALCL"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#29b6f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#29b6f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradTGA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff1744" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff1744" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradRRP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffa726" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ffa726" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradNetLiq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e676" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2e303a"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 10, fontFamily: "monospace" }}
                tickFormatter={(v: number) => `$${v}T`}
              />
              <Tooltip content={<FedTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
              />
              <Area
                type="monotone"
                dataKey="WALCL"
                name="Fed Balance Sheet (WALCL)"
                stroke="#29b6f6"
                strokeWidth={2}
                fill="url(#gradWALCL)"
              />
              <Area
                type="monotone"
                dataKey="TGA"
                name="Treasury General (TGA)"
                stroke="#ff1744"
                strokeWidth={1.5}
                fill="url(#gradTGA)"
              />
              <Area
                type="monotone"
                dataKey="RRP"
                name="Reverse Repo (RRP)"
                stroke="#ffa726"
                strokeWidth={1.5}
                fill="url(#gradRRP)"
              />
              <Area
                type="monotone"
                dataKey="NetLiquidity"
                name="Net Liquidity"
                stroke="#00e676"
                strokeWidth={2.5}
                fill="url(#gradNetLiq)"
                strokeDasharray="6 3"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Regime Indicator */}
        <div className="grid grid-cols-3 gap-3 border-t border-gray-800/80 pt-4 text-center text-[10px] font-mono text-gray-400">
          <div className="p-2 rounded bg-brand-blue/10 border border-brand-blue/20">
            <span className="text-brand-blue font-semibold block">WALCL</span>
            <span className="text-white text-sm font-bold block mt-0.5">
              ${hero.walcl_usd_t?.toFixed(2) || "—"}T
            </span>
          </div>
          <div className="p-2 rounded bg-brand-red/10 border border-brand-red/20">
            <span className="text-brand-red font-semibold block">TGA (Drain)</span>
            <span className="text-white text-sm font-bold block mt-0.5">
              ${hero.tga_usd_t?.toFixed(2) || "—"}T
            </span>
          </div>
          <div className="p-2 rounded bg-brand-yellow/10 border border-brand-yellow/20">
            <span className="text-brand-yellow font-semibold block">RRP (Drain)</span>
            <span className="text-white text-sm font-bold block mt-0.5">
              ${hero.rrp_usd_t?.toFixed(2) || "—"}T
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
