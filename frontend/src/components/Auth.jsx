import { useState } from 'react';
import { 
  TrendingUp, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  LogIn, 
  UserPlus 
} from 'lucide-react';

function Auth({ apiPrefix, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple email validator
  const validateEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Input Validations
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(`${apiPrefix}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please try again.');
      }

      // Pass user and token back to App component
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      console.error('[AUTH ERROR]:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeContent: 'center',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.1) 0%, rgba(13, 15, 30, 1) 70%)',
      padding: '1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Dynamic Background Blur Accents */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '280px',
        height: '280px',
        background: 'rgba(99, 102, 241, 0.08)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '320px',
        height: '320px',
        background: 'rgba(168, 85, 247, 0.06)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Authentication Card */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        zIndex: 1,
        position: 'relative'
      }}>
        {/* Brand header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.25rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--color-primary) 0%, rgba(168, 85, 247, 1) 100%)', 
            color: '#fff', 
            padding: '0.75rem', 
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
            marginBottom: '1rem',
            display: 'grid',
            placeContent: 'center'
          }}>
            <TrendingUp size={32} />
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-display)' }}>
            ApexVest
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', textAlign: 'center' }}>
            {isLogin ? 'Sign in to access your investment portfolio' : 'Create an account to start tracking assets'}
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Email input group */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Mail size={16} />
              </span>
              <input 
                type="email"
                className="input-field"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password input group */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={16} />
              </span>
              <input 
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}
                disabled={loading}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  right: '1rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only on Signup) */}
          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.45rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Lock size={16} />
                </span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Error Message alert banner */}
          {error && (
            <div style={{ 
              color: 'var(--color-danger)', 
              fontSize: '0.85rem', 
              padding: '0.75rem 1rem', 
              background: 'var(--color-danger-bg)', 
              borderRadius: '8px', 
              border: '1px solid rgba(244, 63, 94, 0.15)',
              marginTop: '0.25rem',
              lineHeight: '140%'
            }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              marginTop: '0.75rem',
              height: '46px',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
            ) : isLogin ? (
              <>
                <LogIn size={18} /> Sign In
              </>
            ) : (
              <>
                <UserPlus size={18} /> Create Account
              </>
            )}
          </button>
        </form>

        {/* Footer selector to switch modes */}
        <div style={{ 
          marginTop: '2rem', 
          borderTop: '1px solid rgba(255,255,255,0.04)', 
          paddingTop: '1.25rem', 
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            onClick={toggleAuthMode}
            style={{ 
              color: 'var(--color-primary)', 
              background: 'none', 
              border: 'none', 
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              marginLeft: '0.25rem',
              textDecoration: 'underline'
            }}
            disabled={loading}
          >
            {isLogin ? 'Create one here' : 'Sign in instead'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;
