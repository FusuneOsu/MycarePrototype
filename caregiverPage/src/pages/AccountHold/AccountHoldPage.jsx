import { Brand } from '../../components/common.jsx';

const COPY = {
  Suspended: ['Your account is suspended', 'You will not receive new bookings while your account is suspended. Your profile and history are kept, and your coordinator can reactivate you at any time.'],
  Deactivated: ['Your account is deactivated', 'You are no longer in the booking pool. Your records are kept. Contact your coordinator if you think this is a mistake.'],
};

export default function AccountHoldPage({ hold, name, onLogout, onRefresh }) {
  const [title, message] = COPY[hold.state] || COPY.Suspended;
  return <section className="status-page">
    <header className="apply-top"><Brand /><div className="status-top-actions"><button type="button" className="back" onClick={onRefresh}>Check for updates</button><button type="button" className="back" onClick={onLogout}>Log out</button></div></header>
    <div className="status-shell">
      <div className="status-card panel">
        <p className="eyebrow">{name} · since {new Date(hold.since).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        <h1>{title}</h1>
        <p className="status-message">{message}</p>
        <div className="status-note status-note--warn"><strong>Reason from your coordinator</strong><p>{hold.reason}</p></div>
      </div>
    </div>
  </section>;
}
