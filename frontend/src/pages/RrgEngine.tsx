import React, { useState, useEffect } from "react";
import { Play, Pause, RefreshCw, Info } from "lucide-react";

export default function RrgEngine() {
  const [universe, setUniverse] = useState("global");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trailLength, setTrailLength] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(14); // start at latest index

  const fetchRrgData = () => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/rrg?universe=${universe}`)
      .then(res => res.json())
      .then(resData => {
        setData(resData.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchRrgData();
  }, [universe]);

  // Handle animation over time
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setAnimationIndex(prev => {
          if (prev >= 14) return 0; // loop back
          return prev + 1;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
      </div>
    );
  }

  // Generate SVG path for a trail of points
  const getSvgTrailPath = (trail: any[]) => {
    if (trail.length < 2) return "";
    // Scale coordinates to fit SVG size (typically 400x400)
    // x = 100 is center. Let's map [95, 105] to [20, 380]
    const scale = (val: number) => {
      const center = 100;
      const range = 5; // offset range
      return 200 + ((val - center) / range) * 180;
    };
    
    // Slice based on animation index and trail length
    const activeTrail = trail.slice(Math.max(0, animationIndex - trailLength), animationIndex + 1);
    if (activeTrail.length === 0) return "";
    
    let path = `M ${scale(activeTrail[0].x)} ${400 - scale(activeTrail[0].y)}`;
    for (let i = 1; i < activeTrail.length; i++) {
      path += ` L ${scale(activeTrail[i].x)} ${400 - scale(activeTrail[i].y)}`;
    }
    return path;
  };

  const getCoordinatesForIndex = (trail: any[]) => {
    const pt = trail[animationIndex] || trail[trail.length - 1];
    const scale = (val: number) => {
      const center = 100;
      const range = 5;
      return 200 + ((val - center) / range) * 180;
    };
    return {
      cx: scale(pt.x),
      cy: 400 - scale(pt.y),
      label: pt.quadrant
    };
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white">RRG Rotation Engine</h2>
          <p className="text-sm text-gray-500">Relative Rotation Graphs tracking asset price momentum vectors vs benchmarks.</p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          <select 
            value={universe} 
            onChange={(e) => setUniverse(e.target.value)}
            className="bg-gray-800 text-xs font-mono text-white px-3 py-1.5 rounded border border-gray-700 focus:outline-none"
          >
            <option value="global">Global Asset Universe (vs SPY)</option>
            <option value="india">Nifty Sector Universe (vs Nifty 500)</option>
            <option value="us">S&P Sector Universe (vs SPY)</option>
          </select>
          
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs transition font-mono"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? "Pause" : "Play Trail"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RRG Scatter Box */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 lg:col-span-2 shadow-md flex flex-col items-center relative">
          <h3 className="text-md font-heading font-semibold text-white self-start mb-4">Relative Rotation Graph Scatter</h3>
          
          <div className="p-3 bg-brand-blue/5 border border-brand-blue/10 rounded-lg flex gap-2 text-xs text-brand-blue mb-4 w-full">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>Notice:</strong> This RRG is based on <strong>relative strength rotation (momentum)</strong>, not actual mutual fund/FPI flow data.
            </p>
          </div>

          {/* RRG custom SVG */}
          <div className="w-[400px] h-[400px] bg-gray-950 border border-gray-800 rounded-xl relative overflow-hidden shadow-inner">
            {/* Quadrant Titles */}
            <div className="absolute top-2 right-2 text-xs font-mono text-brand-green font-bold bg-brand-green/5 border border-brand-green/20 px-2 py-0.5 rounded">LEADING</div>
            <div className="absolute top-2 left-2 text-xs font-mono text-brand-blue font-bold bg-brand-blue/5 border border-brand-blue/20 px-2 py-0.5 rounded">IMPROVING</div>
            <div className="absolute bottom-2 left-2 text-xs font-mono text-brand-red font-bold bg-brand-red/5 border border-brand-red/20 px-2 py-0.5 rounded">LAGGING</div>
            <div className="absolute bottom-2 right-2 text-xs font-mono text-brand-yellow font-bold bg-brand-yellow/5 border border-brand-yellow/20 px-2 py-0.5 rounded">WEAKENING</div>

            <svg width="400" height="400">
              {/* Axes lines dividing quadrants */}
              <line x1="200" y1="0" x2="200" y2="400" stroke="#2e303a" strokeWidth="1.5" />
              <line x1="0" y1="200" x2="400" y2="200" stroke="#2e303a" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="200" cy="200" r="180" fill="none" stroke="#2e303a" strokeWidth="1" strokeDasharray="5 5" />
              
              {/* Plot trails and nodes */}
              {data.map((asset: any) => {
                const trailPath = getSvgTrailPath(asset.trail);
                const coords = getCoordinatesForIndex(asset.trail);
                const nodeColor = asset.current_quadrant === "Leading" ? "#00e676" : asset.current_quadrant === "Improving" ? "#29b6f6" : asset.current_quadrant === "Lagging" ? "#ff1744" : "#ffa726";

                return (
                  <g key={asset.symbol}>
                    {/* Path Trail */}
                    <path d={trailPath} fill="none" stroke={nodeColor} strokeWidth="1.5" opacity="0.4" />
                    
                    {/* End node Dot */}
                    <circle cx={coords.cx} cy={coords.cy} r="6" fill={nodeColor} className="hover:scale-150 transition-all cursor-pointer" />
                    
                    {/* Symbol text */}
                    <text x={coords.cx + 8} y={coords.cy + 3} fill="#ffffff" style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}>{asset.symbol}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Quadrant Transitions List */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
          <h3 className="text-md font-heading font-semibold text-white">Quadrant Transitions Board</h3>
          <p className="text-xs text-gray-500">Recent quadrant crossings, rotation speeds, and persistence vectors.</p>
          
          <div className="space-y-3 font-mono mt-4">
            {data.map((asset: any) => (
              <div key={asset.symbol} className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white">{asset.symbol}</span>
                  <span className="text-[10px] text-gray-500 block">Speed: {asset.speed} • Heading: {asset.angle}°</span>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    asset.current_quadrant === "Leading" ? "bg-brand-green/10 text-brand-green" : asset.current_quadrant === "Improving" ? "bg-brand-blue/10 text-brand-blue" : asset.current_quadrant === "Lagging" ? "bg-brand-red/10 text-brand-red" : "bg-brand-yellow/10 text-brand-yellow"
                  }`}>
                    {asset.current_quadrant}
                  </span>
                  <span className="text-[9px] text-gray-500 block mt-1">Consec: {asset.persistence}d</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
