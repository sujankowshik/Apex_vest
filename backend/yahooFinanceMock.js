// Mock Yahoo Finance API Provider
// Mimics yahoo-finance2 library functions for quote, chart, and search

const MOCK_STOCKS = {
  'AAPL': { symbol: 'AAPL', longName: 'Apple Inc.', price: 190.25, change: 1.45, changePercent: 0.77, sector: 'Technology', marketCap: 2950000000000, pe: 28.5, volume: 52000000 },
  'MSFT': { symbol: 'MSFT', longName: 'Microsoft Corporation', price: 425.30, change: -2.10, changePercent: -0.49, sector: 'Technology', marketCap: 3160000000000, pe: 35.2, volume: 22000000 },
  'GOOGL': { symbol: 'GOOGL', longName: 'Alphabet Inc.', price: 172.50, change: 3.20, changePercent: 1.89, sector: 'Technology', marketCap: 2150000000000, pe: 26.1, volume: 28000000 },
  'AMZN': { symbol: 'AMZN', longName: 'Amazon.com Inc.', price: 181.10, change: 0.85, changePercent: 0.47, sector: 'Consumer Cyclical', marketCap: 1880000000000, pe: 41.3, volume: 35000000 },
  'NVDA': { symbol: 'NVDA', longName: 'NVIDIA Corporation', price: 924.80, change: 18.30, changePercent: 2.02, sector: 'Technology', marketCap: 2260000000000, pe: 72.8, volume: 45000000 },
  'TSLA': { symbol: 'TSLA', longName: 'Tesla Inc.', price: 178.45, change: -4.20, changePercent: -2.30, sector: 'Consumer Cyclical', marketCap: 568000000000, pe: 45.7, volume: 88000000 },
  'META': { symbol: 'META', longName: 'Meta Platforms Inc.', price: 478.20, change: 5.40, changePercent: 1.14, sector: 'Technology', marketCap: 1220000000000, pe: 24.6, volume: 18000000 },
  'NFLX': { symbol: 'NFLX', longName: 'Netflix Inc.', price: 610.50, change: -1.50, changePercent: -0.25, sector: 'Communication Services', marketCap: 264000000000, pe: 38.9, volume: 3200000 },
  'AMD': { symbol: 'AMD', longName: 'Advanced Micro Devices Inc.', price: 164.90, change: 2.10, changePercent: 1.29, sector: 'Technology', marketCap: 266000000000, pe: 330.2, volume: 48000000 },
  'BABA': { symbol: 'BABA', longName: 'Alibaba Group Holding Limited', price: 78.60, change: -0.40, changePercent: -0.51, sector: 'Consumer Cyclical', marketCap: 185000000000, pe: 11.2, volume: 15000000 },
  '^GSPC': { symbol: '^GSPC', longName: 'S&P 500 Index', price: 5240.20, change: 24.50, changePercent: 0.47, sector: 'Index', marketCap: 0, pe: 23.4, volume: 2400000000 },
  '^IXIC': { symbol: '^IXIC', longName: 'NASDAQ Composite Index', price: 16380.45, change: 110.20, changePercent: 0.68, sector: 'Index', marketCap: 0, pe: 30.1, volume: 4200000000 },
  '^DJI': { symbol: '^DJI', longName: 'Dow Jones Industrial Average Index', price: 39120.60, change: -80.40, changePercent: -0.21, sector: 'Index', marketCap: 0, pe: 20.2, volume: 320000000 }
};

