import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { Activity, Eye, TrendingUp } from "lucide-react";

interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  vwap?: number;
}

interface TradingViewChartProps {
  data: PriceBar[];
  symbol: string;
  height?: number;
}

export default function TradingViewChart({ data, symbol, height = 380 }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ema20SeriesRef = useRef<any>(null);
  const ema50SeriesRef = useRef<any>(null);
  const ema200SeriesRef = useRef<any>(null);

  const [timeframe, setTimeframe] = useState<"1M" | "6M" | "1Y" | "5Y" | "ALL">("1Y");
  const [showEMA, setShowEMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // Filter data based on selected timeframe
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (timeframe === "ALL") return sorted;

    const now = new Date(sorted[sorted.length - 1].date).getTime();
    const daysMap = { "1M": 30, "6M": 180, "1Y": 365, "5Y": 1825 };
    const cutoff = now - daysMap[timeframe] * 24 * 60 * 60 * 1000;

    return sorted.filter(d => new Date(d.date).getTime() >= cutoff);
  }, [data, timeframe]);

  // Compute Exponential Moving Averages (EMA)
  const computeEMA = (prices: PriceBar[], period: number) => {
    if (prices.length < period) return [];
    const k = 2 / (period + 1);
    const emaData: { time: string; value: number }[] = [];
    
    // Initial SMA for first period
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i].close;
    }
    let prevEMA = sum / period;
    emaData.push({ time: prices[period - 1].date, value: prevEMA });

    for (let i = period; i < prices.length; i++) {
      const currentEMA = prices[i].close * k + prevEMA * (1 - k);
      emaData.push({ time: prices[i].date, value: currentEMA });
      prevEMA = currentEMA;
    }
    return emaData;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create TradingView Lightweight Chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontSize: 11,
        fontFamily: "monospace"
      },
      grid: {
        vertLines: { color: "rgba(31, 41, 55, 0.4)" },
        horzLines: { color: "rgba(31, 41, 55, 0.4)" }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#6366f1", width: 1, style: 3, labelBackgroundColor: "#4f46e5" },
        horzLine: { color: "#6366f1", width: 1, style: 3, labelBackgroundColor: "#4f46e5" }
      },
      rightPriceScale: {
        borderColor: "rgba(55, 65, 81, 0.6)",
        scaleMargins: { top: 0.1, bottom: 0.25 }
      },
      timeScale: {
        borderColor: "rgba(55, 65, 81, 0.6)",
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartRef.current = chart;

    // 1. Candlestick Series
    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444"
    });
    candleSeriesRef.current = candleSeries;

    // 2. Volume Series (Histogram at bottom)
    const volumeSeries = (chart as any).addHistogramSeries({
      color: "rgba(99, 102, 241, 0.3)",
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: { top: 0.8, bottom: 0 }
    });
    volumeSeriesRef.current = volumeSeries;

    // 3. Technical EMA Overlays
    const ema20 = (chart as any).addLineSeries({ color: "#38bdf8", lineWidth: 1.5, title: "EMA 20" });
    const ema50 = (chart as any).addLineSeries({ color: "#fbbf24", lineWidth: 1.5, title: "EMA 50" });
    const ema200 = (chart as any).addLineSeries({ color: "#a855f7", lineWidth: 2, title: "EMA 200" });

    ema20SeriesRef.current = ema20;
    ema50SeriesRef.current = ema50;
    ema200SeriesRef.current = ema200;

    // Resize observer for seamless fluid responsiveness
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Update Data and Overlays
  useEffect(() => {
    if (!candleSeriesRef.current || filteredData.length === 0) return;

    // Map candlesticks
    const candleData = filteredData.map(d => ({
      time: d.date,
      open: d.open || d.close,
      high: d.high || Math.max(d.open || d.close, d.close),
      low: d.low || Math.min(d.open || d.close, d.close),
      close: d.close
    }));
    candleSeriesRef.current.setData(candleData);

    // Map volume bars
    if (volumeSeriesRef.current) {
      if (showVolume) {
        const volumeData = filteredData.map(d => ({
          time: d.date,
          value: d.volume || (d.close * 1000),
          color: (d.close >= (d.open || d.close)) ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"
        }));
        volumeSeriesRef.current.setData(volumeData);
      } else {
        volumeSeriesRef.current.setData([]);
      }
    }

    // Map EMAs
    if (showEMA && filteredData.length >= 20) {
      ema20SeriesRef.current?.setData(computeEMA(filteredData, 20));
      ema50SeriesRef.current?.setData(computeEMA(filteredData, 50));
      ema200SeriesRef.current?.setData(computeEMA(filteredData, 200));
    } else {
      ema20SeriesRef.current?.setData([]);
      ema50SeriesRef.current?.setData([]);
      ema200SeriesRef.current?.setData([]);
    }

    chartRef.current?.timeScale().fitContent();
  }, [filteredData, showEMA, showVolume]);

  const latestPrice = filteredData[filteredData.length - 1]?.close || 0;
  const firstPrice = filteredData[0]?.close || latestPrice;
  const changePct = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

  return (
    <div className="bg-[#0e121e] border border-gray-800/60 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Chart Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800/50 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white font-mono">{symbol}</span>
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">TradingView Canvas Engine</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
              <span className="text-white font-bold">₹{latestPrice.toLocaleString()}</span>
              <span className={`text-[11px] font-semibold ${changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}% ({timeframe})
              </span>
            </div>
          </div>
        </div>

        {/* Action Toggles & Timeframes */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Overlays */}
          <button
            onClick={() => setShowEMA(!showEMA)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all border ${
              showEMA 
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'
            }`}
          >
            EMA (20/50/200)
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all border ${
              showVolume 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'
            }`}
          >
            Volume Bars
          </button>

          {/* Timeframe Buttons */}
          <div className="flex bg-gray-950 p-0.5 rounded-lg border border-gray-800">
            {(["1M", "6M", "1Y", "5Y", "ALL"] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                  timeframe === tf
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div 
        ref={chartContainerRef} 
        style={{ height: `${height}px`, width: "100%" }}
        className="w-full relative"
      />

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-gray-800/40">
        <div className="flex items-center gap-4">
          {showEMA && (
            <>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400" /> EMA 20</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> EMA 50</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" /> EMA 200</span>
            </>
          )}
        </div>
        <span>Interactive Canvas • Scroll to Zoom • Drag to Pan</span>
      </div>
    </div>
  );
}
