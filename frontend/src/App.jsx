import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  TrendingUp, 
  BarChart3, 
  Loader2 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import Markets from './components/Markets';
import Trends from './components/Trends';
import Auth from './components/Auth';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolioData, setPortfolioData] = useState({ summary: {}, holdings: [] });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('apexvest_token') || null);
  const [user, setUser] = useState(null);

  // Verify current user session on load / token change
  const verifySession = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        // Load dashboard data immediately using this token
        await fetchData(token);
      } else {
        // Token expired or invalid
        handleLogout();
      }
    } catch (err) {
      console.error('Session verification error:', err);
      setError('Connection to backend server failed. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifySession();
  }, [token]);

  // Fetch portfolio summary, holdings and transactions
  const fetchData = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken) return;

    try {
      setError(null);
      
      const [holdingsRes, transRes] = await Promise.all([
        fetch(`${API_URL}/api/portfolio/holdings`, {
          headers: {
            'Authorization': `Bearer ${activeToken}`
          }
        }),
        fetch(`${API_URL}/api/portfolio/transactions`, {
          headers: {
            'Authorization': `Bearer ${activeToken}`
          }
        })
      ]);

      if (!holdingsRes.ok || !transRes.ok) {
        throw new Error('Failed to fetch data from API');
      }

      const holdingsJson = await holdingsRes.json();
      const transJson = await transRes.json();

      setPortfolioData(holdingsJson);
      setTransactions(transJson);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Connection to backend server failed. Make sure server is running.');
    }
  };

  // Add transaction helper
  const handleAddTransaction = async (newTx) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${API_URL}/api/portfolio/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTx)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add transaction');
      }

      await fetchData(token); // refresh portfolio and transaction list
      return { success: true };
    } catch (err) {
      console.error('Error adding transaction:', err);
      return { success: false, error: err.message };
    }
  };

  // Delete transaction helper
  const handleDeleteTransaction = async (id) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${API_URL}/api/portfolio/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to delete transaction');
      }

      await fetchData(token); // refresh
      return { success: true };
    } catch (err) {
      console.error('Error deleting transaction:', err);
      return { success: false, error: err.message };
    }
  };

  // Switch tab and scroll to top
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Callback when Auth is successful
  const handleAuthSuccess = (userData, authToken) => {
    localStorage.setItem('apexvest_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  // Sign out helper
  const handleLogout = () => {
    localStorage.removeItem('apexvest_token');
    setToken(null);
    setUser(null);
    setPortfolioData({ summary: {}, holdings: [] });
    setTransactions([]);
    setActiveTab('dashboard');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'grid', placeContent: 'center', minHeight: '60vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="brand-icon" size={48} style={{ animation: 'spin 1.5s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Verifying your secure session...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', marginTop: '2rem' }}>
          <TrendingUp size={48} style={{ color: 'var(--color-danger)', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '0.5rem', color: '#fff' }}>Connection Error</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => verifySession()}>
            Retry Connection
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard portfolioData={portfolioData} onNavigate={handleTabChange} token={token} />;
      case 'portfolio':
        return (
          <Portfolio 
            portfolioData={portfolioData} 
            transactions={transactions} 
            onAddTransaction={handleAddTransaction} 
            onDeleteTransaction={handleDeleteTransaction} 
            token={token}
          />
        );
      case 'markets':
        return <Markets token={token} />;
      case 'trends':
        return <Trends portfolioData={portfolioData} token={token} />;
      default:
        return <Dashboard portfolioData={portfolioData} onNavigate={handleTabChange} token={token} />;
    }
  };

  // Render Login/Signup if not authenticated
  if (!token || !user) {
    return <Auth apiPrefix={API_URL} onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          <div>
            <div className="brand">
              <TrendingUp className="brand-icon" size={28} />
              <span className="brand-name">ApexVest</span>
            </div>

            <nav className="nav-links">
              <button 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleTabChange('dashboard')}
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`}
                onClick={() => handleTabChange('portfolio')}
              >
                <Briefcase size={20} />
                <span>My Portfolio</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'markets' ? 'active' : ''}`}
                onClick={() => handleTabChange('markets')}
              >
                <BarChart3 size={20} />
                <span>Markets</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'trends' ? 'active' : ''}`}
                onClick={() => handleTabChange('trends')}
              >
                <TrendingUp size={20} />
                <span>Trends & Diagnostic</span>
              </button>
            </nav>
          </div>

          {/* Connected User Profile Footer */}
          <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', marginTop: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logged in as</span>
                <span 
                  style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.15rem' }} 
                  title={user?.email}
                >
                  {user?.email}
                </span>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.45rem', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
            <p style={{ marginTop: '1.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>ApexVest v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Add inline spin animation for loader */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
