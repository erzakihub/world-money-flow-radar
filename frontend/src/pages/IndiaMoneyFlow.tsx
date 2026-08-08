import React, { useState, useEffect } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend
} from "recharts";
import { 
  HelpCircle, 
  Activity, 
  Zap, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  Database,
  ArrowRight,
  TrendingUp as TrendingIcon,
  Search
} from "lucide-react";

export default function IndiaMoneyFlow() {
  const [flowData, setFlowData] = useState<any>(null);
  const [sectorData, setSectorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("http://127.0.0.1:8000/api/india-flow").then(res => res.json()),
      fetch("http://127.0.0.1:8000/api/india/sector-flow").then(res => res.json())
    ])
      .then(([fData, sData]) => {
        setFlowData(fData);
        setSectorData(sData);
        setLoading(false);
      })
      .catch(err => console.error("Failed to fetch India flows", err));
  }, []);

  if (loading || !flowData || !sectorData) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  const macro = sectorData.macro_metrics || {};
  const sectors = sectorData.sector_rankings || [];

  const getMetricColor = (val: number) => {
    return val >= 0 ? "text-brand-green" : "text-brand-red";
  };

  const filteredSectors = sectors.filter((sec: any) => 
    sec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800/60 pb-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="text-brand-green w-6 h-6 animate-pulse" />
            <span>India Money Flow Dashboard</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Foreign Portfolio Investors (FPI/FII), Domestic Mutual Funds (DII), monthly retail SIP allocations, and Nifty sector models.
          </p>
        </div>
        
        {/* Composite Bull Gauge */}
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2">
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-gray-500 font-mono uppercase">composite regime</span>
            <span className="text-xs font-bold text-brand-green mt-0.5">{flowData.composite_regime}</span>
          </div>
          <div className="w-9 h-9 rounded-full border-2 border-brand-green flex items-center justify-center font-bold text-xs text-brand-green font-mono">
            {flowData.composite_bull_score}
          </div>
        </div>
      </div>

      {/* FPI vs DII Structural Divergence Warning Box */}
      <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-4 rounded-xl flex gap-3 text-xs text-brand-yellow shadow-md">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-brand-yellow" />
        <div>
          <h4 className="font-semibold text-sm text-white">Structural Liquidity Warning: FPI Outflows & DII Cushion</h4>
          <p className="leading-relaxed mt-1 text-gray-300">
            <strong>India FPI Flow remains highly selective.</strong> While robust domestic mutual fund inflows (DII) and monthly SIPs (+{macro.sip_monthly_crores} Cr) provide a structural valuation cushion, 
            historical macro studies confirm that <strong>DII flows alone cannot trigger a broad secular bull market</strong>. A true Nifty breakout requires FPI momentum fueled by global surplus recycling (Yen carry yields, global reserve expansions).
          </p>
        </div>
      </div>

      {/* Macro Scorecard Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-bg-card border border-gray-850 rounded-xl p-4 text-center">
          <span className="text-[9px] font-mono text-gray-500 uppercase block">SIP Inflows (Monthly)</span>
          <span className="text-sm font-bold text-white mt-1 block">₹{macro.sip_monthly_crores?.toLocaleString()} Cr</span>
        </div>
        <div className="bg-bg-card border border-gray-850 rounded-xl p-4 text-center">
          <span className="text-[9px] font-mono text-gray-500 uppercase block">FPI Equity Flow (30D)</span>
          <span className={`text-sm font-bold mt-1 block ${getMetricColor(macro.fpi_equity_monthly_crores)}`}>
            {macro.fpi_equity_monthly_crores > 0 ? "+" : ""}₹{macro.fpi_equity_monthly_crores?.toLocaleString()} Cr
          </span>
        </div>
        <div className="bg-bg-card border border-gray-850 rounded-xl p-4 text-center">
          <span className="text-[9px] font-mono text-gray-500 uppercase block">DII Equity Flow (30D)</span>
          <span className={`text-sm font-bold mt-1 block ${getMetricColor(macro.dii_monthly_crores)}`}>
            {macro.dii_monthly_crores > 0 ? "+" : ""}₹{macro.dii_monthly_crores?.toLocaleString()} Cr
          </span>
        </div>
        <div className="bg-bg-card border border-gray-850 rounded-xl p-4 text-center">
          <span className="text-[9px] font-mono text-gray-500 uppercase block">RBI System Liquidity</span>
          <span className="text-sm font-bold text-white mt-1 block">₹{macro.rbi_net_liquidity_crores?.toLocaleString()} Cr</span>
        </div>
        <div className="bg-bg-card border border-gray-850 rounded-xl p-4 text-center">
          <span className="text-[9px] font-mono text-gray-500 uppercase block font-semibold text-brand-blue">Global Liq Correlation</span>
          <span className="text-sm font-bold text-brand-blue mt-1 block">{(macro.global_liquidity_correlation * 100).toFixed(0)}% Match</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative Flows Chart */}
        <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md lg:col-span-2 space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">FPI vs DII Cumulative Capital Flow</h3>
          <p className="text-xs text-gray-500">Tracks cumulative net purchase volumes (INR Crores) in Indian equities since 2020.</p>
          <div className="h-[280px]">
            {flowData?.chart && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flowData.chart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFpi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff1744" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ff1744" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorDii" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e676" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" tickLine={false} tickFormatter={(tick) => tick.slice(5)} style={{ fontSize: 9, fontFamily: 'monospace' }} />
                  <YAxis stroke="#6b7280" tickLine={false} style={{ fontSize: 9, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: "#151720", border: "1px solid #2a2b36", borderRadius: 6 }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10, fontFamily: 'monospace' }} />
                  <Area type="monotone" name="Cumulative FPI" dataKey="fpi_cumulative" stroke="#ff1744" strokeWidth={1.5} fillOpacity={1} fill="url(#colorFpi)" />
                  <Area type="monotone" name="Cumulative DII" dataKey="dii_cumulative" stroke="#00e676" strokeWidth={1.5} fillOpacity={1} fill="url(#colorDii)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Mutual Fund Inflow category stats */}
        <div className="bg-bg-card border border-gray-850 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">AMFI Mutual Fund Category Flows</h3>
          <p className="text-xs text-gray-500">Monthly domestic mutual fund flows. Strong indicator of retail allocation momentum.</p>
          
          <div className="space-y-3 font-mono mt-4">
            {flowData.mutual_funds.map((mf: any, idx: number) => (
              <div key={idx} className="p-3 bg-gray-950/40 border border-gray-900 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">{mf.category}</span>
                  <span className="text-sm font-semibold text-white mt-1">{mf.flow}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                  mf.status === "Overheated" ? "bg-brand-red/10 text-brand-red" : "bg-brand-green/10 text-brand-green"
                }`}>
                  {mf.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Stage Rotation Detector: 19 Sectors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table List (Left 8 cols) */}
        <div className="lg:col-span-8 bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-heading font-semibold text-white">Nifty 19-Sector Rotation rankings</h3>
              
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Filter sectors..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-4 py-1.5 text-xs bg-gray-900 border border-gray-800 rounded-lg w-full focus:outline-none focus:border-brand-green/50 text-gray-300 placeholder-gray-500 transition-colors"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-900 rounded-lg max-h-[350px]">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="sticky top-0 bg-gray-950/95 border-b border-gray-850 text-gray-500 uppercase text-[9px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-2">Sector</th>
                    <th className="py-2.5 px-2 text-right">Composite Score</th>
                    <th className="py-2.5 px-2 text-center">Dom Support</th>
                    <th className="py-2.5 px-2 text-center">FPI Support</th>
                    <th className="py-2.5 px-2 text-center">Earnings</th>
                    <th className="py-2.5 px-2 text-center">RS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/60 text-gray-300">
                  {filteredSectors.map((sec: any) => {
                    const isSelected = selectedSector?.id === sec.id;
                    return (
                      <tr 
                        key={sec.symbol} 
                        onClick={() => setSelectedSector(sec)}
                        className={`hover:bg-gray-900/30 cursor-pointer transition-colors duration-150 ${
                          isSelected ? "bg-gray-900/40" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-gray-500 font-bold">#{sec.rank}</td>
                        <td className="py-2.5 px-2">
                          <div>
                            <span className="font-semibold text-gray-200 block">{sec.name}</span>
                            <span className="text-[9px] text-gray-500 block mt-0.5">{sec.symbol}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className="font-bold text-white">{sec.score}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-brand-green">{sec.dom_support}</td>
                        <td className="py-2.5 px-2 text-center text-gray-400">{sec.fpi_support}</td>
                        <td className="py-2.5 px-2 text-center text-brand-blue">{sec.earnings_support}</td>
                        <td className="py-2.5 px-2 text-center text-brand-purple">{sec.relative_strength}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Explainability drawer (Right 4 cols) */}
        <div className="lg:col-span-4">
          {selectedSector ? (
            <div className="bg-bg-card border border-gray-850 rounded-xl p-5 space-y-4 shadow-lg h-full flex flex-col justify-between">
              
              <div className="space-y-4 font-mono text-xs">
                <div className="border-b border-gray-850 pb-3">
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Sector catalyst audit</span>
                  <h3 className="text-md font-heading font-extrabold text-white mt-1 leading-snug">{selectedSector.name}</h3>
                  <span className="text-[9px] text-gray-400 mt-0.5 block">{selectedSector.symbol}</span>
                </div>

                <div className="space-y-2 bg-gray-950/40 p-4 rounded-xl border border-gray-900 text-[11px] font-sans">
                  <span className="text-[8px] font-mono text-gray-500 uppercase block mb-1">Qualitative Catalyst</span>
                  <p className="text-gray-300 leading-snug">{selectedSector.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-3.5 font-mono text-[10px]">
                  <div className="p-3 bg-gray-950/20 border border-gray-900 rounded-lg">
                    <span className="text-gray-500 block">Valuation risk</span>
                    <span className="text-brand-red font-bold text-xs mt-1 block">{100 - selectedSector.valuation_risk}% Premium</span>
                  </div>
                  <div className="p-3 bg-gray-950/20 border border-gray-900 rounded-lg">
                    <span className="text-gray-500 block">DII positioning</span>
                    <span className="text-brand-green font-bold text-xs mt-1 block">{selectedSector.dom_support} points</span>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-gray-900">
                <button 
                  onClick={() => setSelectedSector(null)}
                  className="w-full py-1.5 bg-gray-900 hover:bg-gray-850 border border-gray-850 hover:border-gray-700 text-gray-400 hover:text-white rounded-lg text-xs font-mono transition-colors"
                >
                  Clear Selection
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-bg-card border border-gray-850 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
              <HelpCircle className="w-10 h-10 text-gray-700 mb-3" />
              <p className="text-xs">
                Select any Nifty index sector from the rankings table to load its domestic support, FPI positioning, valuation discount bounds, and core fundamental catalyst notes.
              </p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
