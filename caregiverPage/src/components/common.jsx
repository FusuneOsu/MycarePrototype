export function Brand() {
  return <div className="brand"><img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="My CareGivers logo" /><span>My CareGivers</span></div>;
}

export function Avatar({ initials, tone = '' }) {
  return <span className={`avatar ${tone}`}>{initials}</span>;
}

export function Toast({ message }) {
  return <div className={`toast ${message ? 'show' : ''}`} role="status">{message}</div>;
}

/**
 * Dev only. localStorage is per-origin, so anything submitted on the standalone
 * caregiver server (:5174) is invisible to the admin app (:5173). The admin
 * server proxies /caregiver/, so that is the URL both apps can share data on.
 */
export function OriginNotice() {
  if (!import.meta.env.DEV || window.location.port !== '5174') return null;
  const shared = `http://localhost:5173${window.location.pathname}${window.location.search}`;
  return <div className="origin-notice" role="note">You are on the standalone caregiver server, so applications and profile edits made here will not reach the admin app. <a href={shared}>Open on localhost:5173 instead →</a></div>;
}
