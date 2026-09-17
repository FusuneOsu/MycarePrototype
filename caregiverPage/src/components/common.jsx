export function Brand() {
  return <div className="brand"><img src="/logo.jpg" alt="My CareGivers logo" /><span>My CareGivers</span></div>;
}

export function Avatar({ initials, tone = '' }) {
  return <span className={`avatar ${tone}`}>{initials}</span>;
}

export function Toast({ message }) {
  return <div className={`toast ${message ? 'show' : ''}`} role="status">{message}</div>;
}
