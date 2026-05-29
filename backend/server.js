// Set environment variable BEFORE importing yahoo-finance2 to use query1
process.env.YF_QUERY_HOST = 'query1.finance.yahoo.com';

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import yahooFinance from 'yahoo-finance2';
import * as mockFinance from './yahooFinanceMock.js';
import { getTransactions, addTransaction, deleteTransaction } from './portfolioStore.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for frontend development server (supports any localhost/127.0.0.1 port dynamically)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin matches localhost/127.0.0.1 with any port
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (isLocalhost) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// In-memory cache layer
const quoteCache = {};
const chartCache = {};
const searchCache = {};
let indicesCache = null;

const CACHE_TIMES = {
  quote: 1 * 60 * 1000,    // 1 minute
  chart: 5 * 60 * 1000,    // 5 minutes
  indices: 1 * 60 * 1000,  // 1 minute
  search: 10 * 60 * 1000   // 10 minutes
};

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
};

// Helper: Get quote (live with mock fallback)
async function fetchQuote(symbol) {
  const sym = symbol.toUpperCase().trim();
  const now = Date.now();

  // Check cache
  if (quoteCache[sym] && quoteCache[sym].expiry > now) {
    return quoteCache[sym].data;
  }

  let data = null;
  try {
    // Attempt live quote
    data = await yahooFinance.quote(sym, {}, { fetchOptions: { headers: BROWSER_HEADERS } });
    console.log(`[LIVE] Fetched quote for ${sym}: $${data.regularMarketPrice}`);
  } catch (error) {
    console.warn(`[FALLBACK] Live quote failed for ${sym}, using mock. Error:`, error.message);
    data = await mockFinance.quote(sym);
  }

  // Cache result
  quoteCache[sym] = {
    data,
    expiry: now + CACHE_TIMES.quote
  };

  return data;
}

