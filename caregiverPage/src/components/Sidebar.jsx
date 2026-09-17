import { Brand, Avatar } from './common.jsx';
import { caregiver } from '../data/caregiverData.js';
import { navigation } from '../data/navigation.js';

export default function Sidebar({ page, onNavigate, language, onLanguage, onLogout }) {
  return <aside className="side"><Brand /><div className="label">Workspace</div><nav className="nav">{navigation.map((item) => <button key={item.id} className={page === item.id ? 'selected' : ''} onClick={() => onNavigate(item.id)}><i>{item.icon}</i><span>{item.label}</span></button>)}</nav><div className="side-bottom"><div className="profile"><Avatar initials={caregiver.initials} /><div><strong>{caregiver.name}</strong><small>{caregiver.role}</small></div></div><div className="language"><span>{language}</span><button className="toggle" aria-label="Toggle language" onClick={onLanguage} /></div><button className="logout" onClick={onLogout}>↪ &nbsp; Log out</button></div></aside>;
}
