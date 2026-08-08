/**
 * AlphaPulse Momentum Calculation Library
 * Implements moving averages, RSI, Minervini Trend Template,
 * William O'Neil's Relative Strength Rating, and Volatility Contraction (VCP) indicators.
 */

// Generate 260 days of historical data backwards from the 20-day closing prices
// using a geometric Brownian motion random walk to simulate authentic historical data.
export function populateHistoricalData(stock) {
  if (stock.fullHistory && stock.fullHistory.length >= 260) {
    return;
  }

  // Generate 20-day base history dynamically if not present
  if (!stock.priceHistory) {
    const history = new Array(20);
    let currentVal = stock.price;
    const low = stock.fiftyTwoWeekLow;
    const high = stock.fiftyTwoWeekHigh;
    
    for (let i = 19; i >= 0; i--) {
      history[i] = Number(currentVal.toFixed(2));
      // Drift biased based on 52-week high/low position
      const pctPosition = (currentVal - low) / (high - low || 1);
      const drift = (pctPosition - 0.5) * 0.0015;
      const randomShock = (Math.random() - 0.5) * 0.015;
      currentVal = currentVal * (1 - (drift + randomShock));
      if (currentVal < low * 0.95) currentVal = low * 0.95;
      if (currentVal > high * 1.05) currentVal = high * 1.05;
    }
    stock.priceHistory = history;
  }

  const baseHistory = [...stock.priceHistory]; // last 20 days
  const fullHistory = new Array(260);
  
  // Fill the last 20 elements with baseHistory
  for (let i = 0; i < 20; i++) {
    fullHistory[240 + i] = baseHistory[i];
  }

  // Back-extrapolate the remaining 240 days
  let currentVal = baseHistory[0];
  const low52 = stock.fiftyTwoWeekLow;
  const high52 = stock.fiftyTwoWeekHigh;
  
  // Estimate drift based on 52-week low/high
  // If the stock is currently near the high, it had an upward trend
  const pctPosition = (currentVal - low52) / (high52 - low52 || 1);
  const drift = (pctPosition - 0.5) * 0.001; // bias random walk

  for (let i = 239; i >= 0; i--) {
    const randomShock = (Math.random() - 0.5) * 0.015; // 1.5% max random daily volatility
    currentVal = currentVal * (1 - (drift + randomShock));
    
    // Clamp to logical bounds (between 52-week low and high with a small buffer)
    if (currentVal < low52 * 0.95) currentVal = low52 * 0.95;
    if (currentVal > high52 * 1.05) currentVal = high52 * 1.05;
    
    fullHistory[i] = Number(currentVal.toFixed(2));
  }

  stock.fullHistory = fullHistory;

  // Generate volume history matching the price pattern
  const volHistory = new Array(260);
  const baseVol = stock.volumeAvg20;
  for (let i = 0; i < 260; i++) {
    const volatilityFactor = Math.abs(fullHistory[i] - (fullHistory[i-1] || fullHistory[i])) / (fullHistory[i-1] || 1);
    // Volume spikes on big price movements
    const spike = volatilityFactor > 0.01 ? (1.5 + Math.random() * 2) : (0.6 + Math.random() * 0.8);
    volHistory[i] = Math.round(baseVol * spike);
  }
  stock.volumeHistory = volHistory;
}

// Simple Moving Average
export function calculateSMA(prices, period) {
  if (prices.length < period) return 0;
  let sum = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    sum += prices[i];
  }
  return Number((sum / period).toFixed(2));
}

// Exponential Moving Average
export function calculateEMA(prices, period) {
  if (prices.length < period) return 0;
  let k = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return Number(ema.toFixed(2));
}

// Relative Strength Index (RSI)
export function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50; // default middle
  
  let gains = 0;
  let losses = 0;

  // First RSI value calculation
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Wilder's smoothing technique for the remaining prices
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(1));
}

// Calculate O'Neil style Relative Strength Rating (0-99)
// Formulated as a weighted price performance over 12 months:
// Performance = Q1 * 0.40 + Q2 * 0.30 + Q3 * 0.20 + Q4 * 0.10
export function calculateRelativeStrengthRatings(stocks) {
  const scores = stocks.map(stock => {
    populateHistoricalData(stock);
    const history = stock.fullHistory;
    const len = history.length;

    // Returns over different horizons
    const r3m = (history[len - 1] - history[len - 65]) / history[len - 65];   // Last 3 months (~65 trading days)
    const r6m = (history[len - 65] - history[len - 130]) / history[len - 130]; // Prev 3 months
    const r9m = (history[len - 130] - history[len - 195]) / history[len - 195]; // Prev 3 months
    const r12m = (history[len - 195] - history[0]) / history[0];             // Prev 3 months
    
    // O'Neil's weighted formula favoring recent gains
    const weightedScore = (r3m * 40) + (r6m * 30) + (r9m * 20) + (r12m * 10);
    return { symbol: stock.symbol, score: weightedScore };
  });

  // Sort scores to assign percentile ranks (0 - 99)
  scores.sort((a, b) => a.score - b.score);
  
  stocks.forEach(stock => {
    const rankIndex = scores.findIndex(s => s.symbol === stock.symbol);
    const percentile = Math.round((rankIndex / (stocks.length - 1)) * 99);
    stock.rsRating = percentile;
  });
}

