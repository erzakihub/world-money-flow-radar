import React, { useState, useEffect } from "react";
import { AlertCircle, ArrowUpRight, TrendingUp } from "lucide-react";

export default function WorldRegionFlow() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/world-regions")
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
          <h2 className="text-2xl font-heading font-bold text-white">World Region Flow Map</h2>
          <p className="text-sm text-gray-500">Track capital flow indices, relative strengths, valuations, and exchange rates across major regions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* World Flow SVG Map */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md lg:col-span-2 space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">Global Capital Inflow Map</h3>
          
          <div className="w-full flex justify-center py-4 bg-gray-950/20 rounded-xl p-2 border border-gray-900 relative">
            {/* SVG Map Mock */}
            <svg className="w-full max-w-[700px] h-[300px]" viewBox="0 0 700 300">
              {/* Simplified outlines or representations of continents */}
              {/* North America */}
              <path d="M 50,60 L 150,50 L 220,110 L 160,170 L 110,140 Z" fill="#2d3748" opacity="0.3" stroke="#4a5568" />
              {/* South America */}
              <path d="M 160,180 L 200,200 L 250,290 L 190,280 Q 150,230 160,180" fill="#2d3748" opacity="0.3" stroke="#4a5568" />
              {/* Europe */}
              <path d="M 330,60 L 390,50 L 410,110 L 340,110 Z" fill="#2d3748" opacity="0.3" stroke="#4a5568" />
              {/* Asia */}
              <path d="M 400,60 L 610,60 L 650,160 Q 560,190 440,130 Z" fill="#2d3748" opacity="0.3" stroke="#4a5568" />
              {/* Africa */}
              <path d="M 340,140 Q 400,140 430,220 L 370,280 L 330,200 Z" fill="#2d3748" opacity="0.3" stroke="#4a5568" />
              {/* Australia */}
              <path d="M 570,220 L 640,220 L 620,270 Z" fill="#2d3748" opacity="0.3" stroke="#4a5568" />

              {/* Dots representing core tracked regions with color scale based on flow score */}
              {/* USA (Score: 82) -> Green */}
              <circle cx="150" cy="90" r="14" fill="rgba(0, 230, 118, 0.2)" stroke="#00e676" strokeWidth="2" className="animate-pulse" />
              <text x="150" y="93" fill="#ffffff" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>US</text>

              {/* Europe (Score: 45) -> Blue */}
              <circle cx="365" cy="80" r="14" fill="rgba(41, 182, 246, 0.2)" stroke="#29b6f6" strokeWidth="2" />
              <text x="365" y="83" fill="#ffffff" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'monospace' }}>EU</text>

              {/* Japan (Score: 55.2) -> Blue */}
              <circle cx="610" cy="110" r="14" fill="rgba(41, 182, 246, 0.2)" stroke="#29b6f6" strokeWidth="2" />
              <text x="610" y="113" fill="#ffffff" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'monospace' }}>JP</text>

              {/* China (Score: 38) -> Yellow */}
              <circle cx="510" cy="115" r="14" fill="rgba(255, 167, 38, 0.2)" stroke="#ffa726" strokeWidth="2" />
              <text x="510" y="118" fill="#ffffff" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'monospace' }}>CN</text>

              {/* India (Score: 78.5) -> Green */}
              <circle cx="480" cy="145" r="14" fill="rgba(0, 230, 118, 0.2)" stroke="#00e676" strokeWidth="2" className="animate-pulse" />
              <text x="480" y="148" fill="#ffffff" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>IN</text>

              {/* Brazil (Score: 42.1) -> Yellow */}
              <circle cx="210" cy="220" r="14" fill="rgba(255, 167, 38, 0.2)" stroke="#ffa726" strokeWidth="2" />
              <text x="210" y="223" fill="#ffffff" textAnchor="middle" style={{ fontSize: 9, fontFamily: 'monospace' }}>BR</text>
            </svg>
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-800 p-2 rounded text-[10px] font-mono text-gray-400 space-y-1">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand-green"></span>Score &gt; 70 (Strong Inflow)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand-blue"></span>Score 50-70 (Improving)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand-yellow"></span>Score &lt; 50 (Underperform)</div>
            </div>
          </div>
        </div>

        {/* Currency confirmation panels */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">Currency Confirmation Feed</h3>
          <p className="text-xs text-gray-500">Strong dollar environments act as headwinds for emerging market inflows.</p>
          
          <div className="space-y-3 font-mono mt-4">
            <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase block">US Dollar Index (DXY)</span>
                <span className="text-sm font-semibold text-white mt-1">{data.currency_panel.dxy_trend}</span>
              </div>
              <span className="text-xs text-brand-red font-semibold">Inflow Headwind</span>
            </div>
            
            <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase block">EM Currency Index</span>
                <span className="text-sm font-semibold text-white mt-1">{data.currency_panel.em_currency_index}</span>
              </div>
              <span className="text-xs text-brand-yellow font-semibold">Under Pressure</span>
            </div>
            
            <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase block">USD / INR Exchange Rate</span>
                <span className="text-sm font-semibold text-white mt-1">{data.currency_panel.inr_usd}</span>
              </div>
              <span className="text-xs text-brand-green font-semibold">Stable Range</span>
            </div>
          </div>

          <div className="p-3 bg-brand-yellow/5 border border-brand-yellow/10 rounded-lg flex gap-2 text-xs text-brand-yellow">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>Macro Rule Alert:</strong> Rising DXY diminishes emerging market currency returns even if equity index prices tick upwards.
            </p>
          </div>
        </div>
      </div>

      {/* Region Ranking Table */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-md font-heading font-semibold text-white mb-4">World Region Allocation Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-gray-800 text-gray-500 uppercase">
              <tr>
                <th className="py-2.5">Region</th>
                <th>Flow Status</th>
                <th>Valuation Context</th>
                <th>Currency strength</th>
                <th>Confidence Rating</th>
                <th className="text-right">Composite flow Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {data.regions.map((reg: any) => (
                <tr key={reg.id} className="hover:bg-gray-900/30">
                  <td className="py-3 font-semibold text-white">{reg.name}</td>
                  <td>{reg.flow}</td>
                  <td className="text-gray-400">{reg.valuation}</td>
                  <td>{reg.currency}</td>
                  <td>{reg.confidence}</td>
                  <td className={`text-right font-semibold text-sm ${
                    reg.score >= 70 ? "text-brand-green" : reg.score >= 50 ? "text-brand-blue" : "text-brand-yellow"
                  }`}>
                    {reg.score}
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
