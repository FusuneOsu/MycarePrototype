import { useState } from 'react';
import { Brand } from './common.jsx';

const ADMIN_EMAIL = 'admin@mycaregivers.com';
const ADMIN_PASSWORD = 'admin123';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('sarah.tan@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const adminUrl = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5173/';
  const getAccount = () => JSON.parse(window.localStorage.getItem('caregiverAccount') || 'null');

  const submit = (event) => {
    event.preventDefault();
    setError('');

    if (mode === 'up') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      window.localStorage.setItem('caregiverAccount', JSON.stringify({ name, email, password }));
      onAuth({ role: 'caregiver', email, name });
      return;
    }

    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const target = new URL(adminUrl, window.location.origin);
      target.searchParams.set('session', 'admin');
      window.location.assign(target.toString());
      return;
    }

    const account = getAccount();
    const isDefaultCaregiver = email.trim().toLowerCase() === 'sarah.tan@example.com' && password === 'password123';
    const isRegisteredCaregiver = account && email.trim().toLowerCase() === account.email.trim().toLowerCase() && password === account.password;
    if (isDefaultCaregiver || isRegisteredCaregiver) {
      onAuth({ role: 'caregiver', email, name: account?.name || 'Sarah Tan' });
      return;
    }

    setError('Use the demo admin or caregiver account to continue.');
  };

  return <section className="auth">
    <div className="intro"><Brand /><div className="intro-copy"><h1>Care that moves with you.</h1><p>A calmer way for caregivers to stay on top of every visit, task, and person who matters.</p></div><div className="note">Trusted care coordination for every day.</div></div>
    <div className="auth-card"><div className="tabs"><button className={mode === 'in' ? 'active' : ''} onClick={() => setMode('in')}>Sign in</button><button className={mode === 'up' ? 'active' : ''} onClick={() => setMode('up')}>Register</button></div>
      {mode === 'in' ? <div><h2>Welcome back</h2><p>Sign in to continue to your care workspace.</p><form onSubmit={submit}><label className="field">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label className="field"><span className="password">Password <a href="#forgot" onClick={(event) => event.preventDefault()}>Forgot password?</a></span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="primary">Sign in to dashboard</button></form><div className="demo">Admin: admin@mycaregivers.com / admin123<br />Caregiver: sarah.tan@example.com / password123</div></div> : <div><h2>Create your account</h2><p>Join a more connected way to provide care.</p><form onSubmit={submit}><label className="field">Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" required /></label><label className="field">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label className="field">Create password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required /></label><button className="primary">Create caregiver account</button></form></div>}
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  </section>;
}
