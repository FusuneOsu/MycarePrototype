import { HeaderProfile, NotificationBell, PageHeader, todayLabel } from '../../../shared/ui/index.js';

const labels = { dashboard: ['Good morning, {name}', 'Here is your care overview for today.'], jobs: ['Your assigned jobs', 'See your route and each patient’s care plan.'], reports: ['Care reports', 'A clear pulse check on the care you delivered.'], detail: ['Job details', 'Review the visit information before you arrive.'], profile: ['My profile', 'Your details, documents and availability on record.'] };

/** The shared page header, as used on every admin page too. */
export default function Topbar({ page, onNotify, profile }) {
  const [title, subtitle] = labels[page];
  return <PageHeader
    eyebrow={todayLabel()}
    title={title.replace('{name}', profile.name.split(' ')[0])}
    subtitle={subtitle}
    actions={<><NotificationBell unread onClick={() => onNotify('You have 3 new care updates')} /><HeaderProfile initials={profile.initials} name={profile.name} /></>}
  />;
}
