import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { API_URL } from '../App';

function Markets() {
  const [symbol, setSymbol] = useState('AAPL');
  const [searchVal, setSearchVal] = useState('');
  const [quoteData, setQuoteData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [timeframe, setTimeframe] = useState('1M'); // 1D, 1M, 6M, 1Y, 5Y
  
  // States for search and loading
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState(null);

  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchVal.trim().length >= 2) {
        setSearchLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/market/search?q=${searchVal}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.quotes || []);
            setShowDropdown(true);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchVal]);

  // Load quote and history
  const loadSymbolData = async (sym) => {
    try {
      setPageLoading(true);
      setError(null);

      const [quoteRes, histRes] = await Promise.all([
        fetch(`${API_URL}/api/market/quote/${sym}`),
        fetch(`${API_URL}/api/market/history/${sym}?timeframe=${timeframe}`)
      ]);

      if (!quoteRes.ok || !histRes.ok) {
        throw new Error(`Failed to load data for ticker ${sym}`);
      }

      const qJson = await quoteRes.json();
      const hJson = await histRes.json();

      setQuoteData(qJson);
      setHistoryData(hJson.quotes || []);
    } catch (err) {
      console.error(err);
      setError(`Could not find symbol "${sym}". It may be delisted or invalid.`);
    } finally {
      setPageLoading(false);
    }
  };

  // Re-fetch only history when timeframe changes
  useEffect(() => {
    const fetchHistoryOnly = async () => {
      if (!symbol) return;
      try {
        setChartLoading(true);
        const res = await fetch(`${API_URL}/api/market/history/${symbol}?timeframe=${timeframe}`);
        if (res.ok) {
          const data = await res.json();
          setHistoryData(data.quotes || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChartLoading(false);
      }
    };

    fetchHistoryOnly();
  }, [timeframe, symbol]);

  // Initial load
  useEffect(() => {
    loadSymbolData(symbol);
  }, []);

  const handleSelectSymbol = (selectedSym) => {
    setSymbol(selectedSym);
    setSearchVal('');
    setShowDropdown(false);
    loadSymbolData(selectedSym);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      handleSelectSymbol(searchVal.toUpperCase().trim());
    }
  };

  // Format Helper functions
  const formatCurrency = (val) => {
    if (val === undefined || isNaN(val)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatLargeNum = (num) => {
    if (!num) return 'N/A';
    if (num >= 1.0e12) return (num / 1.0e12).toFixed(2) + 'T';
    if (num >= 1.0e9) return (num / 1.0e9).toFixed(2) + 'B';
    if (num >= 1.0e6) return (num / 1.0e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  // Setup Chart Data
  const chartLabels = historyData.map(q => {
    const dateObj = new Date(q.date);
    if (timeframe === '1D') {
      return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: timeframe === '5Y' ? '2-digit' : undefined });
  });

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: `${symbol} Price`,
        data: historyData.map(q => q.close),
        fill: true,
        borderColor: (quoteData?.regularMarketChange || 0) >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(244, 63, 94, 1)',
        backgroundColor: (quoteData?.regularMarketChange || 0) >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.05)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.15,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 16, 32, 0.95)',
        titleColor: '#9ca3af',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        fontFamily: 'Inter',
        callbacks: {
          label: (context) => `Close: ${formatCurrency(context.raw)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { 
          color: '#6b7280', 
          font: { size: 10, family: 'Inter' },
          maxTicksLimit: timeframe === '1D' ? 6 : 8 
        }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: { 
          color: '#6b7280', 
          font: { size: 10, family: 'Inter' },
          callback: (value) => '$' + value
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Search Header Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>Market Research</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Search tickers, analyze key ratios, and check historical price trends</p>
        </div>

        {/* Big Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '100%', maxWidth: '380px' }} ref={dropdownRef}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search ticker symbol (e.g. NVDA, MSFT)"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              style={{ paddingLeft: '2.75rem', borderRadius: '30px', height: '46px', background: 'rgba(22, 24, 47, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              autoComplete="off"
            />
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={18} />
            </div>
            {searchVal && (
              <button 
                type="button"
                onClick={() => setSearchVal('')}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Autocomplete suggestions */}
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '100%',
              background: 'rgba(15, 17, 34, 0.98)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              zIndex: 100,
              maxHeight: '260px',
              overflowY: 'auto',
              marginTop: '0.5rem'
            }}>
              {searchResults.map(item => (
                <div 
                  key={item.symbol}
                  style={{
                    padding: '0.85rem 1.25rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => handleSelectSymbol(item.symbol)}
                  className="dropdown-item-hover"
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{item.symbol}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.shortname || item.longname}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    {item.exchange}
                  </span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {error ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <TrendingUp size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>Symbol Not Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => handleSelectSymbol('AAPL')}>
            Reset to AAPL
          </button>
        </div>
      ) : pageLoading ? (
        <div style={{ display: 'grid', placeContent: 'center', minHeight: '50vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fetching asset analytics...</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Main Info Header Grid */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>{quoteData?.symbol}</h1>
                <span className="trend-badge trend-up" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)' }}>
                  {quoteData?.quoteType || 'EQUITY'}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                {quoteData?.longName || quoteData?.shortName}
              </p>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Exchange: {quoteData?.exchange} • Currency: {quoteData?.currency}
              </span>
            </div>

            {/* Price section */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  {formatCurrency(quoteData?.regularMarketPrice)}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                <span className={`trend-badge ${(quoteData?.regularMarketChange || 0) >= 0 ? 'trend-up' : 'trend-down'}`}>
                  {(quoteData?.regularMarketChange || 0) >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {quoteData?.regularMarketChange ? quoteData.regularMarketChange.toFixed(2) : '0.00'} (
                  {quoteData?.regularMarketChangePercent ? quoteData.regularMarketChangePercent.toFixed(2) : '0.00'}%)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Today</span>
              </div>
            </div>
          </div>

          {/* Timeframe line chart */}
          <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '360px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Interactive Price Chart</h3>
              
              {/* Timeframe selector buttons */}
              <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {['1D', '1M', '6M', '1Y', '5Y'].map(tf => (
                  <button
                    key={tf}
                    className={`btn`}
                    style={{ 
                      padding: '0.35rem 0.75rem', 
                      fontSize: '0.8rem', 
                      borderRadius: '6px',
                      background: timeframe === tf ? 'var(--color-primary)' : 'none',
                      color: timeframe === tf ? '#fff' : 'var(--text-secondary)',
                      boxShadow: timeframe === tf ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
                    }}
                    onClick={() => setTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flexGrow: 1, position: 'relative', minHeight: '260px' }}>
              {chartLoading ? (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', zIndex: 10 }}>
                  <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
                </div>
              ) : historyData.length === 0 ? (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', color: 'var(--text-secondary)' }}>
                  No price history available.
                </div>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.25rem' }}>Key Financial Statistics</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Open</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>{formatCurrency(quoteData?.regularMarketOpen)}</span>
              </div>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Prev Close</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>{formatCurrency(quoteData?.regularMarketPreviousClose)}</span>
              </div>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Daily Low / High</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                  {formatCurrency(quoteData?.regularMarketDayLow)} - {formatCurrency(quoteData?.regularMarketDayHigh)}
                </span>
              </div>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>52-Week Range</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                  {formatCurrency(quoteData?.fiftyTwoWeekLow)} - {formatCurrency(quoteData?.fiftyTwoWeekHigh)}
                </span>
              </div>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Market Capitalization</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>{formatLargeNum(quoteData?.marketCap)}</span>
              </div>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Trailing P/E Ratio</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>{quoteData?.trailingPE ? quoteData.trailingPE.toFixed(2) : 'N/A'}</span>
              </div>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Volume (Avg)</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                  {quoteData?.regularMarketVolume ? quoteData.regularMarketVolume.toLocaleString() : 'N/A'}
                </span>
              </div>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Div Yield (Trailing)</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                  {quoteData?.dividendYield ? (quoteData.dividendYield * 100).toFixed(2) + '%' : '0.00%'}
                </span>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Add dropdown hover style */}
      <style>{`
        .dropdown-item-hover:hover {
          background: rgba(99, 102, 241, 0.15) !important;
        }
      `}</style>
    </div>
  );
}

export default Markets;
