import React, { useState } from 'react';
import logoIcon from '../assets/logo-icon.png';
import logoText from '../assets/logo-text.png';

const AuthPage = ({ onLogin }) => {
  const [mode,     setMode]     = useState('login');
  const [name,     setName]     = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('user');
  const [error,    setError]    = useState('');

  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem('recywise_users') || '[]'); }
    catch { return []; }
  };

  const handleSubmit = () => {
    if (!name.trim() || !password.trim()) { setError('Please enter a name and password.'); return; }
    const users = getUsers();
    if (mode === 'signup') {
      if (users.find(u => u.name.toLowerCase() === name.trim().toLowerCase())) {
        setError('That name is already taken. Please choose another.'); return;
      }
      const newUser = { name: name.trim(), password, role };
      localStorage.setItem('recywise_users', JSON.stringify([...users, newUser]));
      localStorage.setItem('recywise_current_user', JSON.stringify(newUser));
      onLogin(newUser);
    } else {
      const user = users.find(u =>
        u.name.toLowerCase() === name.trim().toLowerCase() && u.password === password
      );
      if (!user) { setError('Incorrect name or password.'); return; }
      localStorage.setItem('recywise_current_user', JSON.stringify(user));
      onLogin(user);
    }
  };

  const handleKeyDown = e => { if (e.key === 'Enter') handleSubmit(); };
  const switchMode   = m => { setMode(m); setError(''); };

  return (
    <div className="b-page">
      <div className="b-dots" />

      <div className="b-card">

        {/* ── Dark branded header ── */}
        <div className="b-header">
          <div className="b-header-glow" />
          <div className="b-brand">
            <img src={logoIcon} alt="" className="b-brand-icon" />
            <img src={logoText} alt="RecyWise" className="b-brand-text" />
          </div>
          <p className="b-tagline">Recycle Wisely</p>
          <p className="b-smart">Smart Vehicle Recycling</p>
        </div>

        {/* ── White form body ── */}
        <div className="b-body">
          <p className="auth-subtitle">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>

          <div className="auth-mode-toggle">
            <button className={`auth-mode-btn ${mode === 'login'  ? 'active' : ''}`} onClick={() => switchMode('login')}>Login</button>
            <button className={`auth-mode-btn ${mode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>Sign Up</button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label className="auth-label">Name</label>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown} className="auth-input" placeholder="Enter your name" autoFocus />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown} className="auth-input" placeholder="Enter your password" />
          </div>

          {mode === 'signup' && (
            <div className="auth-field">
              <label className="auth-label">Role</label>
              <div className="auth-role-group">
                <button type="button" className={`auth-role-btn ${role === 'user'  ? 'active' : ''}`} onClick={() => setRole('user')}>User</button>
                <button type="button" className={`auth-role-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Admin</button>
              </div>
              <p className="auth-role-hint">Admins can configure labour rates and step times in Settings.</p>
            </div>
          )}

          <button onClick={handleSubmit} className="auth-submit-btn">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>

      <p className="b-credit">© 2026 · 20210741 · W1953980</p>
    </div>
  );
};

export default AuthPage;