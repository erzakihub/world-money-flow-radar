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
  ReferenceLine,
} from "recharts";
import { 
  Network, 
  Activity, 
  AlertTriangle, 
  Globe,
  Sliders,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Database
} from "lucide-react";

export default function CrossBorderMatrix() {
  const [data, setData] = useState<any>(null);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/cross-border").then((res) => res.json()),
      fetch("/api/flows/surplus-matrix").then((res) => res.json())
    ])
      .then(([cbData, mData]) => {
        setData(cbData);
        setMatrixData(mData);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  if (loading || !data || !matrixData) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  const creditImpulse = data.credit_impulse || [];
  const swapLineHistory = data.swap_line_history || [];
  const eurodollarStress = data.eurodollar_stress || [];

  const matrixRows = matrixData.rows || [];
  const matrixCols = matrixData.columns || [];
  const matrixCells = matrixData.matrix || [];
  const countryDetails = matrixData.country_details || {};

  const CreditTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left max-w-[220px]">
          <p className="text-gray-400 font-semibold mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>
                {entry.name || entry.dataKey}
              </span>
              <span className="text-white font-semibold">
                {(entry.value || 0).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const SwapTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left">
          <p className="text-gray-400 font-semibold mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>
                {entry.name || entry.dataKey}
              </span>
              <span className="text-white font-semibold">
                ${(entry.value || 0).toFixed(1)}B
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const EurodollarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg shadow-xl font-mono text-xs text-left">
          <p className="text-gray-400 font-semibold mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>
                {entry.name || entry.dataKey}
              </span>
              <span className="text-white font-semibold">
                {(entry.value || 0).toFixed(1)} bps
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Find dynamic cell value from matrix cells array
  const getMatrixCell = (source: string, dest: string) => {
    return matrixCells.find(
      (c: any) => c.source === source && c.destination === dest
    ) || { intensity: 0, direction: "neutral", momentum: "Stable", trend: "Flat" };
  };

  // Heatmap cell color helper
  const getFlowColor = (value: number) => {
    if (value === undefined || value === null || value === 0) return "text-gray-650 hover:bg-gray-900/10";
    if (value > 40) return "bg-brand-green/20 text-brand-green font-bold hover:bg-brand-green/25";
    if (value > 10) return "bg-brand-green/10 text-brand-green hover:bg-brand-green/15";
    if (value > 0) return "bg-brand-green/5 text-green-400 hover:bg-brand-green/10";
    if (value > -10) return "bg-brand-red/5 text-red-400 hover:bg-brand-red/10";
    if (value > -40) return "bg-brand-red/10 text-brand-red hover:bg-brand-red/15";
    return "bg-brand-red/20 text-brand-red font-bold hover:bg-brand-red/25";
  };

  const selectedCreatorDetails = selectedCreator ? countryDetails[selectedCreator] : null;

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-brand-purple" />
            <span>Surplus Savings & Capital Matrix</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Traces credit impulse trends alongside sovereign surplus export-to-asset allocation matrices.
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-green" />
          <span>Matrix Coverage: 11 Exporters × 14 Assets</span>
        </div>
      </div>

      {/* Section 1: Credit Impulse Chart */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-green" />
          <span>Credit Impulse (% of GDP)</span>
        </h3>
        <p className="text-xs text-gray-500">
          Credit impulse measures the rate of change in new credit as % of GDP.
          Positive = credit expansion, negative = contraction.
        </p>

        {/* Key annotation */}
        <div className="bg-brand-yellow/5 border border-brand-yellow/20 rounded-lg px-4 py-2 text-xs font-mono text-brand-yellow">
          ⚡ China credit impulse leads global equities by 6-12 months — a key
          macro leading indicator.
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={creditImpulse}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradUS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#29b6f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#29b6f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradChina" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff1744" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff1744" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradGlobal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e676" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 9, fontFamily: "monospace" }}
              />
              <YAxis
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 9, fontFamily: "monospace" }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <ReferenceLine
                y={0}
                stroke="#4b5563"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
              <Tooltip content={<CreditTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
              />
              <Area
                type="monotone"
                dataKey="US"
                name="US Credit Impulse"
                stroke="#29b6f6"
                strokeWidth={2}
                fill="url(#gradUS)"
              />
              <Area
                type="monotone"
                dataKey="China"
                name="China Credit Impulse"
                stroke="#ff1744"
                strokeWidth={2}
                fill="url(#gradChina)"
              />
              <Area
                type="monotone"
                dataKey="Global"
                name="Global Credit Impulse"
                stroke="#00e676"
                strokeWidth={2}
                fill="url(#gradGlobal)"
                strokeDasharray="6 3"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 2: Surplus Savings to Asset Allocation Matrix Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap Matrix Table (Left 9 cols) */}
        <div className="lg:col-span-9 bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-brand-blue" />
              <span>Surplus Savings-to-Asset Allocation Matrix</span>
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Intensity mapping of surplus capitals routing into secondary target categories. Click rows to inspect creator balance sheet buffers.
            </p>
            
            <div className="overflow-x-auto border border-gray-900 rounded-lg max-h-[380px]">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="sticky top-0 bg-gray-950/90 backdrop-blur border-b border-gray-850 text-gray-500 uppercase text-[9px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap bg-gray-950/80 sticky left-0 border-r border-gray-850">Surplus Exporter</th>
                    {matrixCols.map((dest: string) => (
                      <th key={dest} className="py-2.5 px-2.5 text-center min-w-[90px]">
                        {dest}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/60">
                  {matrixRows.map((source: string) => {
                    const isSelected = selectedCreator === source;
                    return (
                      <tr 
                        key={source} 
                        onClick={() => setSelectedCreator(source)}
                        className={`hover:bg-gray-900/30 cursor-pointer transition-colors duration-150 ${
                          isSelected ? "bg-gray-900/40" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap bg-gray-950/50 sticky left-0 border-r border-gray-850">
                          {source}
                        </td>
                        {matrixCols.map((dest: string) => {
                          const cell = getMatrixCell(source, dest);
                          const val = cell.intensity;
                          const displayVal = val !== 0 ? `${val > 0 ? "+" : ""}${val.toFixed(1)}` : "—";
                          return (
                            <td
                              key={dest}
                              className={`py-2 px-2.5 text-center transition-all ${getFlowColor(val)}`}
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[9px] font-mono text-gray-500 pt-4 mt-4 border-t border-gray-900">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-brand-green/20 inline-block"></span>{" "}
              Inflow &gt; 40
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-brand-green/10 inline-block"></span>{" "}
              Inflow 10 - 40
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-gray-850 inline-block"></span>{" "}
              Neutral
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-brand-red/10 inline-block"></span>{" "}
              Outflow -10 to -40
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-brand-red/20 inline-block"></span>{" "}
              Outflow &lt; -40
            </span>
          </div>
        </div>

        {/* Selected Exporter Detail Drawer (Right 3 cols) */}
        <div className="lg:col-span-3">
          {selectedCreatorDetails ?
            <div className="bg-bg-card border border-gray-850 rounded-xl p-5 space-y-4 shadow-lg h-full flex flex-col justify-between">
              
              <div className="space-y-4 font-mono text-xs">
                <div className="border-b border-gray-850 pb-3">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Balance sheet audit</span>
                  <h3 className="text-md font-heading font-extrabold text-white mt-1">{selectedCreator}</h3>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between border-b border-gray-900 pb-1.5">
                    <span className="text-gray-500">Current Account:</span>
                    <span className="text-white font-bold">{"$"}{selectedCreatorDetails.current_account}B</span>
                  </div>
                  {selectedCreatorDetails.trade_balance &&
                    <div className="flex justify-between border-b border-gray-900 pb-1.5">
                      <span className="text-gray-500">Trade Balance:</span>
                      <span className="text-white font-bold">{"$"}{selectedCreatorDetails.trade_balance}B</span>
                    </div>
                  }
                  <div className="flex justify-between border-b border-gray-900 pb-1.5">
                    <span className="text-gray-500">FX Reserves:</span>
                    <span className="text-white font-bold">{"$"}{selectedCreatorDetails.fx_reserves}B</span>
                  </div>
                  {selectedCreatorDetails.swf_aum > 0 &&
                    <div className="flex justify-between border-b border-gray-900 pb-1.5">
                      <span className="text-gray-500">Sovereign SWF AUM:</span>
                      <span className="text-brand-green font-bold">{"$"}{selectedCreatorDetails.swf_aum}B</span>
                    </div>
                  }
                </div>

                <div className="bg-gray-955/40 p-3.5 rounded-xl border border-gray-900 text-[11px] font-sans space-y-2">
                  <div>
                    <span className="text-[8px] font-mono text-gray-500 uppercase block">Reserve Composition</span>
                    <p className="text-gray-300 leading-snug">{selectedCreatorDetails.reserve_composition}</p>
                  </div>
                  <div>
                    <span className="text-[8px] font-mono text-gray-500 uppercase block">Currency Profile</span>
                    <p className="text-gray-300 leading-snug">{selectedCreatorDetails.currency_trend}</p>
                  </div>
                  <div>
                    <span className="text-[8px] font-mono text-gray-500 uppercase block">Primary Destination Targets</span>
                    <p className="text-brand-blue font-semibold leading-snug">{selectedCreatorDetails.savings_destination}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-900">
                <button 
                  onClick={() => setSelectedCreator(null)}
                  className="w-full py-1.5 bg-gray-900 hover:bg-gray-855 border border-gray-855 hover:border-gray-700 text-gray-400 hover:text-white rounded-lg text-xs font-mono transition-colors"
                >
                  Clear Selection
                </button>
              </div>

            </div>
            :
            <div className="bg-bg-card border border-gray-855 rounded-xl p-6 text-center h-full flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
              <HelpCircle className="w-9 h-9 text-gray-700 mb-3" />
              <p className="text-xs">
                Click on any exporter row (e.g., Japan, China, Gulf / GCC, Norway / SWF) to review current accounts, foreign reserves composition, SWF holdings, and currency trends.
              </p>
            </div>
          }
        </div>
      </div>

      {/* Section 3: Fed Swap Line Usage */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-brand-red" />
          <span>Fed Swap Line Usage (USD Billions)</span>
        </h3>
        <p className="text-xs text-gray-500">
          Federal Reserve central bank liquidity swap lines — activated during
          dollar funding stress events. Spikes indicate acute offshore USD
          shortages (COVID-19 Mar 2020, UK Gilt Crisis Sep 2022).
        </p>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart
              data={swapLineHistory}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradSwap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff1744" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ff1744" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 9, fontFamily: "monospace" }}
              />
              <YAxis
                stroke="#6b7280"
                tickLine={false}
                style={{ fontSize: 9, fontFamily: "monospace" }}
                tickFormatter={(v: number) => `$${v}B`}
              />
              <Tooltip content={<SwapTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Swap Line Usage"
                stroke="#ff1744"
                strokeWidth={2}
                fill="url(#gradSwap)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stress Period Markers */}
        <div className="grid grid-cols-3 gap-3 border-t border-gray-900 pt-4 text-center text-[10px] font-mono text-gray-400">
          <div className="p-2 rounded bg-brand-red/10 border border-brand-red/20">
            <span className="text-brand-red font-semibold block">
              COVID-19 Shock
            </span>
            <span className="text-gray-450 block mt-0.5">Mar 2020</span>
            <span className="text-white text-sm font-bold block mt-0.5">
              $449B peak
            </span>
          </div>
          <div className="p-2 rounded bg-brand-yellow/10 border border-brand-yellow/20">
            <span className="text-brand-yellow font-semibold block">
              UK Gilt Crisis
            </span>
            <span className="text-gray-450 block mt-0.5">Sep 2022</span>
            <span className="text-white text-sm font-bold block mt-0.5">
              $6.3B spike
            </span>
          </div>
          <div className="p-2 rounded bg-brand-green/10 border border-brand-green/20">
            <span className="text-brand-green font-semibold block">
              Current Level
            </span>
            <span className="text-gray-450 block mt-0.5">Jun 2026</span>
            <span className="text-white text-sm font-bold block mt-0.5">
              Near zero
            </span>
          </div>
        </div>
      </div>

      {/* Section 4: Eurodollar Stress Indicator */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md space-y-4">
        <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-yellow" />
          <span>Eurodollar Stress: Cross-Currency Basis Swap (bps)</span>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[320px]">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={eurodollarStress}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#222"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  tickLine={false}
                  style={{ fontSize: 9, fontFamily: "monospace" }}
                />
                <YAxis
                  stroke="#6b7280"
                  tickLine={false}
                  style={{ fontSize: 9, fontFamily: "monospace" }}
                  tickFormatter={(v: number) => `${v}bp`}
                />
                <ReferenceLine
                  y={0}
                  stroke="#4b5563"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                />
                <Tooltip content={<EurodollarTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
                />
                <Line
                  type="monotone"
                  dataKey="EUR_USD"
                  name="EUR/USD Basis"
                  stroke="#ffa726"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="JPY_USD"
                  name="JPY/USD Basis"
                  stroke="#f06292"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="GBP_USD"
                  name="GBP/USD Basis"
                  stroke="#ab47bc"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Explanation Card */}
          <div className="bg-gray-950/40 border border-gray-900 rounded-lg p-5 text-xs font-mono text-gray-400 leading-relaxed space-y-3">
            <h4 className="text-brand-blue font-semibold text-sm">
              Eurodollar System Explained
            </h4>
            <p>
              The <span className="text-white">cross-currency basis swap</span>{" "}
              measures the cost of borrowing USD offshore. Negative values
              indicate a USD funding premium — foreign banks must pay extra to
              access dollars.
            </p>
            <p>
              <span className="text-brand-yellow">When basis widens</span>{" "}
              (more negative), it signals dollar shortage stress in the global
              financial system. The Fed's swap lines exist to alleviate this.
            </p>
            <p>
              <span className="text-brand-green">Near-zero basis</span>{" "}
              indicates normal Eurodollar funding conditions and adequate
              offshore dollar liquidity.
            </p>
            <div className="border-t border-gray-800 pt-3 mt-3">
              <p className="text-[10px] text-gray-500 uppercase font-semibold">
                Key Threshold
              </p>
              <p className="text-brand-red mt-0.5">
                Basis &lt; -50bps = Acute stress. Watch for Fed intervention.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
