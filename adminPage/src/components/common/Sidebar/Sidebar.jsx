import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar as UiSidebar } from '../../../../../shared/ui/index.js';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/appointments', label: 'Appointments', icon: '▣' },
  { to: '/requests', label: 'Requests', icon: '◌' },
  { to: '/bookings', label: 'Booking Records', icon: '☑' },
  { to: '/caregivers', label: 'Caregivers', icon: '▥' },
  { to: '/post-op-patients', label: 'Post-Op Patients', icon: '◫' },
  { to: '/payments', label: 'Payments', icon: 'RM' },
];

const isActive = (item, pathname) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));

/** The shared system sidebar, wired to the admin app's routes. */
function Sidebar({ onLogout }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <UiSidebar
      logoSrc={`${import.meta.env.BASE_URL}logo.jpg`}
      brandName="myCare Admin"
      items={NAV_ITEMS.map((item) => ({ key: item.to, label: item.label, icon: item.icon, active: isActive(item, pathname), onSelect: () => navigate(item.to) }))}
      profile={{ initials: 'AD', name: 'Admin User', role: 'Administrator' }}
      onLogout={onLogout}
    />
  );
}

export default Sidebar;