// Volatility Contraction Pattern (VCP) Check
// Identifies if volatility is narrowing (tightness) and volume is drying up
export function checkVCP(stock) {
  populateHistoricalData(stock);
  const history = stock.fullHistory;
  const volHistory = stock.volumeHistory;
  const len = history.length;

  // Calculate ATR (Average True Range) standard deviation as proxy for volatility
  const calcStdDev = (arr) => {
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length);
  };

  const currentVolRange = history.slice(len - 10); // last 10 days
  const priorVolRange = history.slice(len - 30, len - 10); // prior 20 days

  const currentStdDev = calcStdDev(currentVolRange) / history[len - 1];
  const priorStdDev = calcStdDev(priorVolRange) / history[len - 11];

  // Volatility contraction: current volatility is lower than prior volatility (tightness)
  const isVolContracted = currentStdDev < priorStdDev * 0.75;

  // Volume dry-up: average volume in last 5 days is less than the 20-day average volume
  const last5DaysVol = volHistory.slice(len - 5).reduce((s, x) => s + x, 0) / 5;
  const avg20DaysVol = volHistory.slice(len - 20).reduce((s, x) => s + x, 0) / 20;
  const isVolumeDryingUp = last5DaysVol < avg20DaysVol * 0.85;

  // Is price consolidatng near highs (within 15% of 52-week high)
  const isNearHighs = stock.price >= stock.fiftyTwoWeekHigh * 0.85;

  return isVolContracted && isVolumeDryingUp && isNearHighs;
}

// Mark Minervini's 8 Trend Template Rules
export function evaluateMinerviniTemplate(stock) {
  populateHistoricalData(stock);
  const history = stock.fullHistory;
  const len = history.length;
  const currentPrice = stock.price;

  const sma50 = calculateSMA(history, 50);
  const sma150 = calculateSMA(history, 150);
  const sma200 = calculateSMA(history, 200);

  // 200 SMA trend (is it up over the last month? ~22 trading days)
  const history200 = [];
  for (let i = len - 22; i < len; i++) {
    history200.push(calculateSMA(history.slice(0, i + 1), 200));
  }
  const isSMA200TrendingUp = sma200 > history200[0];

  const low52 = stock.fiftyTwoWeekLow;
  const high52 = stock.fiftyTwoWeekHigh;

  // Evaluate Rules:
  const r1 = currentPrice > sma150 && currentPrice > sma200; // Price above 150 & 200 SMAs
  const r2 = sma150 > sma200; // 150 SMA above 200 SMA
  const r3 = isSMA200TrendingUp; // 200 SMA is trending up
  const r4 = sma50 > sma150 && sma50 > sma200; // 50 SMA above 150 & 200 SMAs
  const r5 = currentPrice > sma50; // Price above 50 SMA
  const r6 = currentPrice >= low52 * 1.30; // Price is at least 30% above 52-week low
  const r7 = currentPrice >= high52 * 0.75; // Price is within 25% of 52-week high
  const r8 = (stock.rsRating || 0) >= 70; // Relative Strength rating is at least 70

  const passes = r1 && r2 && r3 && r4 && r5 && r6 && r7 && r8;

  return {
    passes,
    rules: {
      priceAboveSMAs: r1,
      sma150Above200: r2,
      sma200Upward: r3,
      sma50AboveOtherSMAs: r4,
      priceAboveSMA50: r5,
      aboveLow52: r6,
      nearHigh52: r7,
      strongRS: r8
    },
    metrics: {
      sma50,
      sma150,
      sma200,
      rsRating: stock.rsRating
    }
  };
}

// Compute custom Momentum Score (0 - 100) based on multiple technical signals
export function calculateMomentumScore(stock) {
  populateHistoricalData(stock);
  const history = stock.fullHistory;
  const len = history.length;
  
  // 1. RSI (Weight: 25%)
  const rsi = calculateRSI(history, 14);
  let rsiScore = 0;
  if (rsi >= 50 && rsi <= 75) {
    // Bullish zone (60-70 is prime momentum)
    rsiScore = 70 + ((rsi - 50) / 25) * 30;
  } else if (rsi > 75) {
    // Strongly overbought, slight correction risk but strong momentum
    rsiScore = 100 - (rsi - 75) * 2; 
  } else {
    // Weak momentum
    rsiScore = (rsi / 50) * 50;
  }

  // 2. Relative Strength (Weight: 25%)
  const rsScore = stock.rsRating || 50;

  // 3. Price vs SMAs (Weight: 30%)
  const currentPrice = stock.price;
  const sma50 = calculateSMA(history, 50);
  const sma200 = calculateSMA(history, 200);
  
  let smaScore = 50;
  if (currentPrice > sma50 && sma50 > sma200) {
    smaScore = 80 + Math.min(20, ((currentPrice - sma50) / sma50) * 100);
  } else if (currentPrice > sma50) {
    smaScore = 65;
  } else if (currentPrice > sma200) {
    smaScore = 50;
  } else {
    smaScore = Math.max(0, 50 - ((sma200 - currentPrice) / sma200) * 100);
  }

  // 4. Volume Trend (Weight: 20%)
  const volHistory = stock.volumeHistory;
  const recentVol = volHistory.slice(len - 5).reduce((s, x) => s + x, 0) / 5;
  const baseVol = stock.volumeAvg20;
  const volRatio = recentVol / baseVol;
  
  let volScore = 50;
  if (volRatio > 1.5) {
    volScore = 80 + Math.min(20, (volRatio - 1.5) * 10);
  } else if (volRatio >= 1.0) {
    volScore = 65 + (volRatio - 1.0) * 30;
  } else {
    volScore = Math.max(10, volRatio * 50);
  }

  // Weighted momentum score
  const totalScore = (rsiScore * 0.25) + (rsScore * 0.25) + (smaScore * 0.30) + (volScore * 0.20);
  return {
    score: Math.round(totalScore),
    rsi,
    volRatio: Number(volRatio.toFixed(2)),
    sma50,
    sma200
  };
}