// Quote mock implementation
export async function quote(symbol) {
  const sym = symbol.toUpperCase().trim();
  const baseStock = MOCK_STOCKS[sym];

  if (!baseStock) {
    // Generate a generic stock for custom tickers
    return {
      symbol: sym,
      longName: `${sym} Corporation (Mock)`,
      shortName: `${sym} Corp`,
      regularMarketPrice: 100.00 + (Math.random() * 50 - 25),
      regularMarketChange: Math.random() * 4 - 2,
      regularMarketChangePercent: Math.random() * 2 - 1,
      regularMarketVolume: 1000000 + Math.floor(Math.random() * 5000000),
      marketCap: 50000000000,
      trailingPE: 20.0,
      fiftyTwoWeekHigh: 150.00,
      fiftyTwoWeekLow: 80.00,
      currency: 'USD',
      exchange: 'NYQ',
      quoteType: 'EQUITY'
    };
  }

  // Add minor volatility to live prices
  const noise = (Math.random() * 0.4 - 0.2); // fluctuation between -0.2% and +0.2%
  const finalPrice = Number((baseStock.price * (1 + noise / 100)).toFixed(2));
  const finalChange = Number((baseStock.change + baseStock.price * (noise / 100)).toFixed(2));
  const finalPercent = Number(((finalChange / (finalPrice - finalChange)) * 100).toFixed(2));

  return {
    symbol: baseStock.symbol,
    longName: baseStock.longName,
    shortName: baseStock.longName.split(' ')[0],
    regularMarketPrice: finalPrice,
    regularMarketChange: finalChange,
    regularMarketChangePercent: finalPercent,
    regularMarketVolume: baseStock.volume,
    marketCap: baseStock.marketCap,
    trailingPE: baseStock.pe,
    fiftyTwoWeekHigh: Number((baseStock.price * 1.25).toFixed(2)),
    fiftyTwoWeekLow: Number((baseStock.price * 0.75).toFixed(2)),
    currency: 'USD',
    exchange: baseStock.symbol.startsWith('^') ? 'IND' : 'NMS',
    quoteType: baseStock.symbol.startsWith('^') ? 'INDEX' : 'EQUITY'
  };
}

// Chart mock implementation
export async function chart(symbol, queryOptions) {
  const sym = symbol.toUpperCase().trim();
  const baseStock = MOCK_STOCKS[sym] || { price: 100.00 };
  
  let period1Date = new Date();
  if (queryOptions && queryOptions.period1) {
    period1Date = new Date(queryOptions.period1);
    if (isNaN(period1Date.getTime()) && typeof queryOptions.period1 === 'number') {
      period1Date = new Date(queryOptions.period1 * 1000);
    }
  } else {
    period1Date.setMonth(period1Date.getMonth() - 1); // default 1 month ago
  }

  const period2Date = new Date(); // default today
  
  // Calculate day difference
  const diffTime = Math.abs(period2Date - period1Date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const quotes = [];
  let currentVal = baseStock.price * 0.85; // start lower so it trends up to current
  const volatility = sym.startsWith('^') ? 0.008 : 0.02; // indices are less volatile
  const drift = 0.0008; // positive drift over time

  let currentDate = new Date(period1Date);
  
  for (let i = 0; i <= diffDays; i++) {
    // Skip weekends for realistic trading charts
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dailyReturn = (Math.random() - 0.49) * volatility + drift; // slight positive bias
      currentVal = currentVal * (1 + dailyReturn);
      
      const open = Number((currentVal * (1 + (Math.random() - 0.5) * 0.005)).toFixed(2));
      const close = Number(currentVal.toFixed(2));
      const high = Number((Math.max(open, close) * (1 + Math.random() * 0.008)).toFixed(2));
      const low = Number((Math.min(open, close) * (1 - Math.random() * 0.008)).toFixed(2));
      const volume = Math.floor(baseStock.volume * (0.5 + Math.random()));

      quotes.push({
        date: new Date(currentDate),
        open,
        high,
        low,
        close,
        volume
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    meta: {
      symbol: sym,
      currency: 'USD',
      regularMarketPrice: Number(currentVal.toFixed(2)),
      chartPreviousClose: Number((baseStock.price * 0.84).toFixed(2))
    },
    quotes
  };
}

// Search mock implementation
export async function search(query) {
  if (!query) return { quotes: [] };
  const q = query.toLowerCase().trim();
  const quotes = [];

  for (const [symbol, info] of Object.entries(MOCK_STOCKS)) {
    if (symbol.toLowerCase().includes(q) || info.longName.toLowerCase().includes(q)) {
      quotes.push({
        symbol: info.symbol,
        shortname: info.longName,
        longname: info.longName,
        exchange: info.symbol.startsWith('^') ? 'IND' : 'NMS',
        quoteType: info.symbol.startsWith('^') ? 'INDEX' : 'EQUITY'
      });
    }
  }

  // If no matches, return a custom mock equity match
  if (quotes.length === 0 && q.length >= 2) {
    const sym = q.toUpperCase();
    quotes.push({
      symbol: sym,
      shortname: `${sym} Corp (Custom)`,
      longname: `${sym} Corporation (Custom)`,
      exchange: 'NMS',
      quoteType: 'EQUITY'
    });
  }

  return { quotes };
}

// Helper to get sector for a stock (useful for Trend analysis)
export function getSector(symbol) {
  const sym = symbol.toUpperCase().trim();
  const stock = MOCK_STOCKS[sym];
  return stock ? stock.sector : 'Other';
}
