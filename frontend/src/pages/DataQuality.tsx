import React, { useState, useEffect } from "react";
import { Database, AlertTriangle, CheckCircle, ShieldAlert, RefreshCw } from "lucide-react";

export default function DataQuality() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/data-quality/status");
      const resData = await response.json();
      setData(resData);
    } catch (e) {
      console.error("Failed to fetch data quality status", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "green":
        return "text-brand-green bg-brand-green/10 border-brand-green/20";
      case "yellow":
        return "text-brand-yellow bg-brand-yellow/10 border-brand-yellow/20";
      case "red":
      default:
        return "text-brand-red bg-brand-red/10 border-brand-red/20";
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "green": return "bg-brand-green";
      case "yellow": return "bg-brand-yellow";
      case "red":
      default: return "bg-brand-red";
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
            <Database className="text-brand-blue w-6 h-6" />
            <span>Data Quality & Freshness Status</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time feed diagnostics, staleness monitors, and proxy models for all global macro database variables.
          </p>
        </div>
        
        <button 
          onClick={fetchStatus}
          className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-colors duration-150"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex items-center gap-4">
          <Database className="w-10 h-10 text-brand-blue" />
          <div>
            <span className="text-[9px] text-gray-500 font-mono uppercase block">Active Ingestion Pipelines</span>
            <span className="text-lg font-bold text-white mt-1 block">{data.total_feeds_tracked} time series</span>
          </div>
        </div>
        
        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-brand-green" />
          <div>
            <span className="text-[9px] text-gray-500 font-mono uppercase block">Overall Ingestion Quality</span>
            <span className="text-lg font-bold text-brand-green mt-1 block">{data.overall_health_score}% FRESH</span>
          </div>
        </div>

        <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md flex items-center gap-4">
          <ShieldAlert className="w-10 h-10 text-brand-yellow" />
          <div>
            <span className="text-[9px] text-gray-500 font-mono uppercase block">Overall Feed Status</span>
            <span className={`text-lg font-bold mt-1 block uppercase ${getStatusBadgeColor(data.status_badge).split(" ")[0]}`}>
              {data.status_badge}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Feeds Table */}
      <div className="bg-bg-card border border-gray-850 rounded-xl p-5 shadow-md">
        <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">
          Individual Time Series Diagnostics
        </h3>
        
        <div className="overflow-x-auto border border-gray-900 rounded-xl">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-gray-950/80 border-b border-gray-850 text-gray-500 uppercase text-[9px] font-semibold">
              <tr>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-3">Variable Name</th>
                <th className="py-3 px-3">Source Provider</th>
                <th className="py-3 px-3 text-center">Frequency</th>
                <th className="py-3 px-3 text-center">Last Updated</th>
                <th className="py-3 px-3 text-center">Delay</th>
                <th className="py-3 px-3 text-center font-bold">Confidence</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900 text-gray-300">
              {data.feeds.map((feed: any) => (
                <tr key={feed.symbol} className="hover:bg-gray-900/30">
                  <td className="py-2.5 px-4 font-bold text-white">{feed.symbol}</td>
                  <td className="py-2.5 px-3 font-sans text-gray-300">{feed.name}</td>
                  <td className="py-2.5 px-3 text-gray-400">{feed.source}</td>
                  <td className="py-2.5 px-3 text-center text-gray-400">{feed.frequency}</td>
                  <td className="py-2.5 px-3 text-center">{feed.last_updated}</td>
                  <td className="py-2.5 px-3 text-center text-gray-400">
                    {feed.delay_days === 0 ? "None" : `${feed.delay_days}d`}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-brand-blue">
                    {feed.confidence_score}%
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider bg-gray-900/50 border-gray-800">
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(feed.status)}`}></span>
                      {feed.message}
                    </span>
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
