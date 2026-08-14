import React, { useState, useEffect, lazy, Suspense } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

// Quant Platform Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StockUniverse = lazy(() => import("./pages/StockUniverse"));
const Screener = lazy(() => import("./pages/Screener"));
const StrategyBuilder = lazy(() => import("./pages/StrategyBuilder"));
const StrategyLibrary = lazy(() => import("./pages/StrategyLibrary"));
const BacktestResults = lazy(() => import("./pages/BacktestResults"));
const SingleStockResearch = lazy(() => import("./pages/SingleStockResearch"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const MarketBreadth = lazy(() => import("./pages/MarketBreadth"));
const DataAdmin = lazy(() => import("./pages/DataAdmin"));

// Macro Radar Pages
const CommandCentre = lazy(() => import("./pages/CommandCentre"));
const GlobalFlowBoard = lazy(() => import("./pages/GlobalFlowBoard"));
const ApexLeadPredictor = lazy(() => import("./pages/ApexLeadPredictor"));
const CountryLiquidityGrid = lazy(() => import("./pages/CountryLiquidityGrid"));
const BalanceOfPayments = lazy(() => import("./pages/BalanceOfPayments"));
const TradeFlowMap = lazy(() => import("./pages/TradeFlowMap"));
const VesselTracker = lazy(() => import("./pages/VesselTracker"));
const AssetBullRadar = lazy(() => import("./pages/AssetBullRadar"));
const LiquidityTransmissionLab = lazy(() => import("./pages/LiquidityTransmissionLab"));
const EuphoriaDistributionMonitor = lazy(() => import("./pages/EuphoriaDistributionMonitor"));
const SmartMoneyExitMonitor = lazy(() => import("./pages/SmartMoneyExitMonitor"));
const LiquidityDrainRadar = lazy(() => import("./pages/LiquidityDrainRadar"));
const BacktestValidationLab = lazy(() => import("./pages/BacktestValidationLab"));
const HistoricalSimilarityEngine = lazy(() => import("./pages/HistoricalSimilarityEngine"));
const DataQualityCoverage = lazy(() => import("./pages/DataQualityCoverage"));
const GlobalCentralBanks = lazy(() => import("./pages/GlobalCentralBanks"));
const ReserveFlowTracker = lazy(() => import("./pages/ReserveFlowTracker"));
const RrgEngine = lazy(() => import("./pages/RrgEngine"));
const CountryEconomicCockpit = lazy(() => import("./pages/CountryEconomicCockpit"));
const CrossBorderMatrix = lazy(() => import("./pages/CrossBorderMatrix"));

export default function App() {
  const [activePage, setActivePage] = useState("command-centre");
  const [backtestConfig, setBacktestConfig] = useState<any>(null);
  const [backtestResultData, setBacktestResultData] = useState<any>(null);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState("RELIANCE");

  const handleLoadTemplate = (name: string, config: any) => {
    setBacktestConfig(config);
    setActivePage("strategy-builder");
  };

  const handleRunBacktest = (result: any) => {
    setBacktestResultData(result);
    setActivePage("backtest-results");
  };

  const handleSelectStock = (symbol: string) => {
    setSelectedStockSymbol(symbol);
    setActivePage("stock-research");
  };

  const renderPage = () => {
    return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center h-[500px] gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-400"></div>
          <span className="text-xs font-mono text-gray-500">Loading World Money Flow Radar...</span>
        </div>
      }>
        {(() => {
          switch (activePage) {
            // World Money Flow Radar Views
            case "command-centre":
              return <CommandCentre />;
            case "global-flow-board":
              return <GlobalFlowBoard />;
            case "apex-predictor":
              return <ApexLeadPredictor />;
            case "rrg-engine":
              return <RrgEngine />;
            case "country-liquidity":
              return <CountryLiquidityGrid />;
            case "country-cockpit":
              return <CountryEconomicCockpit />;
            case "cross-border-matrix":
              return <CrossBorderMatrix />;
            case "balance-of-payments":
              return <BalanceOfPayments />;
            case "trade-flow-map":
              return <TradeFlowMap />;
            case "vessel-tracker":
              return <VesselTracker />;
            case "global-central-banks":
              return <GlobalCentralBanks />;
            case "reserve-flows":
              return <ReserveFlowTracker />;
            case "asset-bull-radar":
              return <AssetBullRadar />;
            case "liquidity-transmission":
              return <LiquidityTransmissionLab />;
            case "euphoria-monitor":
              return <EuphoriaDistributionMonitor />;
            case "smart-money-exit":
              return <SmartMoneyExitMonitor />;
            case "liquidity-drain":
              return <LiquidityDrainRadar />;
            case "backtest-validation":
              return <BacktestValidationLab />;
            case "historical-similarity":
              return <HistoricalSimilarityEngine />;
            case "data-quality-coverage":
              return <DataQualityCoverage />;

            // Equity Quant Modules
            case "dashboard":
              return <Dashboard />;
            case "stock-universe":
              return <StockUniverse onSelectStock={handleSelectStock} />;
            case "screener":
              return <Screener onSelectStock={handleSelectStock} />;
            case "strategy-builder":
              return <StrategyBuilder onRunBacktest={handleRunBacktest} />;
            case "strategy-library":
              return <StrategyLibrary onLoadTemplate={handleLoadTemplate} />;
            case "backtest-results":
              return <BacktestResults result={backtestResultData} />;
            case "stock-research":
              return <SingleStockResearch selectedSymbol={selectedStockSymbol} />;
            case "portfolio":
              return <PortfolioPage onSelectStock={handleSelectStock} />;
            case "market-breadth":
              return <MarketBreadth />;
            case "data-admin":
              return <DataAdmin />;

            default:
              return <CommandCentre />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="flex h-screen bg-[#07090e] text-gray-100 font-sans overflow-hidden">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePage={activePage} />
        <main className="flex-1 overflow-y-auto p-6 bg-[#07090e] custom-scrollbar">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
