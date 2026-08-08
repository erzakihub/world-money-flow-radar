import React from "react";

interface FlowPulseGaugeProps {
  score: number;
  size?: number;
}

export default function FlowPulseGauge({ score, size = 120 }: FlowPulseGaugeProps) {
  const radius = size * 0.4;
  const strokeWidth = size * 0.08;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 70) return { stroke: "#10B981", text: "text-brand-green", glow: "shadow-brand-green/20" };
    if (score >= 55) return { stroke: "#F59E0B", text: "text-brand-yellow", glow: "shadow-brand-yellow/20" };
    if (score >= 45) return { stroke: "#9CA3AF", text: "text-gray-400", glow: "shadow-gray-400/15" };
    return { stroke: "#EF4444", text: "text-brand-red", glow: "shadow-brand-red/20" };
  };

  const { stroke, text, glow } = getColor();

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#1F2937"
          strokeWidth={strokeWidth}
        />
        {/* Active progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Centered text info */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`text-2xl font-extrabold font-mono tracking-tighter ${text}`}>
          {score.toFixed(1)}
        </span>
        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest -mt-1">
          PULSE
        </span>
      </div>
    </div>
  );
}
