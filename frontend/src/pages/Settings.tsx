import React, { useState } from "react";
import { Upload, HelpCircle, ToggleLeft, ToggleRight, Check } from "lucide-react";

export default function Settings() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState("NSDL");
  const [uploadStatus, setUploadStatus] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const [modes, setModes] = useState<any>({
    india_heavy: true,
    global_macro: true,
    crypto_liquidity: true,
    professional_mode: false
  });

  const handleToggle = (key: string) => {
    setModes({ ...modes, [key]: !modes[key] });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source_type", sourceType);

      const res = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setUploadStatus(data);
    } catch (err) {
      console.error(err);
      setUploadStatus({ status: "Error", message: "Failed to upload and parse file." });
    }
    setUploading(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">System Settings & Data Ingestion</h2>
          <p className="text-sm text-gray-500">Configure dashboard focus modes, currency benchmarks, and upload FPI/AMFI spreadsheets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Ingestions Inward Uploader */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4 lg:col-span-2">
          <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand-green" />
            <span>Manual Spreadsheet Ingestion</span>
          </h3>
          <p className="text-xs text-gray-500">Upload reports when direct API endpoints are restricted or for bespoke offline validations (NSDL daily capital indices, AMFI mutual fund assets).</p>
          
          <form onSubmit={handleUpload} className="space-y-4 pt-2 font-mono text-xs">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1 w-1/3">
                <label className="text-gray-500 uppercase">Report Category</label>
                <select 
                  value={sourceType} 
                  onChange={(e) => setSourceType(e.target.value)}
                  className="bg-gray-900 border border-gray-800 p-2.5 rounded text-white focus:outline-none"
                >
                  <option value="NSDL">NSDL FPI Flow Reports</option>
                  <option value="AMFI">AMFI Mutual Fund Category AUM</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 flex-1">
                <label className="text-gray-500 uppercase">Select File (CSV/XLSX)</label>
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="bg-gray-900 border border-gray-800 p-2 rounded text-white focus:outline-none"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={!file || uploading}
              className="px-4 py-2 bg-brand-green hover:bg-brand-green/95 disabled:bg-gray-800 text-gray-950 font-bold rounded text-xs transition font-mono uppercase cursor-pointer"
            >
              {uploading ? "Ingesting..." : "Ingest Document"}
            </button>
          </form>

          {/* Integration Status Receipts */}
          {uploadStatus && (
            <div className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-2.5 mt-4 ${
              uploadStatus.status === "Success" ? "bg-brand-green/10 border-brand-green/20 text-brand-green" : "bg-brand-red/10 border-brand-red/20 text-brand-red"
            }`}>
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase block">{uploadStatus.status}</span>
                <p className="text-gray-300 mt-1 leading-relaxed">{uploadStatus.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Global Focus Toggles */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">Dashboard Preferences</h3>
          <p className="text-xs text-gray-500">Configure active pipelines and weights focus models.</p>
          
          <div className="space-y-4 font-mono text-xs mt-4">
            <div className="flex items-center justify-between p-2.5 bg-gray-900/40 rounded border border-gray-800/80">
              <div>
                <span className="font-semibold text-gray-200 block">India-Heavy Focus Mode</span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">Expands Nifty sectors & FPI displays</span>
              </div>
              <button onClick={() => handleToggle("india_heavy")} className="text-gray-400 hover:text-white">
                {modes.india_heavy ? <ToggleRight className="w-7 h-7 text-brand-green" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-gray-900/40 rounded border border-gray-800/80">
              <div>
                <span className="font-semibold text-gray-200 block">Global Macro Indicators</span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">Integrates Federal Reserve & ECB feeds</span>
              </div>
              <button onClick={() => handleToggle("global_macro")} className="text-gray-400 hover:text-white">
                {modes.global_macro ? <ToggleRight className="w-7 h-7 text-brand-green" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-gray-900/40 rounded border border-gray-800/80">
              <div>
                <span className="font-semibold text-gray-200 block">Crypto Liquidity Pipeline</span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">Tracks Tether, USDC, & Spot ETFs</span>
              </div>
              <button onClick={() => handleToggle("crypto_liquidity")} className="text-gray-400 hover:text-white">
                {modes.crypto_liquidity ? <ToggleRight className="w-7 h-7 text-brand-green" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
