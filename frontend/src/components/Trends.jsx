import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import { API_URL } from '../App';

function Trends({ portfolioData, token }) {
  const { summary, holdings = [] } = portfolioData;
  const [benchmarkData, setBenchmarkData] = useState([]);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  // Estimates Beta for mock sectors & popular symbols to calculate portfolio beta
  const getSymbolBeta = (symbol) => {
    const sym = symbol.toUpperCase().trim();
    if (sym === 'NVDA' || sym === 'TSLA') return 1.45;
    if (sym === 'AMD') return 1.35;
    if (sym === 'AAPL' || sym === 'MSFT' || sym === 'GOOGL' || sym === 'META') return 1.15;
    if (sym === 'AMZN') return 1.20;
    if (sym === 'NFLX') return 1.10;
    if (sym === 'BABA') return 0.95;
    if (sym.startsWith('^')) return 1.0;
    return 1.05; // default market average beta
  };

  // Fetch S&P 500 history and user history, then compute normalized performance comparison
  useEffect(() => {
    const fetchBenchmarkComparison = async () => {
      if (holdings.length === 0) {
        setBenchmarkData([]);
        return;
      }

      try {
        setBenchmarkLoading(true);
        // Fetch 1-month history for S&P 500 index and each active symbol
        const [sp500Res, ...histResList] = await Promise.all([
          fetch(`${API_URL}/api/market/history/^GSPC?timeframe=1M`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }).then(res => res.ok ? res.json() : null),
          ...holdings.map(h => 
            fetch(`${API_URL}/api/market/history/${h.symbol}?timeframe=1M`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
              .then(res => res.ok ? res.json() : null)
              .catch(() => null)
          )
        ]);

        if (!sp500Res || !sp500Res.quotes) {
          setBenchmarkData([]);
          return;
        }

        const sp500Quotes = sp500Res.quotes;

        // Compile daily portfolio values
        const dateMap = {};
        histResList.forEach((hist, index) => {
          if (!hist || !hist.quotes) return;
          const shares = holdings[index].shares;

          hist.quotes.forEach(q => {
            const dateStr = new Date(q.date).toISOString().split('T')[0];
            if (!dateMap[dateStr]) {
              dateMap[dateStr] = 0;
            }
            dateMap[dateStr] += q.close * shares;
          });
        });

        // Convert sp500 quotes to easy-to-map structure
        const sp500Map = {};
        sp500Quotes.forEach(q => {
          const dateStr = new Date(q.date).toISOString().split('T')[0];
          sp500Map[dateStr] = q.close;
        });

        // Find intersecting dates
        const sortedDates = Object.keys(dateMap).filter(d => sp500Map[d]).sort();
        
        if (sortedDates.length === 0) {
          setBenchmarkData([]);
          return;
        }

        // Start bases at 100% on the first available date
        const firstDate = sortedDates[0];
        const portfolioBase = dateMap[firstDate];
        const sp500Base = sp500Map[firstDate];

        const comparison = sortedDates.map(date => {
          const portfolioVal = dateMap[date];
          const sp500Val = sp500Map[date];

          const portfolioNorm = (portfolioVal / portfolioBase) * 100 - 100; // % change since start
          const sp500Norm = (sp500Val / sp500Base) * 100 - 100; // % change since start

          return {
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            portfolio: Number(portfolioNorm.toFixed(2)),
            sp500: Number(sp500Norm.toFixed(2))
          };
        });

        setBenchmarkData(comparison);
      } catch (err) {
        console.error('Error compiling benchmark data:', err);
      } finally {
        setBenchmarkLoading(false);
      }
    };

    fetchBenchmarkComparison();
  }, [holdings]);

  // Format Helpers
  const formatCurrency = (val) => {
    if (val === undefined || isNaN(val)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Perform Diagnostics
  const totalValue = summary.totalValue || 0;
  
  // 1. Sector grouping
  const sectorGroups = {};
  holdings.forEach(h => {
    const sec = h.sector || 'Other';
    if (!sectorGroups[sec]) {
      sectorGroups[sec] = 0;
    }
    sectorGroups[sec] += h.currentValue;
  });

  const sectorAllocation = Object.entries(sectorGroups).map(([name, value]) => ({
    name,
    value,
    percent: totalValue > 0 ? (value / totalValue) * 100 : 0
  })).sort((a, b) => b.value - a.value);

  // 2. Top Stock concentration ratio (Top 3)
  const sortedHoldings = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  const top3Val = sortedHoldings.slice(0, 3).reduce((acc, h) => acc + h.currentValue, 0);
  const top3Pct = totalValue > 0 ? (top3Val / totalValue) * 100 : 0;

  // 3. Portfolio Beta calculation
  let weightedBeta = 0;
  holdings.forEach(h => {
    const weight = totalValue > 0 ? h.currentValue / totalValue : 0;
    weightedBeta += weight * getSymbolBeta(h.symbol);
  });

  // 4. Concentration Warnings
  const warnings = [];
  const sectorRisk = sectorAllocation.find(s => s.percent > 50);
  if (sectorRisk) {
    warnings.push({
      type: 'warning',
      title: 'Sector Concentration Risk',
      message: `Your holdings in the "${sectorRisk.name}" sector account for ${sectorRisk.percent.toFixed(1)}% of your portfolio. High sector concentration increases your susceptibility to sector-specific market corrections.`
    });
  }

  const stockRisk = holdings.find(h => totalValue > 0 && (h.currentValue / totalValue) * 100 > 30);
  if (stockRisk) {
    const pct = ((stockRisk.currentValue / totalValue) * 100).toFixed(1);
    warnings.push({
      type: 'warning',
      title: 'Asset Concentration Risk',
      message: `Your position in "${stockRisk.symbol}" represents ${pct}% of your total net worth. Consider trimming or spreading capital to reduce stock-specific downside.`
    });
  }

  if (top3Pct > 75 && holdings.length > 3) {
    warnings.push({
      type: 'info',
      title: 'High Concentration',
      message: `Your top 3 assets represent ${top3Pct.toFixed(1)}% of your portfolio. While concentration can build wealth, diversification is essential to preserve it.`
    });
  }

  // Setup Sector Doughnut Chart
  const sectorChartData = {
    labels: sectorAllocation.map(s => s.name),
    datasets: [
      {
        data: sectorAllocation.map(s => s.value),
        backgroundColor: [
          'rgba(99, 102, 241, 0.85)',  // Indigo
          'rgba(168, 85, 247, 0.85)',  // Purple
          'rgba(6, 182, 212, 0.85)',   // Cyan
          'rgba(16, 185, 129, 0.85)',  // Emerald
          'rgba(245, 158, 11, 0.85)',  // Amber
          'rgba(244, 63, 94, 0.85)'    // Rose
        ],
        borderColor: 'rgba(13, 15, 30, 1)',
        borderWidth: 2
      }
    ]
  };

  const sectorChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#9ca3af',
          font: { size: 11, family: 'Inter' },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 16, 32, 0.95)',
        titleColor: '#9ca3af',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => {
            const val = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = ((val / total) * 100).toFixed(1);
            return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
          }
        }
      }
    }
  };

  // Setup Normalized Benchmark Line Chart
  const benchmarkChartData = {
    labels: benchmarkData.map(b => b.date),
    datasets: [
      {
        label: 'My Portfolio (%)',
        data: benchmarkData.map(b => b.portfolio),
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.15
      },
      {
        label: 'S&P 500 Index (%)',
        data: benchmarkData.map(b => b.sp500),
        borderColor: 'rgba(255, 255, 255, 0.35)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0.15
      }
    ]
  };

  const benchmarkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#9ca3af', font: { size: 11, family: 'Inter' } }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 16, 32, 0.95)',
        titleColor: '#9ca3af',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => ` ${context.dataset.label.split(' (')[0]}: ${context.raw > 0 ? '+' : ''}${context.raw}%`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: '#6b7280', font: { size: 10, family: 'Inter' } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: { 
          color: '#6b7280', 
          font: { size: 10, family: 'Inter' },
          callback: (value) => value + '%'
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>Trends & Diagnostics</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Deep-dive analysis of portfolio volatility, concentration, and performance benchmarks</p>
      </div>

      {holdings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          No diagnostics available. Add stock transactions in the "My Portfolio" tab to populate analysis reports.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Top Diagnostics KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Top 3 Concentration</span>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', margin: 0 }}>
                {top3Pct.toFixed(1)}%
              </h3>
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', marginTop: '0.75rem', overflow: 'hidden' }}>
                <div style={{ width: `${top3Pct}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '3px' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
                Total value represented by top 3 holdings
              </span>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Estimated Portfolio Beta</span>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', margin: 0 }}>
                {weightedBeta.toFixed(2)}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem' }}>
                <span className="trend-badge trend-up" style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.1rem 0.4rem',
                  background: weightedBeta > 1.1 ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                  color: weightedBeta > 1.1 ? 'var(--color-warning)' : 'var(--color-success)'
                }}>
                  {weightedBeta > 1.1 ? 'Market Sensitive' : 'Market Balanced'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs S&P 500 (1.00)</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Sector Diversification</span>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', margin: 0 }}>
                {sectorAllocation.length} Sectors
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '1rem' }}>
                Allocated across {holdings.length} assets
              </span>
            </div>

          </div>

          {/* Core Split Graphs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
            
            {/* Normalized Performance line chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '340px' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Portfolio Comparison</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Normalized performance vs S&P 500 benchmark (1 Month)</p>
              </div>
              <div style={{ flexGrow: 1, position: 'relative', minHeight: '220px' }}>
                {benchmarkLoading ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
                  </div>
                ) : (
                  <Line data={benchmarkChartData} options={benchmarkChartOptions} />
                )}
              </div>
            </div>

            {/* Sector allocations doughnut */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '340px' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Sector Breakdown</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Holdings grouping by industry category</p>
              </div>
              <div style={{ flexGrow: 1, position: 'relative', minHeight: '220px' }}>
                <Doughnut data={sectorChartData} options={sectorChartOptions} />
              </div>
            </div>

          </div>

          {/* Diagnostic Warnings / Diversification Check Card */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.25rem' }}>Portfolio Diagnostic Report</h3>
            
            {warnings.length === 0 ? (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--color-success-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <CheckCircle size={22} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ color: 'var(--color-success)', fontSize: '0.95rem', fontWeight: 600 }}>Healthy Asset Balance</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem', lineHeight: '140%' }}>
                    No critical concentration risks identified. Your investments show standard diversification. Maintaining allocation ratios is key to managing systematic market risk.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {warnings.map((warn, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      alignItems: 'flex-start', 
                      background: warn.type === 'warning' ? 'var(--color-danger-bg)' : 'rgba(255,255,255,0.03)', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      border: warn.type === 'warning' ? '1px solid rgba(244,63,94,0.15)' : '1px solid var(--border-color)' 
                    }}
                  >
                    {warn.type === 'warning' ? (
                      <ShieldAlert size={22} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <Info size={22} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div>
                      <h4 style={{ color: warn.type === 'warning' ? 'var(--color-danger)' : '#fff', fontSize: '0.95rem', fontWeight: 600 }}>
                        {warn.title}
                      </h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem', lineHeight: '140%' }}>
                        {warn.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

export default Trends;
