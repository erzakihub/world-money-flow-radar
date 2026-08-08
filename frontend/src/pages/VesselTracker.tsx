import React, { useState, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { 
  Anchor, 
  Compass, 
  Clock, 
  AlertTriangle,
  Ship,
  Navigation,
  Globe,
  Waves,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";

interface Chokepoint {
  id: string;
  name: string;
  coords: [number, number]; // [lon, lat]
  status: string;
  vessel_count: number;
  avg_wait: string;
  congestion: string;
}

interface Vessel {
  id: string;
  name: string;
  type: string;
  origin: string;
  destination: string;
  speed: string;
  capacity: string;
  load: string;
  status: string;
  coords: [number, number]; // [lon, lat]
  path: [number, number][]; // [[lon, lat], ...]
  last_24h: [number, number][]; // [[lon, lat], ...]
}

export default function VesselTracker() {
  const [data, setData] = useState<{ chokepoints: Chokepoint[]; vessels: Vessel[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  // Map & Animation Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const chokepointsRef = useRef<Record<string, L.CircleMarker>>({});
  const routesRef = useRef<Record<string, L.Polyline>>({});
  const traceLineRef = useRef<L.Polyline | null>(null);
  const playbackMarkerRef = useRef<L.Marker | null>(null);

  // Playback Animation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0); // 0 to 100 (%)
  const animationIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/vessel-tracker")
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        if (resData.vessels && resData.vessels.length > 0) {
          setSelectedVesselId(resData.vessels[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch vessel tracker data", err);
        setLoading(false);
      });
  }, []);

  const selectedVessel = useMemo(() => {
    if (!data) return null;
    return data.vessels.find(v => v.id === selectedVesselId) || data.vessels[0];
  }, [data, selectedVesselId]);

  // Interpolate coordinate along the last 24h path based on a percentage (0 - 100)
  const interpolatedPlaybackCoord = useMemo(() => {
    if (!selectedVessel || selectedVessel.last_24h.length === 0) return null;
    const points = selectedVessel.last_24h;
    if (points.length === 1) return points[0];
    
    const t = playbackTime / 100;
    const totalSegments = points.length - 1;
    const rawIndex = t * totalSegments;
    const index = Math.min(Math.floor(rawIndex), totalSegments - 1);
    const fraction = rawIndex - index;
    
    const [lonA, latA] = points[index];
    const [lonB, latB] = points[index + 1];
    
    return [
      lonA + (lonB - lonA) * fraction,
      latA + (latB - latA) * fraction
    ] as [number, number];
  }, [selectedVessel, playbackTime]);

  // Initialize Map
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current) return;

    // Create Map centered on Atlantic Ocean to capture major flows
    const map = L.map(mapContainerRef.current, {
      center: [15, -15],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false
    });

    // High quality Esri Satellite World Imagery
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 18,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
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

  // Handle Playback Interval
  const startPlayback = () => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    setIsPlaying(true);
    
    animationIntervalRef.current = setInterval(() => {
      setPlaybackTime(prev => {
        if (prev >= 100) {
          clearInterval(animationIntervalRef.current!);
          setIsPlaying(false);
          return 100;
        }
        return prev + 2; // Speed step size
      });
    }, 45); // Fast sweep interval (~2 seconds total)
  };

  const pausePlayback = () => {
    if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    setIsPlaying(false);
  };

  const resetPlayback = () => {
    pausePlayback();
    setPlaybackTime(0);
  };

  useEffect(() => {
    // Reset playback when selected vessel changes
    resetPlayback();
  }, [selectedVesselId]);

  // Draw Overlay Elements (Vessels, Routes, Chokepoints)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;

    // 1. Clear old layers
    Object.values(markersRef.current).forEach(m => m.remove());
    Object.values(chokepointsRef.current).forEach(c => c.remove());
    Object.values(routesRef.current).forEach(r => r.remove());
    markersRef.current = {};
    chokepointsRef.current = {};
    routesRef.current = {};

    // 2. Draw shipping lanes for all vessels
    data.vessels.forEach(vessel => {
      const latLns = vessel.path.map(pt => [pt[1], pt[0]] as [number, number]);
      const isSelected = vessel.id === selectedVesselId;
      
      const poly = L.polyline(latLns, {
        color: isSelected ? "#00e676" : "#2196f3",
        weight: isSelected ? 2 : 1,
        opacity: isSelected ? 0.7 : 0.25,
        dashArray: isSelected ? "4 4" : "3 6"
      }).addTo(map);
      
      routesRef.current[vessel.id] = poly;
    });

    // 3. Draw chokepoint hotspots
    data.chokepoints.forEach(cp => {
      const latLng: [number, number] = [cp.coords[1], cp.coords[0]];
      const isCritical = cp.congestion === "Critical";
      
      const circle = L.circleMarker(latLng, {
        radius: isCritical ? 10 : 7,
        fillColor: isCritical ? "#ff1744" : "#ffa726",
        fillOpacity: 0.35,
        color: isCritical ? "#ff1744" : "#ffa726",
        weight: 1.5,
      }).addTo(map);

      circle.bindTooltip(`<strong>${cp.name}</strong><br/>Congestion: ${cp.congestion}<br/>Vessels: ${cp.vessel_count}`, {
        direction: "top",
        className: "leaflet-tooltip-dark"
      });

      chokepointsRef.current[cp.id] = circle;
    });

    // 4. Draw active vessels
    data.vessels.forEach(vessel => {
      const latLng: [number, number] = [vessel.coords[1], vessel.coords[0]];
      const isSelected = vessel.id === selectedVesselId;

      // Custom HTML Marker using raw SVG
      const icon = L.divIcon({
        className: "custom-leaflet-ship",
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div style="
              width: ${isSelected ? "22px" : "16px"}; 
              height: ${isSelected ? "22px" : "16px"}; 
              background-color: ${isSelected ? "#29b6f6" : "#00e676"}; 
              border: 2px solid #ffffff; 
              border-radius: 50%;
              box-shadow: 0 0 10px ${isSelected ? "#29b6f6" : "#00e676"};
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease;
            ">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="#ffffff" style="transform: rotate(45deg);">
                <path d="M12 2L4 21h8l2-7h-2l-2-2h4l4 9z"/>
              </svg>
            </div>
            ${isSelected ? `
              <span style="
                margin-top: 4px;
                background-color: rgba(10, 11, 15, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #ffffff;
                font-family: monospace;
                font-size: 8px;
                font-weight: bold;
                padding: 1px 4px;
                border-radius: 3px;
                white-space: nowrap;
                pointer-events: none;
              ">${vessel.name}</span>
            ` : ""}
          </div>
        `,
        iconSize: [60, 40],
        iconAnchor: [30, 20]
      });

      const marker = L.marker(latLng, { icon }).addTo(map);
      marker.on("click", () => {
        setSelectedVesselId(vessel.id);
      });

      markersRef.current[vessel.id] = marker;
    });

  }, [data, selectedVesselId]);

  // Center Map & Draw Trailing Trace on Vessel selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVessel) return;

    // 1. Pan to selected vessel, keeping current zoom level (or use zoom 2 if zoomed out too far)
    const currentZoom = map.getZoom();
    const targetZoom = currentZoom < 2 ? 2 : currentZoom;
    map.setView([selectedVessel.coords[1], selectedVessel.coords[0]], targetZoom, {
      animate: true,
      duration: 1.0
    });

    // 2. Clear old 24h trace lines
    if (traceLineRef.current) {
      traceLineRef.current.remove();
      traceLineRef.current = null;
    }

    // 3. Draw 24-hour trace route polyline
    const traceLatLns = selectedVessel.last_24h.map(pt => [pt[1], pt[0]] as [number, number]);
    traceLineRef.current = L.polyline(traceLatLns, {
      color: "#00e676",
      weight: 3.5,
      opacity: 0.9,
      lineCap: "round"
    }).addTo(map);

  }, [selectedVessel]);

  // Draw/Update Playback Marker Position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedVessel) return;

    // 1. Remove old playback marker if it exists
    if (playbackMarkerRef.current) {
      playbackMarkerRef.current.remove();
      playbackMarkerRef.current = null;
    }

    // 2. Draw current interpolated position if playback has progressed
    if (playbackTime > 0 && interpolatedPlaybackCoord) {
      const latLng: [number, number] = [interpolatedPlaybackCoord[1], interpolatedPlaybackCoord[0]];

      const icon = L.divIcon({
        className: "playback-marker",
        html: `
          <div style="
            width: 26px;
            height: 26px;
            background-color: #ff1744;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 15px #ff1744;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: pulse-glow 1s infinite alternate;
          ">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="#ffffff">
              <path d="M12 2L4 21h8l2-7h-2l-2-2h4l4 9z"/>
            </svg>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      playbackMarkerRef.current = L.marker(latLng, { icon }).addTo(map);
    }
  }, [playbackTime, interpolatedPlaybackCoord, selectedVessel]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-blue"></div>
          <span className="text-xs font-mono text-gray-500">Connecting to global AIS receiver network...</span>
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
            <span className="px-2 py-0.5 rounded bg-brand-blue/10 text-brand-blue text-[10px] font-mono uppercase tracking-wider animate-pulse">
              Live Sat-AIS Stream
            </span>
            <span className="text-[10px] text-gray-600 font-mono">
              Tile Layer: Esri World Imagery (Satellite)
            </span>
          </div>
          <h2 className="text-2xl font-heading font-bold text-white mt-1">Satellite Shipping Routes & AIS Vessel Tracker</h2>
          <p className="text-sm text-gray-500">Monitoring real-time maritime shipping lanes, dry bulk cargo vessels, crude tankers, and critical transit canals.</p>
        </div>
        <div className="flex items-center gap-2.5 bg-gray-900/60 border border-gray-800 p-2.5 rounded-lg text-xs font-mono text-gray-400">
          <Waves className="w-4 h-4 text-brand-blue" />
          <span>Vessels Transiting: <strong className="text-white">{data.vessels.length}</strong></span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left column: Vessels List & Chokepoint Alerts */}
        <div className="xl:col-span-3 space-y-4 flex flex-col h-[650px] overflow-hidden">
          {/* Active Vessels Feed */}
          <div className="bg-bg-card border border-gray-800/85 rounded-xl flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-800/40 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-gray-500 font-mono font-semibold uppercase tracking-wider">Fleet Registry</span>
              <span className="text-[10px] text-gray-600 font-mono">Speed</span>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {data.vessels.map(vessel => {
                const isSelected = selectedVesselId === vessel.id;
                return (
                  <button
                    key={vessel.id}
                    onClick={() => setSelectedVesselId(vessel.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-brand-blue/[0.02] border-brand-blue/30 shadow-sm"
                        : "bg-gray-900/10 border-gray-800/60 hover:bg-gray-900/30"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Ship className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span>{vessel.name}</span>
                        </div>
                        <span className="text-[9px] font-mono text-gray-500 block mt-1 uppercase">{vessel.type}</span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-brand-blue">{vessel.speed}</span>
                    </div>

                    <div className="flex justify-between items-center mt-3 text-[10px] font-mono">
                      <span className="text-gray-400 truncate max-w-[130px]">→ {vessel.destination.split(",")[0]}</span>
                      <span className="text-brand-green font-semibold">{vessel.load} Cap</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chokepoint Alerts */}
          <div className="bg-bg-card border border-gray-800/85 rounded-xl p-4 shrink-0 space-y-3">
            <span className="text-[10px] text-gray-500 font-mono font-semibold uppercase tracking-wider block">Maritime Chokepoints</span>
            <div className="space-y-2">
              {data.chokepoints.map(cp => (
                <div key={cp.id} className="p-2.5 bg-gray-950/40 border border-gray-855 rounded flex justify-between items-center font-mono text-[10px]">
                  <div>
                    <span className="text-white font-semibold block">{cp.name}</span>
                    <span className={`text-[9px] mt-0.5 block ${
                      cp.congestion === "Critical" ? "text-brand-red font-bold" : "text-brand-yellow"
                    }`}>{cp.status} ({cp.congestion})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-semibold block">{cp.vessel_count} Ships</span>
                    <span className="text-gray-500 text-[9px] block">Wait: {cp.avg_wait}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Live Global Sat-AIS Map */}
        <div className="xl:col-span-6 bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md flex flex-col justify-between h-[650px]">
          <div className="flex justify-between items-center mb-4 border-b border-gray-800/40 pb-3 shrink-0">
            <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-brand-green" />
              AIS Satellite Radar View
            </h3>
            
            {/* Trace Playback HUD */}
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1.5 font-mono text-xs">
              <span className="text-gray-400 px-1.5">24H Travel Playback:</span>
              
              <button 
                onClick={isPlaying ? pausePlayback : startPlayback}
                className="p-1 rounded bg-brand-blue text-white hover:bg-brand-blue/90 flex items-center justify-center"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              
              <button 
                onClick={resetPlayback}
                className="p-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 flex items-center justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <span className="text-brand-blue font-bold px-1.5 min-w-[32px] text-right">{playbackTime}%</span>
            </div>
          </div>

          {/* Leaflet Map Area */}
          <div className="relative w-full flex-1 bg-gray-950 border border-gray-900 rounded-xl overflow-hidden min-h-[350px]">
            <div ref={mapContainerRef} style={{ height: "450px", width: "100%" }} className="z-0"></div>

            {/* Float HUD overlay */}
            <div className="absolute bottom-4 left-4 bg-gray-950/80 border border-gray-800 p-2.5 rounded-lg text-[9px] font-mono text-gray-400 space-y-1 z-[1000] pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue shadow-[0_0_8px_#29b6f6]"></span>
                <span>Active Cargo Ship / Tanker</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-green shadow-[0_0_8px_#00e676]"></span>
                <span>Vessel En Route</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-brand-green"></span>
                <span>24h Trailing Track</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-red shadow-[0_0_8px_#ff1744]"></span>
                <span>24H Playback Head</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-brand-red bg-brand-red/10 animate-ping"></span>
                <span>Canal / Strait Chokepoint (Alarm)</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid footer */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800/40 font-mono text-[10px] text-gray-400 shrink-0">
            <div>
              <span className="block text-gray-600">POSITION LAT/LON</span>
              <span className="text-white font-semibold block mt-0.5">
                {selectedVessel?.coords[1].toFixed(4)}° N, {selectedVessel?.coords[0].toFixed(4)}° E
              </span>
            </div>
            <div>
              <span className="block text-gray-600">SPEED OVER GROUND</span>
              <span className="text-brand-blue font-semibold block mt-0.5">{selectedVessel?.speed}</span>
            </div>
            <div>
              <span className="block text-gray-600">LAST SYNCED</span>
              <span className="text-gray-300 font-semibold block mt-0.5">Live Sat-AIS (12s ago)</span>
            </div>
          </div>
        </div>

        {/* Right column: Selected Vessel Spec Panel */}
        <div className="xl:col-span-3 space-y-6 h-[650px] overflow-y-auto">
          {/* Spec details */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-heading font-semibold text-white border-b border-gray-800/40 pb-2 flex items-center gap-2">
              <Anchor className="w-4 h-4 text-brand-blue" />
              AIS Ship Specifications
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="text-white font-semibold">{selectedVessel?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="text-gray-300">{selectedVessel?.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Deadweight/Capacity:</span>
                <span className="text-white font-semibold">{selectedVessel?.capacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Load Capacity:</span>
                <span className="text-brand-green font-semibold">{selectedVessel?.load}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Speed:</span>
                <span className="text-brand-blue font-semibold">{selectedVessel?.speed}</span>
              </div>
            </div>
          </div>

          {/* Navigation Route Spec */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-2">
              <Navigation className="w-4 h-4 text-brand-green" />
              Route Navigation Manifest
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg space-y-1">
                <span className="text-[10px] text-gray-500 block">ORIGIN (AIS REGISTER)</span>
                <span className="text-white font-semibold block">{selectedVessel?.origin}</span>
              </div>

              <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg space-y-1">
                <span className="text-[10px] text-gray-500 block">DESTINATION ETA</span>
                <span className="text-white font-semibold block">{selectedVessel?.destination}</span>
              </div>

              <div className="flex justify-between text-xs pt-1">
                <span className="text-gray-500">Sailing Status:</span>
                <span className="text-brand-green font-semibold">{selectedVessel?.status}</span>
              </div>
            </div>
          </div>

          {/* last 24 hours stats */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-3 font-mono text-xs">
            <h3 className="text-sm font-heading font-semibold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-yellow" />
              Last 24 Hours Log
            </h3>
            <span className="text-[10px] text-gray-500 block mb-2">Detailed trace of the vessel's last 24h path</span>

            <div className="space-y-2 text-[11px] text-gray-400 max-h-[140px] overflow-y-auto">
              {selectedVessel?.last_24h.map((point, index) => (
                <div key={index} className="flex justify-between items-center py-1.5 border-b border-gray-800/40 last:border-b-0">
                  <span className="text-gray-500">Log point -{24 - index * 6}h:</span>
                  <span className="text-white font-semibold">
                    {point[1].toFixed(2)}° N, {point[0].toFixed(2)}° E
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
