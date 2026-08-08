import React, { useState, useEffect } from "react";
import { 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  ZAxis, 
  Label,
  ReferenceLine,
  ReferenceArea,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { 
  ShieldAlert, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Filter, 
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  Database
} from "lucide-react";

export default function BullPocketRadar() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/bull-pocket/rankings");
      const data = await response.json();
      setRankings(data.rankings || []);
    } catch (e) {
      console.error("Failed to fetch rankings data", e);
    }
    setLoading(false);
  };

  const fetchAssetHistory = async (assetId: string) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bull-pocket/asset/${assetId}`);
      const data = await response.json();
      setAssetHistory(data.history || []);
    } catch (e) {
      console.error("Failed to fetch asset history", e);
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  const handleAssetSelect = (asset: any) => {
    setSelectedAsset(asset);
    fetchAssetHistory(asset.id);
  };

  const getSignalBadgeColor = (signal: string) => {
    switch (signal.toLowerCase()) {
      case "strong bull":
        return "bg-brand-green/10 text-brand-green border-brand-green/20";
      case "early bull":
        return "bg-brand-blue/10 text-brand-blue border-brand-blue/20";
      case "watchlist":
        return "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20";
      case "neutral":
        return "bg-gray-800/55 text-gray-400 border-gray-700/30";
      case "avoid":
      default:
        return "bg-brand-red/10 text-brand-red border-brand-red/20";
    }
  };

  const filteredRankings = rankings.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "All" || asset.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const scatterData = rankings.map(asset => ({
    x: asset.price_confirmation,
    y: asset.liquidity_support,
    z: asset.score,
    name: asset.name,
    symbol: asset.symbol,
    signal: asset.signal,
    id: asset.id,
    raw: asset
  }));

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-905 border border-gray-800 p-3 rounded-lg shadow-xl text-xs font-sans">
          <p className="font-bold text-white mb-1">{data.name} ({data.symbol})</p>
          <div className="space-y-1 text-gray-400 font-mono">
            <p>Bull Score: <span className="text-brand-green font-bold">{data.z}</span></p>
            <p>Liquidity Support: <span>{data.y}</span></p>
            <p>Price Momentum: <span>{data.x}</span></p>
            <p>Quadrant: <span className="text-brand-blue font-semibold">
              {data.y >= 50 && data.x >= 50 ? "Bull Pocket" : 
               data.y >= 50 && data.x < 50 ? "Accumulation" : 
               data.y < 50 && data.x >= 50 ? "Distribution / Divergence" : "Avoid"}
            </span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="text-brand-green w-6 h-6 animate-pulse" />
            <span>Bull Market Pocket Radar</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Aggregates 7 weighted factors to rank and discover relative strength bull-market pockets.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs bg-gray-900 border border-gray-800 rounded-lg w-full md:w-64 focus:outline-none focus:border-brand-green/50 text-gray-300 placeholder-gray-500 transition-colors"
            />
          </div>

          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5 text-xs">
            {["All", "Equity", "Bond", "Commodity", "Crypto"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-md transition-colors duration-150 ${
                  filterType === t 
                    ? "bg-gray-800 text-white font-semibold" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Quadrant Scatter Plot & List */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Quadrant Scatter Map */}
            <div className="bg-bg-card border border-gray-855 rounded-xl p-5 relative">
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span>Liquidity vs Momentum Quadrant Analysis</span>
              </h3>
              
              <div className="h-[280px] w-full relative bg-gray-955/20 rounded-lg border border-gray-900 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    {/* Quadrant Labels/Shadings */}
                    <ReferenceArea x1={0} x2={50} y1={50} y2={100} fill="#10B981" fillOpacity={0.02} />
                    <ReferenceArea x1={50} x2={100} y1={50} y2={100} fill="#3B82F6" fillOpacity={0.02} />
                    <ReferenceArea x1={0} x2={50} y1={0} y2={50} fill="#EF4444" fillOpacity={0.02} />
                    
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Price Confirmation" 
                      domain={[0, 100]} 
                      stroke="#4b5563" 
                      fontSize={10}
                      tickLine={false}
                    >
                      <Label value="Price Strength / Relative Momentum ➜" offset={-10} position="insideBottom" fill="#6b7280" fontSize={10} />
                    </XAxis>
                    
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="Liquidity Support" 
                      domain={[0, 100]} 
                      stroke="#4b5563" 
                      fontSize={10}
                      tickLine={false}
                    >
                      <Label value="Liquidity Support / Capital Flows ➜" angle={-90} position="insideLeft" offset={5} fill="#6b7280" fontSize={10} />
                    </YAxis>
                    
                    <ZAxis type="number" dataKey="z" range={[40, 150]} />
                    
                    <ReferenceLine x={50} stroke="#374151" strokeDasharray="5 5" />
                    <ReferenceLine y={50} stroke="#374151" strokeDasharray="5 5" />
                    
                    <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    
                    <Scatter 
                      name="Assets" 
                      data={scatterData} 
                      fill="#10B981"
                      onClick={(node: any) => handleAssetSelect(node.raw)}
                      className="cursor-pointer"
                    >
                      {scatterData.map((entry, index) => {
                        const scoreColor = entry.z >= 70 ? "#10B981" : entry.z >= 58 ? "#3B82F6" : entry.z >= 45 ? "#F59E0B" : "#EF4444";
                        return <circle key={`cell-${index}`} fill={scoreColor} opacity={0.8} r={entry.z / 10} className="hover:opacity-100 transition-opacity" />;
                      })}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>

                {/* Corner Labels */}
                <div className="absolute top-4 left-4 text-[9px] font-mono text-gray-500 bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-800/40">
                  ACCUMULATION (Low Price, High Liquidity)
                </div>
                <div className="absolute top-4 right-4 text-[9px] font-mono text-brand-green bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-800/40">
                  BULL POCKET (High Price, High Liquidity)
                </div>
                <div className="absolute bottom-12 left-4 text-[9px] font-mono text-brand-red bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-800/40">
                  AVOID / LIQUIDATION (Low Price, Low Liquidity)
                </div>
                <div className="absolute bottom-12 right-4 text-[9px] font-mono text-brand-yellow bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-800/40">
                  DIVERGENCE RISK (High Price, Low Liquidity)
                </div>
              </div>
            </div>

            {/* 2. Asset Rankings Table */}
            <div className="bg-bg-card border border-gray-850 rounded-xl overflow-hidden shadow-md">
              <div className="p-5 border-b border-gray-800/60 flex items-center justify-between">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                  Composite Asset Bull Rankings ({filteredRankings.length})
                </h3>
                <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-brand-green" />
                  Factor Weights: 30% Liq | 20% Flow | 15% Mom | 35% Alt
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-800/80 text-gray-500 font-mono bg-gray-900/10">
                      <th className="py-3 px-4 font-semibold text-[10px] uppercase text-center">Rank</th>
                      <th className="py-3 px-4 font-semibold text-[10px] uppercase">Asset Class</th>
                      <th className="py-3 px-4 font-semibold text-[10px] uppercase">Region</th>
                      <th className="py-3 px-4 font-semibold text-[10px] uppercase text-right">Bull Score</th>
                      <th className="py-3 px-4 font-semibold text-[10px] uppercase text-center">1W</th>
                      <th className="py-3 px-4 font-semibold text-[10px] uppercase text-center">1M</th>
                      <th className="py-3 px-4 font-semibold text-[10px] uppercase text-center">3M</th>
                      <th className="py-3 px-4 font-semibold text-[10px] uppercase text-center">Signal</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900">
                    {filteredRankings.map((asset) => {
                      const isSelected = selectedAsset?.id === asset.id;
                      return (
                        <tr 
                          key={asset.id}
                          onClick={() => handleAssetSelect(asset)}
                          className={`hover:bg-gray-900/40 cursor-pointer transition-colors duration-150 ${
                            isSelected ? "bg-gray-900/60" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-gray-500 text-center">
                            #{asset.rank}
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-gray-200">{asset.name}</p>
                              <p className="text-[10px] font-mono text-gray-500 mt-0.5">{asset.symbol} • {asset.type}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-mono">{asset.region}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-mono font-bold text-white">{asset.score.toFixed(1)}</span>
                              <div className="w-12 bg-gray-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className="h-full rounded-full bg-brand-green"
                                  style={{ width: `${asset.score}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className={`py-3 px-4 text-center font-mono font-semibold ${asset.change_1w >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                            {asset.change_1w > 0 ? "+" : ""}{asset.change_1w}%
                          </td>
                          <td className={`py-3 px-4 text-center font-mono font-semibold ${asset.change_1m >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                            {asset.change_1m > 0 ? "+" : ""}{asset.change_1m}%
                          </td>
                          <td className={`py-3 px-4 text-center font-mono font-semibold ${asset.change_3m >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                            {asset.change_3m > 0 ? "+" : ""}{asset.change_3m}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-mono font-bold uppercase ${getSignalBadgeColor(asset.signal)}`}>
                              {asset.signal}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-right">
                            <ChevronRight className="w-4 h-4 inline" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel: Selected Asset Detail Drawer (4 cols) */}
          <div className="lg:col-span-4">
            {selectedAsset ? (
              <div className="bg-bg-card border border-gray-850 rounded-xl p-5 space-y-5 sticky top-24 shadow-xl">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-gray-800/80 pb-3">
                  <div>
                    <h3 className="text-sm font-heading font-extrabold text-white">{selectedAsset.name}</h3>
                    <p className="text-[10px] font-mono text-gray-500 mt-0.5">{selectedAsset.symbol} • {selectedAsset.region}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${getSignalBadgeColor(selectedAsset.signal)}`}>
                    {selectedAsset.signal}
                  </span>
                </div>

                {/* Score Panel */}
                <div className="grid grid-cols-2 gap-3 bg-gray-950/40 p-4 rounded-xl border border-gray-900">
                  <div className="text-left font-mono">
                    <span className="text-[9px] text-gray-500 block uppercase">Composite Score</span>
                    <span className="text-xl font-bold text-white">{selectedAsset.score.toFixed(1)}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[9px] text-gray-500 block uppercase">Price Conf.</span>
                    <span className="text-brand-blue font-bold text-lg">{selectedAsset.price_confirmation.toFixed(1)}</span>
                  </div>
                </div>

                {/* Trajectory Area Chart */}
                <div>
                  <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Historical Score Trajectory</h4>
                  <div className="h-[120px] w-full bg-gray-950/20 rounded border border-gray-900 p-1">
                    {historyLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-brand-green"></div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={assetHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="date" hide />
                          <YAxis domain={["auto", "auto"]} hide />
                          <RechartsTooltip 
                            contentStyle={{ background: "#0c0d12", border: "1px solid #2a2b36", borderRadius: "6px" }}
                            labelStyle={{ color: "#6b7280", fontSize: "9px", fontFamily: "monospace" }}
                            itemStyle={{ color: "#10b981", fontSize: "10px" }}
                          />
                          <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={false} name="Bull Score" />
                          <Line type="monotone" dataKey="liquidity_score" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Liquidity Engine" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Factors Explainability Panel */}
                <div className="space-y-3.5">
                  <div className="bg-gray-955/30 p-3 rounded-xl border border-gray-900 text-xs">
                    <span className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Qualitative Rationale</span>
                    <p className="text-gray-300 leading-relaxed font-sans">{selectedAsset.reason}</p>
                  </div>

                  <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-3.5 text-xs text-brand-green">
                    <span className="font-bold block uppercase text-[8px] tracking-wider mb-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Supporting Catalyst Data
                    </span>
                    <p className="leading-snug text-gray-200">{selectedAsset.supporting_data}</p>
                  </div>

                  <div className="bg-brand-red/5 border border-brand-red/10 rounded-xl p-3.5 text-xs text-brand-red">
                    <span className="font-bold block uppercase text-[8px] tracking-wider mb-1 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Contradicting Risk Factors
                    </span>
                    <p className="leading-snug text-gray-200">{selectedAsset.contradicting_data}</p>
                  </div>

                  <div className="bg-gray-955/40 p-3.5 rounded-xl border border-gray-900 text-xs">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-gray-500">Regime Fit:</span>
                      <span className="text-gray-300 font-bold">{selectedAsset.regime_suitability}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-bg-card border border-gray-850 rounded-xl p-8 text-center h-72 flex flex-col items-center justify-center text-gray-500">
                <HelpCircle className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-xs">Select an asset from the radar table to load complete macro catalyst models, risk bounds, and historical trends.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
