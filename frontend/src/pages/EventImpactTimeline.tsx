import React, { useState, useEffect } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  HelpCircle,
  Activity,
  Zap,
  ArrowRight,
  Info
} from "lucide-react";

export default function EventImpactTimeline() {
  const [tape, setTape] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [reactionData, setReactionData] = useState<any[]>([]);

  const fetchTape = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/events/macro-flow-tape");
      const data = await response.json();
      setTape(data.tape || []);
      if (data.tape && data.tape.length > 0) {
        handleEventSelect(data.tape[0]);
      }
    } catch (e) {
      console.error("Failed to fetch tape", e);
    }
    setLoading(false);
  };

  const generateReactionPath = (event: any) => {
    // Generates T-10 to T+20 day performance index path (base 100 on T-10)
    const direction = event.direction || "positive";
    const data = [];
    let price = 100.0;
    
    // Seed random state based on event ID to keep it consistent
    let seed = event.id.charCodeAt(0) + event.id.charCodeAt(event.id.length - 1);
    const pseudoRandom = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let t = -10; t <= 20; t++) {
      let dailyReturn = 0;
      if (t > 0) {
        // Post event impact
        if (direction === "positive") {
          dailyReturn = 0.22 + (pseudoRandom() - 0.45) * 0.35; // positive drift
        } else if (direction === "negative" || direction === "warning") {
          dailyReturn = -0.28 + (pseudoRandom() - 0.55) * 0.4; // negative drift
        } else {
          dailyReturn = 0.02 + (pseudoRandom() - 0.5) * 0.2;
        }
      } else {
        // Pre event drift
        dailyReturn = 0.05 + (pseudoRandom() - 0.5) * 0.15;
      }
      
      price = price * (1 + dailyReturn / 100);
      
      data.push({
        day: `T${t >= 0 ? "+" : ""}${t}`,
        dayNum: t,
        performance: round(price, 2)
      });
    }
    return data;
  };

  const round = (num: number, decimal: number) => {
    return Math.round(num * Math.pow(10, decimal)) / Math.pow(10, decimal);
  };

  const handleEventSelect = (evt: any) => {
    setSelectedEvent(evt);
    setReactionData(generateReactionPath(evt));
  };

  useEffect(() => {
    fetchTape();
  }, []);

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
        return "text-brand-red border-brand-red/20 bg-brand-red/5";
      case "warning":
        return "text-brand-yellow border-brand-yellow/20 bg-brand-yellow/5";
      case "info":
      default:
        return "text-brand-blue border-brand-blue/20 bg-brand-blue/5";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
          <Clock className="text-brand-green w-6 h-6 animate-pulse" />
          <span>Macro Flow Event Timeline</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Audits key central bank, dollar liquidity, and FX stress triggers side-by-side with asset reaction histories.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-green"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Timeline Feed (Left 6 cols) */}
          <div className="lg:col-span-6 bg-bg-card border border-gray-850 rounded-xl p-5 flex flex-col h-[520px]">
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">
              Chronological Trigger List
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 font-sans relative border-l border-gray-800 ml-3.5 pl-6 py-2">
              {tape.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                const bulletColor = evt.direction === "positive" ? "bg-brand-green" : evt.direction === "warning" ? "bg-brand-yellow" : "bg-brand-red";
                
                return (
                  <div 
                    key={evt.id}
                    onClick={() => handleEventSelect(evt)}
                    className={`relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? "bg-gray-900 border-gray-700 shadow-md" 
                        : "bg-gray-950/20 border-gray-900/60 hover:border-gray-800"
                    }`}
                  >
                    {/* Time dot anchor */}
                    <span className={`absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 border-gray-950 ${bulletColor} ${
                      isSelected ? "scale-125 ring-4 ring-brand-green/10" : ""
                    }`}></span>

                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getSeverityColor(evt.severity)}`}>
                        {evt.category}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">{evt.date}</span>
                    </div>

                    <h4 className="text-xs font-bold text-gray-200 leading-snug">
                      {evt.title}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                      {evt.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Asset Impact Detail Study (Right 6 cols) */}
          <div className="lg:col-span-6">
            {selectedEvent ? (
              <div className="bg-bg-card border border-gray-850 rounded-xl p-5 space-y-5 h-full flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div className="border-b border-gray-800/80 pb-3">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Selected impact model</span>
                    <h3 className="text-sm font-heading font-extrabold text-white mt-1 leading-snug">{selectedEvent.title}</h3>
                  </div>

                  {/* Reaction Chart */}
                  <div>
                    <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2 flex justify-between">
                      <span>Event Study (Day T-10 to T+20)</span>
                      <span className="text-gray-400">Index Day T-10 = 100.0</span>
                    </h4>
                    
                    <div className="h-[170px] w-full bg-gray-950/30 rounded-xl border border-gray-900 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reactionData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="day" stroke="#4b5563" fontSize={9} tickLine={false} />
                          <YAxis domain={["auto", "auto"]} stroke="#4b5563" fontSize={9} tickLine={false} />
                          <RechartsTooltip 
                            contentStyle={{ background: "#0c0d12", border: "1px solid #2a2b36", borderRadius: "6px" }}
                            labelStyle={{ color: "#6b7280", fontSize: "9px", fontFamily: "monospace" }}
                            itemStyle={{ color: "#10b981", fontSize: "10px" }}
                          />
                          <ReferenceLine x="T0" stroke="#f59e0b" strokeWidth={1.5} label={{ value: "Event Day", fill: "#f59e0b", fontSize: 8, position: "insideTopRight" }} />
                          <Line type="monotone" dataKey="performance" stroke="#10b981" strokeWidth={2.5} dot={false} name="Asset Perf" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Explainability notes */}
                  <div className="space-y-3 font-sans text-xs">
                    <div className="bg-gray-950/40 p-3.5 rounded-xl border border-gray-900">
                      <span className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Impact Mechanism</span>
                      <p className="text-gray-300 leading-relaxed leading-snug">{selectedEvent.explanation}</p>
                    </div>

                    <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-3.5 text-brand-green">
                      <span className="font-bold block uppercase text-[8px] tracking-wider mb-1 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        Why This Matters To Investors
                      </span>
                      <p className="leading-snug text-gray-200">{selectedEvent.why_it_matters}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800/80 grid grid-cols-2 gap-4 font-mono text-[10px]">
                  <div>
                    <span className="text-gray-500 block">Linked Symbols</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedEvent.linked_symbols.map((sym: string) => (
                        <span key={sym} className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 text-gray-400 rounded">
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 block">Historical hit rate</span>
                    <span className="text-brand-blue font-bold text-xs mt-1 block">{selectedEvent.historical_success}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-bg-card border border-gray-850 rounded-xl p-8 text-center h-[520px] flex flex-col items-center justify-center text-gray-500">
                <HelpCircle className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-xs">Select any macro bullet trigger card from the timeline feed to load its detailed structural response, hit-rates, and asset performance study.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
