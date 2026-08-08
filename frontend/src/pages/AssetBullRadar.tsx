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
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { 
  Search, 
  Activity, 
  Filter, 
  HelpCircle,
  ChevronRight,
  Database,
  Info,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import BullRunSignalBadge from "../components/BullRunSignalBadge";
import DataQualityBadge from "../components/DataQualityBadge";

export default function AssetBullRadar() {
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
      const response = await fetch("/api/flow-pulse/assets");
      const data = await response.json();
      setRankings(data || []);
      
      if (data && data.length > 0) {
        setSelectedAsset(data[0]);
        fetchAssetHistory(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchAssetHistory = async (assetId: string) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/flow-pulse/asset/${assetId}`);
      const data = await response.json();
      setAssetHistory(data.history || []);
    } catch (e) {
      console.error(e);
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

  const filteredRankings = rankings.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "All" || asset.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const scatterData = rankings.map(asset => {
    let priceConf = 50;
    let liqSupp = 50;
    
    if (asset.id === "gold") {
      priceConf = 85;
      liqSupp = 90;
    } else if (asset.id === "india_equities") {
      priceConf = 75;
      liqSupp = 82;
    } else if (asset.id === "us_equities") {
      priceConf = 80;
      liqSupp = 58;
    } else {
      priceConf = Math.min(95, Math.max(10, asset.score + (asset.change_1w * 3)));
      liqSupp = Math.min(95, Math.max(10, asset.score - (asset.change_1w * 2)));
    }

    return {
      x: priceConf,
      y: liqSupp,
      z: asset.score,
      name: asset.name,
      symbol: asset.symbol,
      signal: asset.signal,
      id: asset.id,
      raw: asset
    };
  });

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-955 border border-gray-800 p-3 rounded-lg shadow-xl text-xs font-sans">
          <p className="font-bold text-white mb-1">{d.name} ({d.symbol})</p>
          <div className="space-y-1 text-gray-400 font-mono">
            <p>Bull Score: <span className="text-brand-green font-bold">{d.z.toFixed(1)}</span></p>
            <p>Liquidity Support: <span>{d.y.toFixed(1)}</span></p>
            <p>Price Momentum: <span>{d.x.toFixed(1)}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const categories = ["Equity", "Bond", "Commodity", "Crypto", "Currency", "Sector"];
  
  const getHeatmapColor = (score: number) => {
    if (score >= 85) return "bg-brand-green border-brand-green/30 text-white";
    if (score >= 70) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (score >= 55) return "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/30";
    if (score >= 45) return "bg-gray-800/40 text-gray-400 border-gray-800";
    return "bg-brand-red/15 text-brand-red border-brand-red/30";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="text-brand-green w-6 h-6 animate-pulse" />
            <span>Asset Bull Radar</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Rankings heatmap and 2D Scatter Quadrant tracking Liquidity vs Price.
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg flex items-center gap-2 text-xs font-mono text-gray-400">
          <Database className="w-3.5 h-3.5 text-brand-green" />
          <span>Active Asset FEEDS: 25 classes</span>
        </div>
      </div>

      <div className="bg-bg-card border border-gray-855 rounded-xl p-5 shadow-md space-y-4">
        <h3 className="text-xs font-mono text-gray-550 uppercase tracking-wider">Asset Class Money Flow Heatmap</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {categories.map(cat => {
            const catAssets = rankings.filter(a => a.type === cat);
            return (
              <div key={cat} className="space-y-2 border border-gray-900 bg-gray-955/20 p-3 rounded-lg flex flex-col justify-between min-h-[140px]">
                <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">{cat}s</span>
                <div className="grid grid-cols-2 gap-2 flex-1 mt-2">
                  {catAssets.map(a => (
                    <div 
                      key={a.id}
                      onClick={() => handleAssetSelect(a)}
                      className={`p-2 rounded border text-center cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${getHeatmapColor(a.score)}`}
                    >
                      <span className="text-[9px] font-mono font-bold block">{a.symbol}</span>
                      <span className="text-xs font-mono font-extrabold mt-1 block">{a.score.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">Money Flow Quadrant Matrix</h3>
            <div className="h-[320px] relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ScatterChart margin={{ top: 10, right: 20, left: -25, bottom: 5 }}>
                  <XAxis type="number" dataKey="x" name="Price Confirmation" domain={[0, 100]} stroke="#4b5563" fontSize={10} tickLine={false} />
                  <YAxis type="number" dataKey="y" name="Liquidity Support" domain={[0, 100]} stroke="#4b5563" fontSize={10} tickLine={false} />
                  <ZAxis type="number" dataKey="z" range={[40, 150]} />
                  <ReferenceLine x={50} stroke="#374151" strokeDasharray="5 5" />
                  <ReferenceLine y={50} stroke="#374151" strokeDasharray="5 5" />
                  <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Assets" data={scatterData} fill="#10B981" onClick={(node: any) => handleAssetSelect(node.raw)} className="cursor-pointer">
                    {scatterData.map((entry, index) => {
                      const scoreColor = entry.z >= 70 ? "#10B981" : entry.z >= 55 ? "#F59E0B" : "#EF4444";
                      return <circle key={`cell-${index}`} fill={scoreColor} opacity={0.85} r={entry.z / 9} className="hover:opacity-100 transition-opacity" />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="absolute top-2 left-10 text-[9px] font-mono text-gray-500 bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-800/40">ACCUMULATION</div>
              <div className="absolute top-2 right-4 text-[9px] font-mono text-brand-green bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-800/40">BULL POCKET</div>
              <div className="absolute bottom-10 left-10 text-[9px] font-mono text-brand-red bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-800/40">AVOID / OUTFLOW</div>
              <div className="absolute bottom-10 right-4 text-[9px] font-mono text-brand-yellow bg-gray-900/60 px-1.5 py-0.5 rounded border border-gray-800/40">DIVERGENCE RISK</div>
            </div>
          </div>

          <div className="bg-bg-card border border-gray-850 rounded-xl overflow-hidden shadow-md">
            <div className="p-5 border-b border-gray-800/60 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-gray-550" />
                <input 
                  type="text" 
                  placeholder="Search asset classes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs text-white focus:outline-none placeholder-gray-600 w-44 md:w-64"
                />
              </div>
              <Filter className="w-3.5 h-3.5 text-gray-550" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-550 font-mono text-[10px] uppercase bg-gray-900/10">
                    <th className="py-3 px-4 font-semibold text-center">Rank</th>
                    <th className="py-3 px-4 font-semibold">Asset Class</th>
                    <th className="py-3 px-4 font-semibold text-right">Bull Score</th>
                    <th className="py-3 px-4 font-semibold text-center">1W</th>
                    <th className="py-3 px-4 font-semibold text-center">1M</th>
                    <th className="py-3 px-4 font-semibold text-center">3M</th>
                    <th className="py-3 px-4 font-semibold text-right">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {filteredRankings.map((asset, index) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    return (
                      <tr 
                        key={asset.id}
                        onClick={() => handleAssetSelect(asset)}
                        className={`hover:bg-gray-900/40 cursor-pointer transition-colors duration-150 ${isSelected ? "bg-gray-900/60" : ""}`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-gray-550 text-center">#{index+1}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-gray-200">{asset.name}</p>
                            <p className="text-[10px] font-mono text-gray-500 mt-0.5">{asset.symbol} • {asset.type}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right"><span className="font-mono font-bold text-white text-sm">{asset.score.toFixed(1)}</span></td>
                        <td className={`py-3 px-4 text-center font-mono font-semibold ${asset.change_1w >= 0 ? "text-brand-green" : "text-brand-red"}`}>{asset.change_1w > 0 ? "+" : ""}{asset.change_1w.toFixed(1)}%</td>
                        <td className={`py-3 px-4 text-center font-mono font-semibold ${asset.change_1m >= 0 ? "text-brand-green" : "text-brand-red"}`}>{asset.change_1m > 0 ? "+" : ""}{asset.change_1m.toFixed(1)}%</td>
                        <td className={`py-3 px-4 text-center font-mono font-semibold ${asset.change_3m >= 0 ? "text-brand-green" : "text-brand-red"}`}>{asset.change_3m > 0 ? "+" : ""}{asset.change_3m.toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right"><BullRunSignalBadge signal={asset.signal} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right side detail drawer */}
        <div className="lg:col-span-4">
          {selectedAsset ? (
            <div className="bg-bg-card border border-gray-850 rounded-xl p-5 space-y-5 sticky top-24 shadow-xl">
              <div className="flex justify-between items-start border-b border-gray-800/80 pb-3">
                <div>
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{selectedAsset.type}</span>
                  <h3 className="text-md font-heading font-extrabold text-white mt-1">{selectedAsset.name}</h3>
                </div>
                <DataQualityBadge status={selectedAsset.data_quality} />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-950/40 p-4 rounded-xl border border-gray-900">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-gray-500 uppercase">Bull Score</span>
                  <span className="text-2xl font-bold font-mono text-white mt-0.5">{selectedAsset.score.toFixed(1)}</span>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[9px] font-mono text-gray-500 uppercase">State</span>
                  <div className="mt-1"><BullRunSignalBadge signal={selectedAsset.signal} /></div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-mono text-gray-500 uppercase">Historical Trend (12 Months)</span>
                <div className="h-[110px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={assetHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="date" stroke="#6b7280" tickLine={false} style={{ fontSize: 7, fontFamily: "monospace" }} />
                      <YAxis stroke="#6b7280" tickLine={false} style={{ fontSize: 7, fontFamily: "monospace" }} domain={[0, 100]} />
                      <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gray-955/40 p-3.5 rounded-xl border border-gray-900 text-xs space-y-2.5 font-sans leading-relaxed">
                <div>
                  <span className="text-[8px] font-mono text-gray-500 uppercase block">Causality & Rationale</span>
                  <p className="text-gray-300 mt-0.5 leading-snug">{selectedAsset.reason}</p>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-brand-red uppercase block">Opposite Risk</span>
                  <p className="text-gray-400 mt-0.5 leading-snug">{selectedAsset.opposite_risk}</p>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-brand-blue uppercase block">Best Supporting Indicators</span>
                  <p className="text-gray-300 mt-0.5 leading-snug">{selectedAsset.supporting_indicators}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-bg-card border border-gray-850 rounded-xl p-6 text-center h-full flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
              <HelpCircle className="w-9 h-9 text-gray-700 mb-3" />
              <p className="text-xs">Select any asset to load macro details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
