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

export const API_URL = 'http://localhost:5001';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolioData, setPortfolioData] = useState({ summary: {}, holdings: [] });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch portfolio summary, holdings and transactions
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [holdingsRes, transRes] = await Promise.all([
        fetch(`${API_URL}/api/portfolio/holdings`),
        fetch(`${API_URL}/api/portfolio/transactions`)
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add transaction helper
  const handleAddTransaction = async (newTx) => {
    try {
      const res = await fetch(`${API_URL}/api/portfolio/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTx)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add transaction');
      }

      await fetchData(); // refresh portfolio and transaction list
      return { success: true };
    } catch (err) {
      console.error('Error adding transaction:', err);
      return { success: false, error: err.message };
    }
  };

  // Delete transaction helper
  const handleDeleteTransaction = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/portfolio/transactions/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to delete transaction');
      }

      await fetchData(); // refresh
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

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'grid', placeContent: 'center', minHeight: '60vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="brand-icon" size={48} style={{ animation: 'spin 1.5s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading financial data...</p>
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
          <button className="btn btn-primary" onClick={fetchData}>
            Retry Connection
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard portfolioData={portfolioData} onNavigate={handleTabChange} />;
      case 'portfolio':
        return (
          <Portfolio 
            portfolioData={portfolioData} 
            transactions={transactions} 
            onAddTransaction={handleAddTransaction} 
            onDeleteTransaction={handleDeleteTransaction} 
          />
        );
      case 'markets':
        return <Markets />;
      case 'trends':
        return <Trends portfolioData={portfolioData} />;
      default:
        return <Dashboard portfolioData={portfolioData} onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
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

        <div className="sidebar-footer">
          <p>ApexVest v1.0.0</p>
          <p style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>Powered by Yahoo Finance</p>
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
