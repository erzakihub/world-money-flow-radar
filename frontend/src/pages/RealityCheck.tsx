import React, { useState, useEffect } from "react";
import { ShieldCheck, CircleCheck, CircleAlert, Sparkles } from "lucide-react";

export default function RealityCheck() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/reality-check")
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
          <h2 className="text-2xl font-heading font-bold text-white">Reality Check & Verification</h2>
          <p className="text-sm text-gray-500">Cross-reference price-action narratives against actual fund flow allocations to isolate real trends from proxy noise.</p>
        </div>
        
        {/* Composite Truth Score */}
        <div className="bg-bg-card border border-gray-800 rounded-xl px-4 py-2 flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-gray-500 font-mono uppercase">Overall Flow Truth Score</span>
            <span className="text-sm font-bold text-white mt-0.5">Moderate Inflows Confirmed</span>
          </div>
          <div className="w-10 h-10 rounded-full border-4 border-brand-blue flex items-center justify-center font-bold text-xs text-brand-blue font-mono">
            {data.composite_truth_score}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {data.narratives.map((nar: any) => (
          <div key={nar.id} className="bg-bg-card border border-gray-800 rounded-xl p-6 shadow-md space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-md font-heading font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-blue" />
                  <span>{nar.title}</span>
                </h3>
                <p className="text-xs text-brand-blue font-mono mt-1 font-semibold">
                  Truth Score: {nar.score}% • Confidence: {nar.confidence_level}
                </p>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded border font-semibold ${
                nar.score >= 75 ? "bg-brand-green/10 text-brand-green border-brand-green/20" : nar.score >= 50 ? "bg-brand-blue/10 text-brand-blue border-brand-blue/20" : "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20"
              }`}>
                {nar.confidence_level} CONFIDENCE
              </span>
            </div>

            <div className="p-3.5 bg-gray-900/40 rounded border border-gray-800 text-xs text-gray-300 leading-relaxed font-sans">
              <strong>Verdict:</strong> {nar.conclusion}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs">
              {/* Supporting Evidence */}
              <div className="space-y-2">
                <span className="text-[10px] text-brand-green font-mono uppercase flex items-center gap-1">
                  <CircleCheck className="w-3.5 h-3.5" />
                  Supporting Evidence
                </span>
                <ul className="space-y-1.5 list-disc pl-4 text-gray-400 font-sans">
                  {nar.supporting.map((sup: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{sup}</li>
                  ))}
                </ul>
              </div>

              {/* Contradicting Evidence */}
              <div className="space-y-2">
                <span className="text-[10px] text-brand-red font-mono uppercase flex items-center gap-1">
                  <CircleAlert className="w-3.5 h-3.5" />
                  Contradicting Evidence
                </span>
                <ul className="space-y-1.5 list-disc pl-4 text-gray-400 font-sans">
                  {nar.contradicting.map((con: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{con}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
