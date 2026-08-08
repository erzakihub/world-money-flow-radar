import React, { useState, useEffect } from "react";
import { Shuffle, Database, CheckCircle2, AlertTriangle, ArrowRight, HelpCircle, Activity } from "lucide-react";
import DataQualityBadge from "../components/DataQualityBadge";

const assets = [
  "S&P 500",
  "Nasdaq 100",
  "Nifty 50",
  "China CSI 300",
  "US Treasuries (TLT)",
  "Gold (Spot/GLD)"
];

export default function HistoricalSimilarityEngine() {
  const [selectedAsset, setSelectedAsset] = useState(assets[0]);
  const [similarityData, setSimilarityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSimilarity = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/flow-pulse/similarity?asset_name=${encodeURIComponent(selectedAsset)}`
      );
      const data = await response.json();
      setSimilarityData(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSimilarity();
  }, [selectedAsset]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
            <Shuffle className="text-brand-blue w-6 h-6 animate-pulse" />
            <span>Historical Similarity Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Compare today's 5 Master Liquidity indicators profile against historical market regimes to forecast future asset return pathways.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataQualityBadge status="Live" />
          <span className="text-[10px] text-gray-500 font-mono bg-gray-900 border border-gray-850 px-2 py-0.5 rounded">
            Profiles matched: 9 Regimes
          </span>
        </div>
      </div>

      {/* Selector */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex items-center gap-4">
        <span className="text-xs font-mono text-gray-550 uppercase tracking-widest">Select target asset</span>
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="bg-gray-955 border border-gray-800 text-xs text-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-brand-blue focus:outline-none w-56 font-mono"
        >
          {assets.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-blue"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {similarityData.map((item, idx) => {
            const isHighest = idx === 0;
            return (
              <div 
                key={idx}
                className={`bg-bg-card border rounded-xl p-5 relative overflow-hidden transition-all duration-200 hover:border-gray-700 ${
                  isHighest ? "border-brand-blue/30 shadow-lg shadow-brand-blue/5 bg-gray-900/40" : "border-gray-850"
                }`}
              >
                {isHighest && (
                  <div className="absolute top-0 right-0 bg-brand-blue text-gray-950 font-mono text-[9px] font-bold px-3 py-1 uppercase rounded-bl-lg tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 fill-gray-950" />
                    <span>Highest Correlation Match</span>
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-heading font-extrabold text-white text-md flex items-center gap-2">
                      <span>{item.regime_name}</span>
                    </h3>
                    <p className="text-[10px] text-gray-550 font-mono mt-0.5">Similarity index: {item.similarity_score}%</p>
                  </div>
                </div>

                <div className="my-4 border-t border-gray-900 pt-4 text-xs font-sans space-y-3">
                  <div>
                    <span className="text-[8px] font-mono text-gray-500 uppercase block font-bold">What Happened historically</span>
                    <p className="text-gray-300 mt-0.5 leading-snug">{item.what_happened}</p>
                  </div>
                  <div>
                    <span className="text-[8px] font-mono text-brand-red uppercase block font-bold">Today's Key Structural Difference</span>
                    <p className="text-gray-400 mt-0.5 leading-snug">{item.key_difference}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-955 border border-gray-900 p-3 rounded-xl text-center font-mono">
                  <div>
                    <span className="text-[8px] text-gray-500 uppercase block">Fwd 3M Return</span>
                    <span className={`text-xs font-bold block mt-1 ${item.forward_3m.startsWith("+") ? "text-brand-green" : "text-brand-red"}`}>
                      {item.forward_3m}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-500 uppercase block">Fwd 6M Return</span>
                    <span className={`text-xs font-bold block mt-1 ${item.forward_6m.startsWith("+") ? "text-brand-green" : "text-brand-red"}`}>
                      {item.forward_6m}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-500 uppercase block">Fwd 12M Return</span>
                    <span className={`text-xs font-bold block mt-1 ${item.forward_12m.startsWith("+") ? "text-brand-green" : "text-brand-red"}`}>
                      {item.forward_12m}
                    </span>
                  </div>
                </div>

                {/* Match indicators badges */}
                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[8px] font-mono text-gray-550 uppercase mr-1">Matched:</span>
                  {item.matched_indicators.map((ind: string, iIdx: number) => (
                    <span key={iIdx} className="text-[8px] font-mono bg-gray-950 text-brand-blue border border-brand-blue/20 px-2 py-0.5 rounded font-bold uppercase">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
