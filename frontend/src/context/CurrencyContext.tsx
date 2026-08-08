import React, { createContext, useContext, useState, type ReactNode } from "react";

export type CurrencyCode = "USD" | "INR" | "EUR";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amountInUSD: number, targetCurrency?: CurrencyCode) => string;
  getSymbol: (c?: CurrencyCode) => string;
  convertFromUSD: (amountInUSD: number, targetCurrency?: CurrencyCode) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Conversion rates relative to 1 USD
const RATES: Record<CurrencyCode, number> = {
  USD: 1.0,
  INR: 83.5,
  EUR: 0.92,
};

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
};

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  const convertFromUSD = (amountInUSD: number, targetCurrency?: CurrencyCode) => {
    const code = targetCurrency || currency;
    const rate = RATES[code] || 1.0;
    return amountInUSD * rate;
  };

  const getSymbol = (c?: CurrencyCode) => {
    const code = c || currency;
    return SYMBOLS[code] || "$";
  };

  const formatPrice = (amountInUSD: number, targetCurrency?: CurrencyCode) => {
    const code = targetCurrency || currency;
    const converted = convertFromUSD(amountInUSD, code);
    const symbol = SYMBOLS[code];
    
    if (code === "INR") {
      return `${symbol}${Number(converted.toFixed(0)).toLocaleString("en-IN")}`;
    }
    return `${symbol}${Number(converted.toFixed(1)).toLocaleString("en-US")}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, getSymbol, convertFromUSD }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
