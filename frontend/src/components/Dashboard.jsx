import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Briefcase,
  Loader2
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { API_URL } from '../App';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

function Dashboard({ portfolioData, onNavigate }) {
  const { summary, holdings = [] } = portfolioData;
  const [indices, setIndices] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch market indices
  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const res = await fetch(`${API_URL}/api/market/indices`);
        if (res.ok) {
          const data = await res.json();
          setIndices(data);
        }
      } catch (err) {
        console.error('Error fetching indices:', err);
      }
    };

    fetchIndices();
    const interval = setInterval(fetchIndices, 60000); // refresh indices every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch historical data for all holdings to construct net worth line chart
  useEffect(() => {
    const fetchPortfolioHistory = async () => {
      if (holdings.length === 0) {
        setHistoryData([]);
        return;
      }

      try {
        setHistoryLoading(true);
        // Fetch 1-month history for each active symbol
        const historyPromises = holdings.map(h => 
          fetch(`${API_URL}/api/market/history/${h.symbol}?timeframe=1M`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );

        const histories = await Promise.all(historyPromises);
        
        // Align historical prices by date and multiply by shares
        const dateMap = {};

        histories.forEach((hist, index) => {
          if (!hist || !hist.quotes) return;
          const shares = holdings[index].shares;

          hist.quotes.forEach(q => {
            const dateStr = new Date(q.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dateMap[dateStr]) {
              dateMap[dateStr] = 0;
            }
            dateMap[dateStr] += q.close * shares;
          });
        });

        // Convert dateMap to sorted list of { date, value }
        const formattedHistory = Object.entries(dateMap).map(([date, val]) => ({
          date,
          value: Number(val.toFixed(2))
        }));

        setHistoryData(formattedHistory);
      } catch (err) {
        console.error('Error compiling history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchPortfolioHistory();
  }, [holdings]);

  // Format monetary value
  const formatCurrency = (val) => {
    if (val === undefined || isNaN(val)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Setup Line Chart Data (Portfolio History)
  const lineChartData = {
    labels: historyData.map(h => h.date),
    datasets: [
      {
        label: 'Portfolio Value ($)',
        data: historyData.map(h => h.value),
        fill: true,
        borderColor: 'rgba(99, 102, 241, 1)', // Glow primary
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(99, 102, 241, 1)',
        pointRadius: historyData.length > 30 ? 0 : 3,
        pointHoverRadius: 6,
        tension: 0.25,
      },
    ],
  };

  const lineChartOptions = {
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
          label: (context) => `Value: ${formatCurrency(context.raw)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: '#6b7280', font: { size: 11, family: 'Inter' } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: { 
          color: '#6b7280', 
          font: { size: 11, family: 'Inter' },
          callback: (value) => '$' + value
        }
      }
    }
  };

  // Setup Doughnut Chart Data (Asset Allocation)
  const doughnutChartData = {
    labels: holdings.map(h => h.symbol),
    datasets: [
      {
        data: holdings.map(h => h.currentValue),
        backgroundColor: [
          'rgba(99, 102, 241, 0.85)',  // Indigo
          'rgba(6, 182, 212, 0.85)',   // Cyan
          'rgba(168, 85, 247, 0.85)',  // Purple
          'rgba(16, 185, 129, 0.85)',  // Emerald
          'rgba(245, 158, 11, 0.85)',  // Amber
          'rgba(244, 63, 94, 0.85)'    // Rose
        ],
        borderColor: 'rgba(13, 15, 30, 1)',
        borderWidth: 2.5,
        hoverOffset: 6
      }
    ]
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9ca3af',
          font: { size: 11, family: 'Inter' },
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 16, 32, 0.95)',
        titleColor: '#9ca3af',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const val = context.raw;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = ((val / total) * 100).toFixed(1);
            return ` ${context.label}: ${formatCurrency(val)} (${pct}%)`;
          }
        }
      }
    },
    cutout: '65%'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Market Indices Ticker */}
      <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', padding: '1rem 1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>Market Status</span>
          <span className="trend-badge trend-up" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>Open</span>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', flexGrow: 1, justifyContent: 'flex-end' }}>
          {indices.map(index => {
            const isUp = index.change >= 0;
            return (
              <div key={index.symbol} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{index.name.replace(' Index', '')}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{index.price ? index.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', fontWeight: 600, color: isUp ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {isUp ? '+' : ''}{index.changePercent ? index.changePercent.toFixed(2) : '0.00'}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Top Summary KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        
        {/* KPI 1: Net Worth */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Portfolio Value</span>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', padding: '0.4rem', borderRadius: '8px' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.2rem 0', fontFamily: 'var(--font-display)' }}>
            {formatCurrency(summary.totalValue || 0)}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Aggregate live holdings</span>
        </div>

        {/* KPI 2: Total Returns */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Return</span>
            <div style={{ 
              background: (summary.totalGainLoss || 0) >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', 
              color: (summary.totalGainLoss || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)', 
              padding: '0.4rem', 
              borderRadius: '8px' 
            }}>
              {(summary.totalGainLoss || 0) >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
          </div>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            margin: '0.2rem 0', 
            fontFamily: 'var(--font-display)',
            color: (summary.totalGainLoss || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
          }}>
            {formatCurrency(summary.totalGainLoss || 0)}
          </h2>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600, color: (summary.totalGainLoss || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {(summary.totalGainLoss || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {summary.totalGainLossPercent ? summary.totalGainLossPercent.toFixed(2) : '0.00'}% (All-time)
          </span>
        </div>

        {/* KPI 3: Daily Change */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Daily Performance</span>
            <div style={{ 
              background: (summary.totalDailyGainLoss || 0) >= 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', 
              color: (summary.totalDailyGainLoss || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)', 
              padding: '0.4rem', 
              borderRadius: '8px' 
            }}>
              {(summary.totalDailyGainLoss || 0) >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
          </div>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            margin: '0.2rem 0', 
            fontFamily: 'var(--font-display)',
            color: (summary.totalDailyGainLoss || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
          }}>
            {formatCurrency(summary.totalDailyGainLoss || 0)}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily market drift return</span>
        </div>

        {/* KPI 4: Asset count */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Assets</span>
            <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--color-purple)', padding: '0.4rem', borderRadius: '8px' }}>
              <PieChart size={18} />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.2rem 0', fontFamily: 'var(--font-display)' }}>
            {holdings.length}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Across {new Set(holdings.map(h => h.sector)).size} sectors
          </span>
        </div>

      </div>

      {/* 3. Main Chart Split Section */}
      {holdings.length === 0 ? (
        // Empty State card
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'var(--color-primary-glow)', padding: '1.5rem', borderRadius: '50%', color: 'var(--color-primary)' }}>
            <Briefcase size={48} />
          </div>
          <div>
            <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Build Your Portfolio</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: '0 auto', fontSize: '0.95rem' }}>
              You don't have any recorded transactions yet. Add stock transactions to track your assets, analyze allocations, and view performance history.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('portfolio')}>
            <Plus size={18} /> Add Your First Stock
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
          
          {/* Net Worth Line Chart */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Portfolio Net Worth</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Aggregated historical chart (1 Month)</p>
              </div>
            </div>
            <div style={{ flexGrow: 1, position: 'relative' }}>
              {historyLoading ? (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center' }}>
                  <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
                </div>
              ) : (
                <Line data={lineChartData} options={lineChartOptions} />
              )}
            </div>
          </div>

          {/* Allocation Doughnut Chart */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Asset Allocation</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Distribution of total portfolio value</p>
            </div>
            <div style={{ flexGrow: 1, position: 'relative', minHeight: '220px' }}>
              <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
            </div>
          </div>

        </div>
      )}

      {/* 4. Bottom Active Holdings Watchlist Table */}
      {holdings.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>My Portfolio Holdings</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Key metrics for currently held tickers</p>
            </div>
            <button className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => onNavigate('portfolio')}>
              Manage Holdings
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Quantity</th>
                  <th>Average Cost</th>
                  <th>Current Price</th>
                  <th>Market Value</th>
                  <th>Total Returns</th>
                  <th>Daily Returns</th>
                </tr>
              </thead>
              <tbody>
                {holdings.slice(0, 5).map(h => {
                  const isUpTotal = h.totalGainLoss >= 0;
                  const isUpDaily = h.change >= 0;
                  return (
                    <tr key={h.symbol}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: '#fff' }}>{h.symbol}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{h.name}</span>
                        </div>
                      </td>
                      <td>{h.shares.toFixed(2)}</td>
                      <td>{formatCurrency(h.averageCost)}</td>
                      <td style={{ fontWeight: 500 }}>{formatCurrency(h.currentPrice)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(h.currentValue)}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: isUpTotal ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {formatCurrency(h.totalGainLoss)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: isUpTotal ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {isUpTotal ? '+' : ''}{h.totalGainLossPercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', fontWeight: 600, color: isUpDaily ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {isUpDaily ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {isUpDaily ? '+' : ''}{h.changePercent.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
