import { Sidebar as UiSidebar } from '../../../shared/ui/index.js';
import { navigation } from '../data/navigation.js';

/** The shared system sidebar, wired to the caregiver workspace pages. */
export default function Sidebar({ page, onNavigate, language, onLanguage, onLogout, profile }) {
  return <UiSidebar
    logoSrc={`${import.meta.env.BASE_URL}logo.jpg`}
    brandName="My CareGivers"
    items={navigation.map((item) => ({ key: item.id, label: item.label, icon: item.icon, active: page === item.id, onSelect: () => onNavigate(item.id) }))}
    profile={{ initials: profile.initials, name: profile.name, role: profile.role, active: page === 'profile', onSelect: () => onNavigate('profile') }}
    language={language}
    onToggleLanguage={onLanguage}
    onLogout={onLogout}
  />;
}
