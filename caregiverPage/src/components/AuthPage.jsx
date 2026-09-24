import { useState } from 'react';
import { Brand } from './common.jsx';
import { findApplicationByLogin } from '../data/applicationData.js';

const ADMIN_EMAIL = 'admin@mycaregivers.com';
const ADMIN_PASSWORD = 'admin123';

export default function AuthPage({ onAuth, onApply }) {
  const [email, setEmail] = useState('sarah.tan@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const adminUrl = '/';

  const submit = (event) => {
    event.preventDefault();
    setError('');

    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const target = new URL(adminUrl, window.location.origin);
      target.searchParams.set('session', 'admin');
      window.location.assign(target.toString());
      return;
    }

    if (email.trim().toLowerCase() === 'sarah.tan@example.com' && password === 'password123') {
      onAuth({ role: 'caregiver', email: 'sarah.tan@example.com', name: 'Sarah Tan' });
      return;
    }

    // Applicants sign in with the account they created in step 1 of the wizard.
    const application = findApplicationByLogin(email, password);
    if (application) {
      onAuth({ role: 'caregiver', email: application.data.email, name: application.data.fullName });
      return;
    }

    setError('We could not find an account with those details.');
  };

  return <section className="auth">
    <div className="intro"><Brand /><div className="intro-copy"><h1>Care that moves with you.</h1><p>A calmer way for caregivers to stay on top of every visit, task, and person who matters.</p></div><div className="note">Trusted care coordination for every day.</div></div>
    <div className="auth-card">
      <div className="tabs"><button className="active">Sign in</button><button onClick={onApply}>Apply to join</button></div>
      <h2>Welcome back</h2><p>Sign in to continue to your care workspace, or to pick up an application you started.</p>
      <form onSubmit={submit}>
        <label className="field"><span className="password">Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span className="password">Password <a href="#forgot" onClick={(event) => event.preventDefault()}>Forgot password?</a></span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <button className="primary">Sign in</button>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <p className="apply-cta">New to My CareGivers? <button type="button" className="link-button" onClick={onApply}>Apply to join as a caregiver ›</button></p>
      <div className="demo">Admin: admin@mycaregivers.com / admin123<br />Caregiver: sarah.tan@example.com / password123</div>
    </div>
  </section>;
}