// Helper: Get chart (live with mock fallback)
async function fetchChart(symbol, period1, interval) {
  const sym = symbol.toUpperCase().trim();
  const cacheKey = `${sym}_${period1}_${interval}`;
  const now = Date.now();

  // Check cache
  if (chartCache[cacheKey] && chartCache[cacheKey].expiry > now) {
    return chartCache[cacheKey].data;
  }

  let data = null;
  try {
    // Attempt live chart
    data = await yahooFinance.chart(
      sym,
      { period1, interval },
      { fetchOptions: { headers: BROWSER_HEADERS } }
    );
    console.log(`[LIVE] Fetched chart for ${sym} (period1: ${period1}, interval: ${interval})`);
  } catch (error) {
    console.warn(`[FALLBACK] Live chart failed for ${sym}, using mock. Error:`, error.message);
    data = await mockFinance.chart(sym, { period1, interval });
  }

  // Cache result
  chartCache[cacheKey] = {
    data,
    expiry: now + CACHE_TIMES.chart
  };

  return data;
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Transaction History (GET, POST, DELETE)
app.get('/api/portfolio/transactions', (req, res) => {
  try {
    const transactions = getTransactions();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/portfolio/transactions', (req, res) => {
  try {
    const { symbol, type, quantity, price, date } = req.body;
    const transaction = addTransaction({ symbol, type, quantity, price, date });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/portfolio/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteTransaction(id);
    if (deleted) {
      res.json({ message: 'Transaction deleted successfully' });
    } else {
      res.status(404).json({ error: 'Transaction not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Portfolio holdings aggregator & totals
app.get('/api/portfolio/holdings', async (req, res) => {
  try {
    const transactions = getTransactions();
    const holdingsMap = {};

    // Sort transactions chronologically
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const t of sortedTransactions) {
      const sym = t.symbol.toUpperCase();
      if (!holdingsMap[sym]) {
        holdingsMap[sym] = {
          symbol: sym,
          shares: 0,
          totalCost: 0,
          averageCost: 0
        };
      }

      const h = holdingsMap[sym];
      if (t.type === 'BUY') {
        h.shares += t.quantity;
        h.totalCost += t.quantity * t.price;
        h.averageCost = h.shares > 0 ? h.totalCost / h.shares : 0;
      } else if (t.type === 'SELL') {
        h.shares = Math.max(0, h.shares - t.quantity);
        h.totalCost = h.shares * h.averageCost; // reduce total cost proportionally
        if (h.shares === 0) {
          h.averageCost = 0;
        }
      }
    }

    // Filter to active holdings
    const activeHoldingsList = Object.values(holdingsMap).filter(h => h.shares > 0);

    // Fetch quotes for all holdings
    const holdings = await Promise.all(activeHoldingsList.map(async (h) => {
      try {
        const quote = await fetchQuote(h.symbol);
        const currentPrice = quote.regularMarketPrice || h.averageCost;
        const change = quote.regularMarketChange || 0;
        const changePercent = quote.regularMarketChangePercent || 0;
        const name = quote.longName || quote.shortName || h.symbol;
        
        // Find sector (use mock sector mapping if live quote doesn't provide it)
        const sector = quote.sector || mockFinance.getSector(h.symbol);

        const currentValue = h.shares * currentPrice;
        const totalGainLoss = currentValue - h.totalCost;
        const totalGainLossPercent = h.totalCost > 0 ? (totalGainLoss / h.totalCost) * 100 : 0;
        const dailyGainLoss = h.shares * change;

        return {
          ...h,
          name,
          sector,
          currentPrice,
          change,
          changePercent,
          currentValue,
          totalGainLoss,
          totalGainLossPercent,
          dailyGainLoss
        };
      } catch (error) {
        // Fallback for failed quote
        return {
          ...h,
          name: h.symbol,
          sector: mockFinance.getSector(h.symbol),
          currentPrice: h.averageCost,
          change: 0,
          changePercent: 0,
          currentValue: h.totalCost,
          totalGainLoss: 0,
          totalGainLossPercent: 0,
          dailyGainLoss: 0
        };
      }
    }));

    // Calculate Portfolio Summary Metrics
    let totalValue = 0;
    let totalCost = 0;
    let totalDailyGainLoss = 0;

    holdings.forEach(h => {
      totalValue += h.currentValue;
      totalCost += h.totalCost;
      totalDailyGainLoss += h.dailyGainLoss;
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    res.json({
      summary: {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        totalDailyGainLoss
      },
      holdings
    });
  } catch (error) {
    console.error('Holdings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Market Indices Endpoint (S&P 500, Nasdaq, Dow Jones)
app.get('/api/market/indices', async (req, res) => {
  const now = Date.now();
  if (indicesCache && indicesCache.expiry > now) {
    return res.json(indicesCache.data);
  }

  const indices = ['^GSPC', '^IXIC', '^DJI'];
  try {
    const data = await Promise.all(indices.map(async (symbol) => {
      const q = await fetchQuote(symbol);
      return {
        symbol: q.symbol,
        name: q.longName || q.shortName || symbol,
        price: q.regularMarketPrice,
        change: q.regularMarketChange,
        changePercent: q.regularMarketChangePercent
      };
    }));

    indicesCache = {
      data,
      expiry: now + CACHE_TIMES.indices
    };

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Stock Details Quote Endpoint
app.get('/api/market/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const q = await fetchQuote(symbol);
    res.json(q);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Stock Historical chart endpoint
app.get('/api/market/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe } = req.query; // 1D, 1M, 6M, 1Y, 5Y

    const now = new Date();
    let period1 = new Date();
    let interval = '1d';

    switch (timeframe) {
      case '1D':
        period1.setDate(now.getDate() - 1);
        interval = '5m';
        break;
      case '1M':
        period1.setMonth(now.getMonth() - 1);
        interval = '1d';
        break;
      case '6M':
        period1.setMonth(now.getMonth() - 6);
        interval = '1d';
        break;
      case '1Y':
        period1.setFullYear(now.getFullYear() - 1);
        interval = '1d'; // Using daily candles for 1Y
        break;
      case '5Y':
        period1.setFullYear(now.getFullYear() - 5);
        interval = '1mo';
        break;
      default:
        period1.setMonth(now.getMonth() - 1);
        interval = '1d';
    }

    // Format period1 as YYYY-MM-DD
    const period1Str = period1.toISOString().split('T')[0];

    const chartData = await fetchChart(symbol, period1Str, interval);
    res.json(chartData);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Stock Autocomplete Search Endpoint
app.get('/api/market/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.json({ quotes: [] });
    }

    const queryStr = q.trim().toLowerCase();
    const now = Date.now();

    // Check cache
    if (searchCache[queryStr] && searchCache[queryStr].expiry > now) {
      return res.json(searchCache[queryStr].data);
    }

    let result = null;
    try {
      result = await yahooFinance.search(queryStr, {}, { fetchOptions: { headers: BROWSER_HEADERS } });
      console.log(`[LIVE] Autocomplete search for "${queryStr}" returned ${result.quotes ? result.quotes.length : 0} results`);
    } catch (error) {
      console.warn(`[FALLBACK] Autocomplete search failed for "${queryStr}", using mock. Error:`, error.message);
      result = await mockFinance.search(queryStr);
    }

    searchCache[queryStr] = {
      data: result,
      expiry: now + CACHE_TIMES.search
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend Express server is running on port ${PORT}`);
});
