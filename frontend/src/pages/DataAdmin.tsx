import React, { useState, useEffect } from "react";
import { Wrench, ShieldAlert, CheckCircle, RefreshCw, Layers, Database, Play } from "lucide-react";

export default function DataAdmin() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data-health");
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      console.error("Failed to load admin data health details", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const triggerRebuild = async () => {
    setBtnLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/rebuild-factors", {
        method: "POST"
      });
      const data = await res.json();
      setMessage(data.message || "Factor scores rebuilt successfully!");
      fetchHealth();
    } catch (e) {
      console.error("Failed to rebuild factor models", e);
      setMessage("Rebuild process failed.");
    }
    setBtnLoading(false);
  };

  const triggerUpdate = async () => {
    setBtnLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/update-data", {
        method: "POST"
      });
      const data = await res.json();
      setMessage(data.message || "Database update completed successfully!");
      fetchHealth();
    } catch (e) {
      console.error("Failed to trigger data update", e);
      setMessage("Update execution failed.");
    }
    setBtnLoading(false);
  };

  if (loading || !health) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 text-brand-green animate-spin" />
        <span className="text-xs font-mono text-gray-500">Querying DB statistics and update logs...</span>
      </div>
    );
  }

  const { status, last_update, total_active_stocks, total_price_records, annual_financial_records, quarterly_financial_records, update_logs, open_issues } = health;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-sm font-heading font-extrabold text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-brand-green" />
            <span>Database Ingestion & Maintenance Console</span>
          </h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Monitor update schedules, inspect quality flags, and trigger batch multi-factor calculations.
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl text-left">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Database Health</span>
          <span className="text-base font-bold font-mono text-brand-green mt-1.5 block flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> {status}
          </span>
          <span className="text-[8px] font-mono text-gray-600 mt-1 block">Last Update: {last_update}</span>
        </div>

        <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl text-left">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Price Records</span>
          <span className="text-base font-bold font-mono text-white mt-1.5 block">
            {total_price_records.toLocaleString()}
          </span>
          <span className="text-[8px] font-mono text-gray-600 mt-1 block">Across {total_active_stocks} stocks</span>
        </div>

        <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl text-left">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Annual Statements</span>
          <span className="text-base font-bold font-mono text-white mt-1.5 block">
            {annual_financial_records}
          </span>
          <span className="text-[8px] font-mono text-gray-600 mt-1 block">Years: 2005 - 2026</span>
        </div>

        <div className="bg-[#13151e] border border-gray-800/40 p-4 rounded-xl text-left">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Quarterly Reports</span>
          <span className="text-base font-bold font-mono text-white mt-1.5 block">
            {quarterly_financial_records}
          </span>
          <span className="text-[8px] font-mono text-gray-600 mt-1 block">Quarters: Q1 - Q4</span>
        </div>
      </div>

      {/* Action Buttons panel */}
      <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
        <h3 className="text-[10px] font-mono text-brand-blue uppercase tracking-widest font-bold border-b border-gray-850 pb-2.5">
          Batch Operations Controls
        </h3>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={triggerRebuild}
            disabled={btnLoading}
            className="px-4 py-2 bg-gradient-to-r from-brand-blue to-brand-blue/80 hover:from-brand-blue/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            Rebuild Factor Scores
          </button>

          <button
            onClick={triggerUpdate}
            disabled={btnLoading}
            className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ingest Latest Bhavcopy
          </button>
        </div>

        {message && (
          <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg text-xs text-brand-blue font-mono font-bold">
            System Log: {message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingestion logs */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
          <h3 className="text-[10px] font-mono text-white uppercase tracking-widest font-bold border-b border-gray-850 pb-3">
            System Ingestion Logs
          </h3>

          <div className="overflow-x-auto max-h-[220px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-950/40 border-b border-gray-850 font-mono text-[9px] text-gray-500">
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">Job Name</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900 font-mono text-gray-300 text-[10px]">
                {update_logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/[0.01]">
                    <td className="p-2 text-gray-400">{log.timestamp}</td>
                    <td className="p-2 font-bold">{log.job_name}</td>
                    <td className="p-2 text-center">
                      <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold tracking-wider ${
                        log.status === "Success" 
                          ? "bg-brand-green/10 text-brand-green" 
                          : "bg-brand-red/10 text-brand-red"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-2 text-gray-500 truncate max-w-[150px]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quality Issues */}
        <div className="bg-[#13151e] border border-gray-800/40 rounded-xl p-5 space-y-4">
          <h3 className="text-[10px] font-mono text-brand-red uppercase tracking-widest font-bold border-b border-gray-850 pb-3">
            Open Data Quality Exceptions
          </h3>

          {open_issues.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-600 font-semibold flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-brand-green" />
              All data files verify clean. No adjustments pending.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[220px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-950/40 border-b border-gray-850 font-mono text-[9px] text-gray-500">
                    <th className="p-2">Date</th>
                    <th className="p-2">Symbol</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Anomaly Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 font-mono text-gray-300 text-[10px]">
                  {open_issues.map((i: any) => (
                    <tr key={i.id} className="hover:bg-white/[0.01]">
                      <td className="p-2 text-gray-400">{i.date}</td>
                      <td className="p-2 font-bold text-white">{i.symbol}</td>
                      <td className="p-2 text-brand-yellow font-bold">{i.issue_type}</td>
                      <td className="p-2 text-gray-450">{i.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
