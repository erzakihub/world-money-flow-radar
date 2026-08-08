import React, { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp, Sparkles, HelpCircle } from "lucide-react";

export default function CrowdingOverheating() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/overheating")
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

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">Crowding & Overheating</h2>
          <p className="text-sm text-gray-500">Monitor highly crowded asset classes and overbought sectors to prevent chasing exhaustive trends.</p>
        </div>
      </div>

      {/* Bubble Warnings Banner */}
      {data.bubble_warnings && data.bubble_warnings.length > 0 && (
        <div className="bg-brand-red/10 border border-brand-red/20 p-4 rounded-xl flex gap-3 text-xs text-brand-red">
          <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
          <div>
            <h4 className="font-semibold text-sm">Critical Overheating Alerts</h4>
            <p className="leading-relaxed mt-1 text-gray-300">
              The following instruments have breached the 80/100 critical crowding threshold: 
              <strong className="text-white font-bold"> {data.bubble_warnings.join(", ")}</strong>. 
              Valuations are highly stretched and price extension from their 200-day moving averages sits in the 90th percentile.
            </p>
          </div>
        </div>
      )}

      {/* Overheating Score Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.all_metrics.slice(0, 6).map((item: any) => (
          <div key={item.symbol} className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between font-mono text-[10px] text-gray-500">
                <span>{item.symbol} • {item.asset_class}</span>
                <span className={item.score >= 80 ? "text-brand-red font-bold animate-pulse" : item.score >= 60 ? "text-brand-yellow font-bold" : "text-brand-green"}>
                  {item.status}
                </span>
              </div>
              <h4 className="text-md font-heading font-semibold text-white mt-2 truncate">{item.name}</h4>
              
              <div className="flex items-center gap-4 mt-4 font-mono text-xs text-gray-400">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">RSI (14)</span>
                  <span className="text-white font-semibold mt-0.5 block">{item.rsi}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">vs 200DMA</span>
                  <span className={`font-semibold mt-0.5 block ${item.extension >= 15 ? "text-brand-red" : "text-gray-300"}`}>
                    +{item.extension}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-850 flex items-center justify-between text-xs font-mono">
              <span className="text-gray-500">Overheating score:</span>
              <span className={`font-semibold text-sm ${
                item.score >= 80 ? "text-brand-red" : item.score >= 60 ? "text-brand-yellow" : "text-brand-green"
              }`}>
                {item.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Complete Warnings List Table */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-md font-heading font-semibold text-white mb-4">Complete Crowding Risk Matrix</h3>
        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-gray-800 text-gray-500 uppercase">
              <tr>
                <th className="py-2.5">Symbol</th>
                <th>Asset Class</th>
                <th>Country</th>
                <th>RSI (14)</th>
                <th>Extension 200DMA</th>
                <th>Status Tag</th>
                <th className="text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {data.all_metrics.map((item: any) => (
                <tr key={item.symbol} className="hover:bg-gray-900/30">
                  <td className="py-3 font-semibold text-white">{item.symbol}</td>
                  <td className="text-gray-400">{item.asset_class}</td>
                  <td>{item.country}</td>
                  <td>{item.rsi}</td>
                  <td className={item.extension >= 15 ? "text-brand-red" : ""}>+{item.extension}%</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      item.score >= 80 ? "bg-brand-red/10 text-brand-red" : item.score >= 60 ? "bg-brand-yellow/10 text-brand-yellow" : "bg-brand-green/10 text-brand-green"
                    }`}>
                      {item.action_tag}
                    </span>
                  </td>
                  <td className={`text-right font-bold text-sm ${
                    item.score >= 80 ? "text-brand-red" : item.score >= 60 ? "text-brand-yellow" : "text-brand-green"
                  }`}>
                    {item.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
