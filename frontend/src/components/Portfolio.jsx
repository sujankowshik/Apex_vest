import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  X, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { API_URL } from '../App';

function Portfolio({ portfolioData, transactions, onAddTransaction, onDeleteTransaction }) {
  const { summary, holdings = [] } = portfolioData;

  // Add Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Search Autocomplete State
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

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

  // Fetch search suggestions as symbol changes
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (symbol.trim().length >= 2) {
        setSearchLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/market/search?q=${symbol}`);
          if (res.ok) {
            const data = await res.json();
            setSearchResults(data.quotes || []);
            setShowDropdown(true);
          }
        } catch (err) {
          console.error('Failed to search symbol:', err);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [symbol]);

  // Handle stock selection from search dropdown
  const handleSelectSymbol = async (selectedSym) => {
    setSymbol(selectedSym);
    setShowDropdown(false);
    
    // Fetch live quote to auto-populate price
    try {
      const res = await fetch(`${API_URL}/api/market/quote/${selectedSym}`);
      if (res.ok) {
        const quoteData = await res.json();
        if (quoteData && quoteData.regularMarketPrice) {
          setPrice(quoteData.regularMarketPrice.toFixed(2));
        }
      }
    } catch (err) {
      console.error('Failed to fetch price for selected stock:', err);
    }
  };

  // Submit new transaction
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    if (!symbol || !quantity || !price || !date) {
      setFormError('Please fill out all fields.');
      setFormSubmitting(false);
      return;
    }

    const qtyVal = parseFloat(quantity);
    const priceVal = parseFloat(price);

    if (isNaN(qtyVal) || qtyVal <= 0) {
      setFormError('Quantity must be a positive number.');
      setFormSubmitting(false);
      return;
    }

    if (isNaN(priceVal) || priceVal <= 0) {
      setFormError('Price must be a positive number.');
      setFormSubmitting(false);
      return;
    }

    // If type is SELL, check if user has enough shares
    if (type === 'SELL') {
      const currentHolding = holdings.find(h => h.symbol === symbol.toUpperCase().trim());
      if (!currentHolding || currentHolding.shares < qtyVal) {
        const heldShares = currentHolding ? currentHolding.shares : 0;
        setFormError(`Insufficient shares to sell. You currently hold ${heldShares.toFixed(2)} shares of ${symbol.toUpperCase()}.`);
        setFormSubmitting(false);
        return;
      }
    }

    const txPayload = {
      symbol: symbol.toUpperCase().trim(),
      type,
      quantity: qtyVal,
      price: priceVal,
      date
    };

    const result = await onAddTransaction(txPayload);
    setFormSubmitting(false);

    if (result.success) {
      // Clear form and close modal
      setSymbol('');
      setType('BUY');
      setQuantity('');
      setPrice('');
      setDate(new Date().toISOString().split('T')[0]);
      setIsModalOpen(false);
    } else {
      setFormError(result.error || 'Failed to submit transaction.');
    }
  };

  const formatCurrency = (val) => {
    if (val === undefined || isNaN(val)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header section with add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>My Portfolio</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage holdings and record investment transactions</p>
        </div>
        
        <button 
          className="btn btn-primary" 
          style={{ padding: '0.65rem 1.25rem' }}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} /> Record Transaction
        </button>
      </div>

      {/* Holdings Overview Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.25rem' }}>Current Asset Positions</h3>
        
        {holdings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            No active positions. Click "Record Transaction" above to add stocks to your portfolio.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Avg Cost</th>
                  <th>Total Cost</th>
                  <th>Current Price</th>
                  <th>Market Value</th>
                  <th>Gain / Loss</th>
                  <th>Daily Return</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => {
                  const isUpTotal = h.totalGainLoss >= 0;
                  const isUpDaily = h.change >= 0;
                  return (
                    <tr key={h.symbol}>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{h.symbol}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{h.name}</td>
                      <td>{h.shares.toFixed(4)}</td>
                      <td>{formatCurrency(h.averageCost)}</td>
                      <td>{formatCurrency(h.totalCost)}</td>
                      <td style={{ fontWeight: 500 }}>{formatCurrency(h.currentPrice)}</td>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(h.currentValue)}</td>
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
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: isUpDaily ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {formatCurrency(h.dailyGainLoss)}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: isUpDaily ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {isUpDaily ? '+' : ''}{h.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History log */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1.25rem' }}>Transaction History</h3>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
            No transaction records found.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>Action</th>
                  <th>Quantity</th>
                  <th>Execution Price</th>
                  <th>Total Cost/Proceeds</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => {
                  return (
                    <tr key={tx.id}>
                      <td>{new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td style={{ fontWeight: 700, color: '#fff' }}>{tx.symbol}</td>
                      <td>
                        <span className={`trend-badge ${tx.type === 'BUY' ? 'trend-up' : 'trend-down'}`} style={{ fontSize: '0.75rem', padding: '0.1rem 0.45rem' }}>
                          {tx.type}
                        </span>
                      </td>
                      <td>{tx.quantity.toFixed(4)}</td>
                      <td>{formatCurrency(tx.price)}</td>
                      <td style={{ fontWeight: 500 }}>{formatCurrency(tx.quantity * tx.price)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn" 
                          style={{ color: 'var(--text-muted)', hover: { color: 'var(--color-danger)' }, padding: '0.2rem' }}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete this ${tx.type} transaction for ${tx.symbol}?`)) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal Overlay */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 6, 12, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'grid',
          placeContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '2rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            position: 'relative'
          }}>
            {/* Close button */}
            <button 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-secondary)' }}
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Record Transaction</h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Autocomplete Symbol Search */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Stock Ticker
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Search e.g. AAPL, MSFT"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    style={{ paddingRight: '2.5rem' }}
                    autoComplete="off"
                  />
                  <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    {searchLoading ? <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Search size={16} />}
                  </div>
                </div>

                {/* Dropdown list */}
                {showDropdown && searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    background: 'rgba(15, 17, 34, 0.95)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    zIndex: 20,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '0.25rem'
                  }}>
                    {searchResults.map(item => (
                      <div 
                        key={item.symbol}
                        style={{
                          padding: '0.75rem 1rem',
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
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.shortname || item.longname}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.exchange}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Type BUY/SELL Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Transaction Type
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    className={`btn ${type === 'BUY' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '0.5rem' }}
                    onClick={() => setType('BUY')}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    className={`btn ${type === 'SELL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ 
                      flex: 1, 
                      padding: '0.5rem',
                      background: type === 'SELL' ? 'var(--color-danger)' : 'rgba(255,255,255,0.05)',
                      boxShadow: type === 'SELL' ? '0 4px 14px rgba(244,63,94,0.4)' : 'none'
                    }}
                    onClick={() => setType('SELL')}
                  >
                    SELL
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Shares Quantity
                </label>
                <input 
                  type="number"
                  step="any"
                  className="input-field"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              {/* Price Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Price per Share ($)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <DollarSign size={16} />
                  </span>
                  <input 
                    type="number"
                    step="any"
                    className="input-field"
                    style={{ paddingLeft: '2rem' }}
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Transaction Date
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Calendar size={16} />
                  </span>
                  <input 
                    type="date"
                    className="input-field"
                    style={{ paddingLeft: '2.2rem' }}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {formError && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', padding: '0.5rem', background: 'var(--color-danger-bg)', borderRadius: '6px' }}>
                  {formError}
                </div>
              )}

              {/* Submit button */}
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={formSubmitting}
              >
                {formSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> : 'Record Position'}
              </button>

            </form>
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

export default Portfolio;
