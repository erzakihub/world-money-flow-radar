import React, { useState, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  TrendingUp, 
  ArrowRight, 
  Globe, 
  Zap, 
  ShieldAlert,
  Ship,
  Sparkles
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface Flow {
  id: string;
  category: string;
  source: string;
  target: string;
  source_coords: [number, number]; // [lon, lat]
  target_coords: [number, number]; // [lon, lat]
  value: string;
  growth: string;
  status: string;
  hot_items: string[];
  shippers: string[];
  geopolitics: string;
  risk_score: number;
}

export default function TradeFlowMap() {
  const [data, setData] = useState<{ categories: { id: string; name: string }[]; flows: Flow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const linesRef = useRef<Record<string, L.Polyline>>({});
  const markersRef = useRef<Record<string, L.CircleMarker>>({});
  const flowPulseMarkerRef = useRef<L.Marker | null>(null);
  
  // Animation state
  const [pulseIndex, setPulseIndex] = useState(0);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/trade-flows")
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        if (resData.flows && resData.flows.length > 0) {
          setSelectedFlowId(resData.flows[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load trade flows", err);
        setLoading(false);
      });
  }, []);

  const filteredFlows = useMemo(() => {
    if (!data) return [];
    if (activeCategory === "all") return data.flows;
    return data.flows.filter(f => f.category === activeCategory);
  }, [data, activeCategory]);

  const selectedFlow = useMemo(() => {
    if (!data) return null;
    return data.flows.find(f => f.id === selectedFlowId) || data.flows[0];
  }, [data, selectedFlowId]);

  // Generate quadratic Bezier points between source and target for Leaflet
  const getBezierPoints = (source: [number, number], target: [number, number], steps = 40): [number, number][] => {
    const [slon, slat] = source;
    const [tlon, tlat] = target;
    
    // Midpoint
    const mlat = (slat + tlat) / 2;
    const mlon = (slon + tlon) / 2;
    
    // Calculate an offset perpendicular to the segment to create a nice arc
    const dlat = tlat - slat;
    const dlon = tlon - slon;
    const dist = Math.sqrt(dlat * dlat + dlon * dlon);
    
    // Perpendicular vector
    const px = -dlon;
    const py = dlat;
    
    // Normalize and scale perpendicular offset
    const len = Math.sqrt(px * px + py * py);
    const scale = Math.max(10, dist * 0.25);
    
    const offsetLat = mlat + (py / (len || 1)) * scale;
    const offsetLon = mlon + (px / (len || 1)) * scale;
    
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      const lat = (1 - t) * (1 - t) * slat + 2 * (1 - t) * t * offsetLat + t * t * tlat;
      const lon = (1 - t) * (1 - t) * slon + 2 * (1 - t) * t * offsetLon + t * t * tlon;
      
      points.push([lat, lon]);
    }
    return points;
  };

  // Bezier points of the selected flow path
  const selectedFlowBezierPoints = useMemo(() => {
    if (!selectedFlow) return [];
    return getBezierPoints(selectedFlow.source_coords, selectedFlow.target_coords);
  }, [selectedFlow]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 10],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false
    });

    // High quality Esri Satellite World Imagery tile layer
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 18,
      attribution: "Tiles &copy; Esri"
    }).addTo(map);

    mapRef.current = map;

    // Resolve Leaflet sizing issues on mount
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading]);

  // Animate the pulse indicator along the active Bezier path
  useEffect(() => {
    if (selectedFlowBezierPoints.length === 0) return;

    const interval = setInterval(() => {
      setPulseIndex(prev => (prev + 1) % selectedFlowBezierPoints.length);
    }, 60);

    return () => clearInterval(interval);
  }, [selectedFlowBezierPoints]);

  // Draw trade routes, markers and flow animations
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;

    // 1. Clear old overlays
    Object.values(linesRef.current).forEach(l => l.remove());
    Object.values(markersRef.current).forEach(m => m.remove());
    if (flowPulseMarkerRef.current) {
      flowPulseMarkerRef.current.remove();
      flowPulseMarkerRef.current = null;
    }
    linesRef.current = {};
    markersRef.current = {};

    // 2. Draw all trade route arcs
    filteredFlows.forEach(flow => {
      const pathPoints = getBezierPoints(flow.source_coords, flow.target_coords);
      const isSelected = flow.id === selectedFlowId;

      const poly = L.polyline(pathPoints, {
        color: isSelected ? "#00e676" : "#29b6f6",
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 0.95 : 0.4,
      }).addTo(map);

      poly.on("click", () => {
        setSelectedFlowId(flow.id);
      });

      linesRef.current[flow.id] = poly;

      // Draw anchor circles
      const sLatLg: [number, number] = [flow.source_coords[1], flow.source_coords[0]];
      const tLatLg: [number, number] = [flow.target_coords[1], flow.target_coords[0]];

      const sourceMarker = L.circleMarker(sLatLg, {
        radius: isSelected ? 6 : 4,
        fillColor: "#00e676",
        fillOpacity: 0.9,
        color: "#ffffff",
        weight: 1
      }).addTo(map);
      
      sourceMarker.on("click", () => setSelectedFlowId(flow.id));
      markersRef.current[`s-${flow.id}`] = sourceMarker;

      const targetMarker = L.circleMarker(tLatLg, {
        radius: isSelected ? 6 : 4,
        fillColor: "#29b6f6",
        fillOpacity: 0.9,
        color: "#ffffff",
        weight: 1
      }).addTo(map);

      targetMarker.on("click", () => setSelectedFlowId(flow.id));
      markersRef.current[`t-${flow.id}`] = targetMarker;
    });
  }, [data, filteredFlows, selectedFlowId]);

  // Handle flow pulse positioning and map centering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedFlow || selectedFlowBezierPoints.length === 0) return;

    // Center map on selected flow path
    const [slon, slat] = selectedFlow.source_coords;
    const [tlon, tlat] = selectedFlow.target_coords;
    map.fitBounds([
      [slat, slon],
      [tlat, tlon]
    ], { padding: [50, 50], maxZoom: 4 });

    // Update pulsing marker position
    if (flowPulseMarkerRef.current) {
      flowPulseMarkerRef.current.remove();
    }

    const currentPt = selectedFlowBezierPoints[pulseIndex];
    if (currentPt) {
      const icon = L.divIcon({
        className: "custom-leaflet-pulse",
        html: `
          <div style="
            width: 14px; 
            height: 14px; 
            background-color: #00e676; 
            border: 2px solid #ffffff; 
            border-radius: 50%;
            box-shadow: 0 0 12px #00e676;
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      flowPulseMarkerRef.current = L.marker([currentPt[0], currentPt[1]], { icon }).addTo(map);
    }
  }, [selectedFlow, pulseIndex, selectedFlowBezierPoints]);

  // Generate pricing trend data for selected trade flow item
  const mockPriceHistory = useMemo(() => {
    const points = [];
    const base = selectedFlow ? 100 + selectedFlow.risk_score * 0.5 : 120;
    for (let i = 0; i < 12; i++) {
      points.push({
        month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
        price: Math.round(base * (1 + (Math.sin(i * 0.6) * 0.15 + (i * 0.02))))
      });
    }
    return points;
  }, [selectedFlow]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-green"></div>
          <span className="text-xs font-mono text-gray-500">Decrypting satellite trade logs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-brand-green/10 text-brand-green text-[10px] font-mono uppercase tracking-wider animate-pulse">
              Live Sat-Trade Stream
            </span>
            <span className="text-[10px] text-gray-600 font-mono">
              Tile Layer: Esri World Imagery (Satellite)
            </span>
          </div>
          <h2 className="text-2xl font-heading font-bold text-white mt-1">High-Value Global Trade Flows</h2>
          <p className="text-sm text-gray-500">Visualizing high-value physical goods moving across critical corridors with real-time geopolitical risk evaluation.</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto bg-gray-900/60 border border-gray-800 p-2 rounded-lg font-mono text-xs text-gray-400">
          <Sparkles className="w-3.5 h-3.5 text-brand-green" />
          <span>Active Nodes tracked: <strong className="text-white">1,402</strong></span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Side: Filter Categories & Feed List */}
        <div className="xl:col-span-3 space-y-4 flex flex-col h-[650px] overflow-hidden">
          {/* Categories Tab selector */}
          <div className="bg-bg-card border border-gray-800/80 rounded-xl p-4 space-y-3 shrink-0">
            <span className="text-[10px] text-gray-500 font-mono font-semibold uppercase tracking-wider block">Trade Categories</span>
            <div className="flex flex-wrap gap-1.5">
              {data.categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    // Auto select first of category
                    const matched = data.flows.find(f => cat.id === "all" || f.category === cat.id);
                    if (matched) setSelectedFlowId(matched.id);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeCategory === cat.id
                      ? "bg-white/[0.04] text-white border border-gray-800"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.01] border border-transparent"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* List of active corridors */}
          <div className="bg-bg-card border border-gray-800/80 rounded-xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800/40 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-gray-500 font-mono font-semibold uppercase tracking-wider">Corridors ({filteredFlows.length})</span>
              <span className="text-[10px] text-gray-600 font-mono">Value</span>
            </div>
            
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {filteredFlows.map(flow => {
                const isSelected = selectedFlowId === flow.id;
                return (
                  <button
                    key={flow.id}
                    onClick={() => setSelectedFlowId(flow.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-brand-green/[0.02] border-brand-green/30 shadow-sm"
                        : "bg-gray-900/10 border-gray-800/60 hover:bg-gray-900/30"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 capitalize">{flow.category.replace("_", " ")}</span>
                        <div className="text-xs font-semibold text-white mt-0.5 flex items-center gap-1.5">
                          <span>{flow.source}</span>
                          <ArrowRight className="w-3 h-3 text-gray-600" />
                          <span>{flow.target}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-semibold text-brand-green">{flow.value}</span>
                    </div>

                    <div className="flex justify-between items-center mt-3 text-[10px] font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                        flow.risk_score > 70 
                          ? "bg-brand-red/10 text-brand-red border border-brand-red/20" 
                          : flow.risk_score > 40 
                            ? "bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20"
                            : "bg-brand-green/10 text-brand-green border border-brand-green/20"
                      }`}>
                        Risk: {flow.risk_score}
                      </span>
                      <span className="text-gray-400">{flow.growth} growth</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Leaflet Sat Map */}
        <div className="xl:col-span-6 bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md flex flex-col justify-between h-[650px]">
          <div className="flex justify-between items-center mb-4 border-b border-gray-800/40 pb-3 shrink-0">
            <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-blue" />
              Global Corridors Satellite Map
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">
              Equirectangular projected Bezier flows
            </span>
          </div>

          <div className="relative w-full flex-1 bg-[#090b10] border border-gray-900 rounded-xl overflow-hidden min-h-[350px]">
            <div ref={mapContainerRef} style={{ height: "450px", width: "100%" }} className="z-0"></div>

            {/* Float HUD legend overlay */}
            <div className="absolute bottom-4 left-4 bg-gray-950/80 border border-gray-800 p-2.5 rounded-lg text-[9px] font-mono text-gray-400 space-y-1 z-[1000] pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-green shadow-[0_0_8px_#00e676]"></span>
                <span>Source Node (Producer)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue shadow-[0_0_8px_#29b6f6]"></span>
                <span>Target Node (Consumer)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-0.5 bg-brand-green"></span>
                <span>Active Flow Pulse</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid footer */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800/40 font-mono text-[10px] text-gray-400 shrink-0">
            <div>
              <span className="block text-gray-600">SELECTED ORIGIN</span>
              <span className="text-white font-semibold block mt-0.5 truncate">{selectedFlow?.source}</span>
            </div>
            <div>
              <span className="block text-gray-600">SELECTED TARGET</span>
              <span className="text-white font-semibold block mt-0.5 truncate">{selectedFlow?.target}</span>
            </div>
            <div>
              <span className="block text-gray-600">LOGISTICS VELOCITY</span>
              <span className="text-brand-green font-semibold block mt-0.5">{selectedFlow?.growth} MoM</span>
            </div>
          </div>
        </div>

        {/* Right Side: Geopolitical Risks & Pricing Impact Details */}
        <div className="xl:col-span-3 space-y-6 h-[650px] overflow-y-auto">
          {/* Selected Corridor Overview */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-heading font-semibold text-white border-b border-gray-800/40 pb-2">
              Corridor Intelligence
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Route Status:</span>
                <span className="text-brand-green font-semibold">{selectedFlow?.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Annual Value:</span>
                <span className="text-white font-semibold">{selectedFlow?.value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Growth Index:</span>
                <span className="text-white font-semibold">{selectedFlow?.growth}</span>
              </div>
            </div>
          </div>

          {/* Geopolitics Card */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-brand-yellow" />
              Security & Chokepoint Risk
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-gray-500 font-mono block">GEOPOLITICAL THREAT METRIC</span>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-1 h-2 rounded bg-gray-800 overflow-hidden">
                    <div 
                      className={`h-full rounded transition-all duration-500 ${
                        (selectedFlow?.risk_score ?? 0) > 70 
                          ? "bg-brand-red" 
                          : (selectedFlow?.risk_score ?? 0) > 40 
                            ? "bg-brand-yellow"
                            : "bg-brand-green"
                      }`}
                      style={{ width: `${selectedFlow?.risk_score ?? 0}%` }}
                    ></div>
                  </div>
                  <span className={`font-mono text-xs font-bold ${
                    (selectedFlow?.risk_score ?? 0) > 70 ? "text-brand-red" : "text-brand-yellow"
                  }`}>{selectedFlow?.risk_score}/100</span>
                </div>
              </div>

              <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg text-xs font-mono text-gray-400 leading-relaxed">
                {selectedFlow?.geopolitics}
              </div>
            </div>
          </div>

          {/* Shipped Goods */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-2">
              <Ship className="w-4 h-4 text-brand-blue" />
              High-Value Bill of Lading
            </h3>

            <div className="space-y-1.5 font-mono text-xs text-gray-300">
              {selectedFlow?.hot_items.map((item, idx) => (
                <div key={idx} className="p-2 bg-gray-900/40 border border-gray-800/60 rounded flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-gray-500 font-mono block mb-1">KEY LOGISTICS PROVIDERS</span>
              <p className="text-xs text-white font-mono">{selectedFlow?.shippers.join(", ")}</p>
            </div>
          </div>

          {/* Price index impact */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-brand-green" />
              Spot Price Index Trend
            </h3>
            <span className="text-[10px] text-gray-500 font-mono block">Related Asset Class Cost index (12M)</span>
            
            <div className="h-[90px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockPriceHistory} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="miniColorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e676" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#6b7280" tickLine={false} style={{ fontSize: 8, fontFamily: 'monospace' }} />
                  <YAxis stroke="#6b7280" tickLine={false} style={{ fontSize: 8, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ background: '#12141d', border: '1px solid #2e303a', fontSize: 10, fontFamily: 'monospace', color: '#fff' }} />
                  <Area type="monotone" dataKey="price" stroke="#00e676" strokeWidth={1.5} fillOpacity={1} fill="url(#miniColorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
