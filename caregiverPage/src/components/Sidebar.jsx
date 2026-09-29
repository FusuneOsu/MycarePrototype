import { Sidebar as UiSidebar } from '../../../shared/ui/index.js';
import { useLanguage } from '../../../shared/i18n/LanguageContext.jsx';
import { navigation } from '../data/navigation.js';

/** The shared system sidebar, wired to the caregiver workspace pages. */
export default function Sidebar({ page, onNavigate, profile }) {
  const { t } = useLanguage();

  return <UiSidebar
    logoSrc={`${import.meta.env.BASE_URL}logo.jpg`}
    brandName="My CareGivers"
    sectionLabel={t('nav.workspace')}
    items={navigation.map((item) => ({ key: item.id, label: t(item.labelKey) || item.label, icon: item.icon, active: page === item.id, onSelect: () => onNavigate(item.id) }))}
    profile={{ initials: profile.initials, name: profile.name, role: profile.role, gender: profile.gender, active: page === 'profile', onSelect: () => onNavigate('profile') }}
  />;
}
