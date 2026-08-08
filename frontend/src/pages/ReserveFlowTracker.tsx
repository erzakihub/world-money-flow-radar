import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Shield, Globe, TrendingUp, TrendingDown, Coins } from "lucide-react";

export default function ReserveFlowTracker() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Yen Carry Trade Simulator State
  const [jpyBorrowAmount, setJpyBorrowAmount] = useState<number>(10000000); // 10M ¥ default
  const [jpyBorrowRate, setJpyBorrowRate] = useState<number>(0.25); // BoJ rate (%)
  const [usdInvestRate, setUsdInvestRate] = useState<number>(4.75); // US Treasury rate (%)
  const [usdjpySpot, setUsdjpySpot] = useState<number>(158.0); // Current spot
  const [expectedUsdjpyYear, setExpectedUsdjpyYear] = useState<number>(155.0); // Target exchange rate

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/reserve-flows")
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

  const overview = data.overview || {};
  const topHolders = data.top_reserve_holders || [];
  const fxHistory = data.fx_reserves_history || [];
  const coferPie = data.cofer_composition || [];
  const coferTrend = data.cofer_trend || [];
  const goldReserves = data.gold_reserves || [];
  const goldAccumulation = data.gold_accumulation || [];
  const ticHistory = data.tic_history || [];
  const swfData = data.sovereign_wealth_funds || [];
  const swfChart = data.swf_chart || [];

  const HOLDER_FLAGS: Record<string, string> = {
    China: "🇨🇳",
    Japan: "🇯🇵",
    India: "🇮🇳",
    "Saudi Arabia": "🇸🇦",
    Korea: "🇰🇷",
    "South Korea": "🇰🇷",
    Switzerland: "🇨🇭",
    Russia: "🇷🇺",
    Taiwan: "🇹🇼",
  };

  const FX_COLORS: Record<string, string> = {
    China: "#ff1744",
    Japan: "#f06292",
    India: "#26a69a",
    "Saudi Arabia": "#ffa726",
    Korea: "#29b6f6",
    "South Korea": "#29b6f6",
  };

  const COFER_COLORS = [
    "#29b6f6",
    "#ffa726",
    "#ff1744",
    "#f06292",
    "#ffd700",
    "#6b7280",
  ];

  const SWF_COLORS = ["#29b6f6", "#ffa726", "#00e676", "#ab47bc", "#ff1744"];

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left max-w-[240px]">
          <p className="text-gray-400 font-semibold mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.dataKey}</span>
              <span className="text-white font-semibold">
                ${(entry.value || 0).toFixed(0)}B
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const TICTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left max-w-[240px]">
          <p className="text-gray-400 font-semibold mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name || entry.dataKey}</span>
              <span className="text-white font-semibold">
                ${(entry.value || 0).toFixed(0)}B
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CoferPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left">
          <p className="text-white font-semibold">{d.name}</p>
          <p className="text-gray-400 mt-0.5">{d.value?.toFixed(1)}%</p>
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
            <Shield className="w-6 h-6 text-brand-green" />
            Reserve Flow Tracker
          </h2>
          <p className="text-sm text-gray-500">
            Monitor FX reserves, gold accumulation, COFER composition, TIC
            foreign holdings, and sovereign wealth fund flows.
          </p>
        </div>
      </div>

      {/* Section 1: FX Reserve Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5 shadow-md lg:col-span-1">
          <span className="text-[10px] text-gray-500 uppercase font-mono block">
            Total Global FX Reserves
          </span>
          <span className="text-2xl font-bold text-white block mt-1 font-mono">
            ${overview.total_global_fx_reserves_t?.toFixed(1) || "—"}T
          </span>
          <span className="text-xs font-mono mt-1 block text-gray-400">
            {overview.total_countries || "—"} economies tracked
          </span>
        </div>

        {topHolders.map((holder: any) => {
          const flag = HOLDER_FLAGS[holder.country] || "🌐";
          return (
            <div
              key={holder.country}
              className="bg-bg-card border border-gray-800 rounded-xl p-4 shadow-md"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{flag}</span>
                <span className="text-xs text-gray-400 font-mono">
                  {holder.country}
                </span>
              </div>
              <span className="text-lg font-bold text-white block mt-1 font-mono">
                ${holder.reserves_b?.toFixed(0) || "—"}B
              </span>
              <span
                className={`text-[10px] font-mono block mt-0.5 ${
                  (holder.change_1y_pct || 0) >= 0
                    ? "text-brand-green"
                    : "text-brand-red"
                }`}
              >
                {(holder.change_1y_pct || 0) >= 0 ? "▲" : "▼"}{" "}
                {holder.change_1y_pct > 0 ? "+" : ""}
                {holder.change_1y_pct?.toFixed(1) || "0"}% (1Y)
              </span>
            </div>
          );
        })}
      </div>

      {/* Section 2: FX Reserves Multi-Line Chart */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-blue" />
          <span>Foreign Exchange Reserves Over Time (USD Billions)</span>
        </h3>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={fxHistory}
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
                tickFormatter={(v: number) => `$${v}B`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
              />
              {Object.entries(FX_COLORS).map(([key, color]) => (
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

      {/* Section 3: COFER Currency Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">
            COFER: Reserve Currency Composition
          </h3>
          <p className="text-xs text-gray-500">
            IMF COFER data showing share of allocated global FX reserves by
            currency. USD share is declining while CNY and Gold are rising.
          </p>
          <div className="h-[280px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={coferPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={2}
                  label={({ name, value }: any) =>
                    `${name}: ${value?.toFixed(1)}%`
                  }
                  labelLine={false}
                >
                  {coferPie.map((_: any, idx: number) => (
                    <Cell
                      key={idx}
                      fill={COFER_COLORS[idx % COFER_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CoferPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">
            COFER Historical Trend
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-gray-800 text-gray-500 uppercase">
                <tr>
                  <th className="py-2.5">Year</th>
                  <th>USD %</th>
                  <th>EUR %</th>
                  <th>CNY %</th>
                  <th>JPY %</th>
                  <th>Gold %</th>
                  <th>Other %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {coferTrend.map((row: any) => (
                  <tr key={row.year} className="hover:bg-gray-900/30">
                    <td className="py-2.5 font-semibold text-white">
                      {row.year}
                    </td>
                    <td className="text-brand-blue font-semibold">
                      {row.usd?.toFixed(1)}%
                    </td>
                    <td>{row.eur?.toFixed(1)}%</td>
                    <td className="text-brand-red font-semibold">
                      {row.cny?.toFixed(1)}%
                    </td>
                    <td>{row.jpy?.toFixed(1)}%</td>
                    <td className="text-brand-yellow font-semibold">
                      {row.gold?.toFixed(1)}%
                    </td>
                    <td>{row.other?.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 4: Gold Reserve Accumulation */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <Coins className="w-4 h-4 text-brand-yellow" />
          <span>Gold Reserve Accumulation by Country (Tonnes)</span>
        </h3>
        <p className="text-xs text-gray-500">
          Central banks have been net gold buyers since 2010. China, India,
          Poland, and Turkey are leading accumulation.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={goldReserves}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2e303a"
                  vertical={false}
                />
                <XAxis
                  dataKey="country"
                  stroke="#6b7280"
                  tickLine={false}
                  style={{ fontSize: 10, fontFamily: "monospace" }}
                />
                <YAxis
                  stroke="#6b7280"
                  tickLine={false}
                  style={{ fontSize: 10, fontFamily: "monospace" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#151720",
                    border: "1px solid #2e303a",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                />
                <Bar dataKey="tonnes" fill="#ffd700" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-gray-800 text-gray-500 uppercase">
                <tr>
                  <th className="py-2.5">Country</th>
                  <th>Total (t)</th>
                  <th>Monthly Pace (t/mo)</th>
                  <th>YoY Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {goldAccumulation.map((row: any) => (
                  <tr key={row.country} className="hover:bg-gray-900/30">
                    <td className="py-2.5 font-semibold text-white">
                      {HOLDER_FLAGS[row.country] || "🌐"} {row.country}
                    </td>
                    <td className="text-brand-yellow font-semibold">
                      {row.total_tonnes?.toLocaleString() || "—"}
                    </td>
                    <td>{row.monthly_pace?.toFixed(1) || "—"}</td>
                    <td
                      className={
                        (row.yoy_change_pct || 0) >= 0
                          ? "text-brand-green font-semibold"
                          : "text-brand-red font-semibold"
                      }
                    >
                      {(row.yoy_change_pct || 0) >= 0 ? "+" : ""}
                      {row.yoy_change_pct?.toFixed(1) || "0"}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 5: TIC Foreign Holdings of US Treasuries */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-brand-red" />
          <span>TIC Data: Foreign Holdings of US Treasuries (USD Billions)</span>
        </h3>
        <p className="text-xs text-gray-500">
          US Treasury International Capital (TIC) data showing Japan and China
          steadily reducing UST holdings. This structural decline in foreign
          demand for Treasuries forces the Fed to backstop more.
        </p>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={ticHistory}
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
                tickFormatter={(v: number) => `$${v}B`}
              />
              <Tooltip content={<TICTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
              />
              <Line
                type="monotone"
                dataKey="Japan"
                name="Japan UST Holdings"
                stroke="#f06292"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="China"
                name="China UST Holdings"
                stroke="#ff1744"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Total"
                name="Total Foreign Holdings"
                stroke="#6b7280"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Narrative Panel */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 text-xs font-mono text-gray-400 leading-relaxed space-y-1 mt-4">
          <p className="text-brand-yellow font-semibold">
            ⚠ IMPLICATIONS OF UST SELLING
          </p>
          <p>
            Declining foreign demand for US Treasuries means higher yields,
            larger deficits, and increased Fed monetization risk. Japan's
            position is driven by BoJ policy divergence; China's by geopolitical
            de-risking. Both trends are structural and unlikely to reverse.
          </p>
        </div>
      </div>

      {/* Yen Carry Trade Arbitrage Simulator */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-800/80 pb-4 gap-2">
          <div>
            <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-blue" />
              <span>Yen Carry Trade Funding & Arbitrage Simulator</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-sans">
              Model cross-border carry trades: borrow Yen at low interest rates, convert to USD assets, and calculate profits vs exchange rate appreciation risk.
            </p>
          </div>
          <div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
              ((expectedUsdjpyYear - ((jpyBorrowAmount + (jpyBorrowAmount * (jpyBorrowRate / 100))) / (jpyBorrowAmount / usdjpySpot + (jpyBorrowAmount / usdjpySpot) * (usdInvestRate / 100)))) / expectedUsdjpyYear * 100) < 1.0
                ? "text-brand-red bg-brand-red/10 border-brand-red/20 animate-pulse font-bold"
                : ((expectedUsdjpyYear - ((jpyBorrowAmount + (jpyBorrowAmount * (jpyBorrowRate / 100))) / (jpyBorrowAmount / usdjpySpot + (jpyBorrowAmount / usdjpySpot) * (usdInvestRate / 100)))) / expectedUsdjpyYear * 100) < 3.0
                ? "text-brand-red bg-brand-red/10 border-brand-red/20 font-bold"
                : ((expectedUsdjpyYear - ((jpyBorrowAmount + (jpyBorrowAmount * (jpyBorrowRate / 100))) / (jpyBorrowAmount / usdjpySpot + (jpyBorrowAmount / usdjpySpot) * (usdInvestRate / 100)))) / expectedUsdjpyYear * 100) < 6.0
                ? "text-brand-yellow bg-brand-yellow/10 border-brand-yellow/20 font-bold"
                : "text-brand-green bg-brand-green/10 border-brand-green/20 font-bold"
            }`}>
              Risk: {
                ((expectedUsdjpyYear - ((jpyBorrowAmount + (jpyBorrowAmount * (jpyBorrowRate / 100))) / (jpyBorrowAmount / usdjpySpot + (jpyBorrowAmount / usdjpySpot) * (usdInvestRate / 100)))) / expectedUsdjpyYear * 100) < 1.0
                  ? "CRITICAL UNWINDING RISK"
                  : ((expectedUsdjpyYear - ((jpyBorrowAmount + (jpyBorrowAmount * (jpyBorrowRate / 100))) / (jpyBorrowAmount / usdjpySpot + (jpyBorrowAmount / usdjpySpot) * (usdInvestRate / 100)))) / expectedUsdjpyYear * 100) < 3.0
                  ? "High Unwinding Risk"
                  : ((expectedUsdjpyYear - ((jpyBorrowAmount + (jpyBorrowAmount * (jpyBorrowRate / 100))) / (jpyBorrowAmount / usdjpySpot + (jpyBorrowAmount / usdjpySpot) * (usdInvestRate / 100)))) / expectedUsdjpyYear * 100) < 6.0
                  ? "Moderate Risk"
                  : "Low Risk"
              }
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs Section */}
          <div className="space-y-4 font-mono text-xs">
            {/* JPY Borrow Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">JPY Borrowing Principal:</span>
                <span className="text-white font-semibold">¥{jpyBorrowAmount.toLocaleString()} JPY</span>
              </div>
              <input
                type="range"
                min="1000000"
                max="100000000"
                step="1000000"
                value={jpyBorrowAmount}
                onChange={(e) => setJpyBorrowAmount(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>¥1M</span>
                <span>¥100M</span>
              </div>
            </div>

            {/* Interest Rates Row */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">JPY Borrow Rate (BoJ):</span>
                  <span className="text-brand-red font-semibold">{jpyBorrowRate.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.05"
                  value={jpyBorrowRate}
                  onChange={(e) => setJpyBorrowRate(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-red"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">USD Investment Yield:</span>
                  <span className="text-brand-green font-semibold">{usdInvestRate.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.05"
                  value={usdInvestRate}
                  onChange={(e) => setUsdInvestRate(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-green"
                />
              </div>
            </div>

            {/* Exchange Rates Row */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">USD/JPY Entry Spot:</span>
                  <span className="text-brand-blue font-semibold">{usdjpySpot.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="180"
                  step="0.5"
                  value={usdjpySpot}
                  onChange={(e) => setUsdjpySpot(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Expected Spot (1 Year):</span>
                  <span className="text-brand-yellow font-semibold">{expectedUsdjpyYear.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="180"
                  step="0.5"
                  value={expectedUsdjpyYear}
                  onChange={(e) => setExpectedUsdjpyYear(Number(e.target.value))}
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-yellow"
                />
              </div>
            </div>
          </div>

          {/* Outputs Section */}
          <div className="bg-gray-900/30 rounded-xl p-5 border border-gray-800/85 flex flex-col justify-between space-y-4">
            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-500 block uppercase">Funding Cost (JPY)</span>
                <span className="text-brand-red font-bold text-sm">¥{Math.round(jpyBorrowAmount * (jpyBorrowRate / 100)).toLocaleString()}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-500 block uppercase">Asset Principal (USD)</span>
                <span className="text-white font-bold text-sm">${Math.round(jpyBorrowAmount / usdjpySpot).toLocaleString()}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-500 block uppercase">Interest Yield (USD)</span>
                <span className="text-brand-green font-bold text-sm">${Math.round((jpyBorrowAmount / usdjpySpot) * (usdInvestRate / 100)).toLocaleString()}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-500 block uppercase">Break-Even Spot</span>
                <span className="text-white font-bold text-sm">
                  {((jpyBorrowAmount + (jpyBorrowAmount * (jpyBorrowRate / 100))) / (jpyBorrowAmount / usdjpySpot + (jpyBorrowAmount / usdjpySpot) * (usdInvestRate / 100))).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Profit Card */}
            {(() => {
              const jpyCost = jpyBorrowAmount * (jpyBorrowRate / 100);
              const usdPrincipal = jpyBorrowAmount / usdjpySpot;
              const usdEarned = usdPrincipal * (usdInvestRate / 100);
              const totalUsdAfterYear = usdPrincipal + usdEarned;
              const repatriatedJpy = totalUsdAfterYear * expectedUsdjpyYear;
              const netProfitJpy = repatriatedJpy - jpyBorrowAmount - jpyCost;
              const netProfitUsd = netProfitJpy / expectedUsdjpyYear;
              const rocPct = (netProfitJpy / jpyBorrowAmount) * 100;
              const breakEvenSpot = (jpyBorrowAmount + jpyCost) / totalUsdAfterYear;

              return (
                <>
                  <div className="bg-gray-950/40 rounded-lg p-4 border border-gray-900 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono block uppercase">Net Profit / Loss (1Y)</span>
                      <span className={`text-xl font-bold font-mono ${netProfitJpy >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                        {netProfitJpy >= 0 ? "+" : ""}¥{Math.round(netProfitJpy).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                        ({netProfitUsd >= 0 ? "+" : ""}${Math.round(netProfitUsd).toLocaleString()} USD)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 font-mono block uppercase">Return on Capital</span>
                      <span className={`text-lg font-bold font-mono ${rocPct >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                        {rocPct >= 0 ? "+" : ""}{rocPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Break-Even Visual Meter */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-gray-500">Break-Even ({breakEvenSpot.toFixed(1)})</span>
                      <span className="text-brand-yellow font-semibold">Expected Spot ({expectedUsdjpyYear.toFixed(1)})</span>
                      <span className="text-gray-500">Entry Spot ({usdjpySpot.toFixed(1)})</span>
                    </div>
                    
                    <div className="w-full bg-gray-800 h-2 rounded-full relative overflow-hidden flex">
                      <div 
                        className={`h-full ${netProfitJpy >= 0 ? "bg-brand-green" : "bg-brand-red"}`}
                        style={{ width: `${Math.max(5, Math.min(100, Math.abs((expectedUsdjpyYear - breakEvenSpot) / (usdjpySpot - breakEvenSpot)) * 100))}%` }}
                      ></div>
                    </div>
                    
                    <p className="text-[10px] font-mono text-gray-400 leading-relaxed">
                      {netProfitJpy >= 0 ? (
                        <span>
                          Carry trade is profitable. The Yen can appreciate by up to{" "}
                          <strong className="text-brand-yellow">{(expectedUsdjpyYear - breakEvenSpot).toFixed(1)} JPY ({((expectedUsdjpyYear - breakEvenSpot)/expectedUsdjpyYear*100).toFixed(1)}%)</strong> before reaching the break-even exchange rate.
                        </span>
                      ) : (
                        <span>
                          Carry trade is unprofitable. Expected JPY appreciation has wiped out the interest rate differential.
                        </span>
                      )}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-purple" />
          <span>Sovereign Wealth Fund (SWF) Monitor</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-gray-800 text-gray-500 uppercase">
                <tr>
                  <th className="py-2.5">Fund</th>
                  <th>Country</th>
                  <th>AUM ($B)</th>
                  <th>1Y Growth</th>
                  <th>Equity %</th>
                  <th>FI %</th>
                  <th>Alt %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {swfData.map((swf: any) => (
                  <tr key={swf.name} className="hover:bg-gray-900/30">
                    <td className="py-2.5 font-semibold text-white max-w-[140px] truncate">
                      {swf.name}
                    </td>
                    <td>{swf.country}</td>
                    <td className="text-brand-green font-semibold">
                      ${swf.aum_b?.toLocaleString() || "—"}
                    </td>
                    <td
                      className={
                        (swf.growth_1y_pct || 0) >= 0
                          ? "text-brand-green"
                          : "text-brand-red"
                      }
                    >
                      {(swf.growth_1y_pct || 0) >= 0 ? "+" : ""}
                      {swf.growth_1y_pct?.toFixed(1) || "0"}%
                    </td>
                    <td>{swf.equity_pct || "—"}%</td>
                    <td>{swf.fi_pct || "—"}%</td>
                    <td>{swf.alt_pct || "—"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={swfChart}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2e303a"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  tickLine={false}
                  style={{ fontSize: 10, fontFamily: "monospace" }}
                  tickFormatter={(v: number) => `$${v}B`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#6b7280"
                  tickLine={false}
                  style={{ fontSize: 9, fontFamily: "monospace" }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#151720",
                    border: "1px solid #2e303a",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                />
                <Bar dataKey="aum" radius={[0, 4, 4, 0]}>
                  {swfChart.map((_: any, idx: number) => (
                    <Cell
                      key={idx}
                      fill={SWF_COLORS[idx % SWF_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
