import { useState } from 'react';
import { Brand } from './common.jsx';
import { completePasswordReset, requestPasswordReset } from '../data/applicationData.js';
import { notify } from '../../../shared/bookingStore.js';

/**
 * Password recovery, in two steps: ask for the registered email, then set a new
 * password using the token from the recovery link.
 *
 * Like every other outbound message in this prototype, the email is *simulated*
 * — it is written to the notification store rather than handed to an SMTP or
 * API provider, because none is configured. The recovery link is shown on
 * screen so the flow can be walked end to end in a demo. Swap `deliver()` for
 * the real mail call and drop the on-screen link when a provider lands; nothing
 * else in this component needs to change.
 */
function deliver(reset, link) {
  notify({
    audience: 'caregiver',
    to: reset.email,
    channel: 'Email',
    title: 'Reset your My CareGivers password',
    body: `Hi ${reset.name || 'there'}, we received a request to reset your password. Open ${link} to choose a new one. This link expires in 30 minutes. If you did not ask for this, you can ignore this email.`,
  });
}

export default function ForgotPassword({ email: initialEmail = '', onDone, onCancel, onNotify }) {
  const [stage, setStage] = useState('request'); // request | sent | reset
  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState('');
  const [link, setLink] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const send = (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }

    const reset = requestPasswordReset(email);
    if (reset) {
      const url = new URL(window.location.href);
      url.searchParams.set('reset', reset.token);
      url.searchParams.set('email', reset.email);
      deliver(reset, url.toString());
      setLink(url.toString());
    }
    // Shown whether or not the address is registered, so the form never
    // discloses which emails have accounts.
    setStage('sent');
  };

  const save = (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirm) { setError('Both passwords must match.'); return; }

    const result = completePasswordReset(email, token.trim(), password);
    if (!result.ok) { setError(result.error); return; }
    onNotify('Your password has been updated. Please sign in.');
    onDone();
  };

  return <section className="auth">
    <div className="intro">
      <Brand />
      <div className="intro-copy"><h1>Let’s get you back in.</h1><p>We’ll send a recovery link to the email address on your account.</p></div>
      <div className="note">Trusted care coordination for every day.</div>
    </div>

    <div className="auth-card">
      <div className="tabs"><button type="button" onClick={onCancel}>Sign in</button><button className="active">Reset password</button></div>

      {stage === 'request' && <>
        <h2>Forgot your password?</h2>
        <p>Enter the email you registered with and we’ll send you a link to choose a new password.</p>
        <form onSubmit={send}>
          <label className="field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
          <button className="primary">Send recovery email</button>
        </form>
      </>}

      {stage === 'sent' && <>
        <h2>Check your inbox</h2>
        <p>If an account exists for <strong>{email}</strong>, we’ve sent a recovery link there. It expires in 30 minutes.</p>
        {link && <div className="status-note reset-preview">
          <strong>Prototype: no mail provider is connected</strong>
          <p>The email was recorded instead of sent. Use the link below to continue.</p>
          <a className="job-link reset-preview__link" href={link}>{link}</a>
        </div>}
        <button type="button" className="primary" onClick={() => setStage('reset')}>I have my recovery code</button>
        <p className="apply-note">Didn’t get it? <button type="button" className="link-button" onClick={() => setStage('request')}>Try another email address</button></p>
      </>}

      {stage === 'reset' && <>
        <h2>Choose a new password</h2>
        <p>Paste the code from your recovery link, then set a new password for <strong>{email}</strong>.</p>
        <form onSubmit={save}>
          <label className="field"><span>Recovery code</span><input type="text" value={token} onChange={(event) => setToken(event.target.value)} placeholder="From your recovery link" required /></label>
          <label className="field"><span>New password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required /></label>
          <label className="field"><span>Confirm new password</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>
          <button className="primary">Update password</button>
        </form>
      </>}

      {error && <p className="auth-error" role="alert">{error}</p>}
      <p className="apply-cta">Remembered it? <button type="button" className="link-button" onClick={onCancel}>Back to sign in ›</button></p>
    </div>
  </section>;
}
