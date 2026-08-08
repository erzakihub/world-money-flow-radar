import React from "react";
import { Database, Wifi, WifiOff, Clock } from "lucide-react";

interface DataQualityBadgeProps {
  status?: string;
}

export default function DataQualityBadge({ status }: DataQualityBadgeProps) {
  const safeStatus = (status || "Green").toLowerCase();

  const getColors = () => {
    if (safeStatus === "green" || safeStatus === "live" || safeStatus === "official") {
      return {
        bg: "bg-brand-green/10",
        text: "text-brand-green",
        border: "border-brand-green/20",
        label: "Live",
        Icon: Wifi
      };
    } else if (safeStatus === "yellow" || safeStatus === "delayed") {
      return {
        bg: "bg-brand-yellow/10",
        text: "text-brand-yellow",
        border: "border-brand-yellow/20",
        label: "Delayed",
        Icon: Clock
      };
    } else {
      return {
        bg: "bg-brand-red/10",
        text: "text-brand-red",
        border: "border-brand-red/20",
        label: "Stale",
        Icon: WifiOff
      };
    }
  };

  const { bg, text, border, label, Icon } = getColors();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${bg} ${text} ${border}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}
