import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/appointments', label: 'Appointments', icon: '▣' },
  { to: '/requests', label: 'Requests', icon: '◌' },
  { to: '/caregivers', label: 'Caregivers', icon: '▥' },
  { to: '/post-op-patients', label: 'Post-Op Patients', icon: '◫' },
  { to: '/payments', label: 'Payments', icon: 'RM' },
];

function Sidebar({ onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img className="sidebar__brand-logo" src="/logo.jpg" alt="My CareGivers logo" />
        <span className="sidebar__brand-name">myCare Admin</span>
      </div>

      <div className="sidebar__section-label">Workspace</div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
            }
          >
            <span className="sidebar__link-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__bottom">
        <div className="sidebar__profile">
          <span className="sidebar__avatar">AD</span>
          <span><strong>Admin User</strong><small>Administrator</small></span>
        </div>
        <div className="sidebar__language"><span>English</span><button type="button" className="sidebar__toggle" aria-label="Toggle language" /></div>
        <button type="button" className="sidebar__logout" onClick={onLogout}>↪ &nbsp; Log out</button>
      </div>
    </aside>
  );
}

export default Sidebar;
