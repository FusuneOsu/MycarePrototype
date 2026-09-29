import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar as UiSidebar } from '../../../../../shared/ui/index.js';
import { useLanguage } from '../../../../../shared/i18n/LanguageContext.jsx';

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.dashboard', icon: 'dashboard', end: true },
  { to: '/appointments', labelKey: 'nav.appointments', icon: 'calendar' },
  { to: '/requests', labelKey: 'nav.requests', icon: 'chat' },
  { to: '/bookings', labelKey: 'nav.booking_records', icon: 'clipboard' },
  { to: '/caregivers', labelKey: 'nav.caregivers', icon: 'users' },
  { to: '/post-op-patients', labelKey: 'nav.post_op_patients', icon: 'stethoscope' },
  { to: '/payments', labelKey: 'nav.payments', icon: 'card' },
  { to: '/audit-trail', labelKey: 'nav.audit_trail', icon: 'shield' },
];

const isActive = (item, pathname) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));

/** The shared system sidebar, wired to the admin app's routes. */
function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <UiSidebar
      logoSrc={`${import.meta.env.BASE_URL}logo.jpg`}
      brandName="myCare Admin"
      items={NAV_ITEMS.map((item) => ({ key: item.to, label: t(item.labelKey), icon: item.icon, active: isActive(item, pathname), onSelect: () => navigate(item.to) }))}
      profile={{ initials: 'AD', name: 'Admin User', role: 'Administrator' }}
    />
  );
}

export default Sidebar;
