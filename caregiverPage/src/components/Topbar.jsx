import { Avatar } from './common.jsx';
import { caregiver } from '../data/caregiverData.js';

const labels = { dashboard: ['Good morning, Sarah', 'Here is your care overview for today.'], jobs: ['Your assigned jobs', 'See your route and each patient’s care plan.'], reports: ['Care reports', 'A clear pulse check on the care you delivered.'], detail: ['Job details', 'Review the visit information before you arrive.'] };

export default function Topbar({ page, onNotify }) {
  const [title, subtitle] = labels[page];
  return <header className="top"><div><p className="eyebrow">Tuesday, 24 September 2024</p><h1>{title}</h1><p>{subtitle}</p></div><div className="top-actions"><button className="bell" aria-label="Notifications" onClick={() => onNotify('You have 3 new care updates')}>♧<span className="dot" /></button><div className="top-profile"><Avatar initials={caregiver.initials} /><strong>{caregiver.name}</strong></div></div></header>;
}
