import { Brand, Avatar } from './common.jsx';
import { navigation } from '../data/navigation.js';

export default function Sidebar({ page, onNavigate, language, onLanguage, onLogout, profile }) {
  return <aside className="side"><Brand /><div className="label">Workspace</div><nav className="nav">{navigation.map((item) => <button key={item.id} className={page === item.id ? 'selected' : ''} onClick={() => onNavigate(item.id)}><i>{item.icon}</i><span>{item.label}</span></button>)}</nav><div className="side-bottom"><button className={page === 'profile' ? 'profile profile--on' : 'profile'} onClick={() => onNavigate('profile')} title="View my profile"><Avatar initials={profile.initials} /><div><strong>{profile.name}</strong><small>{profile.role}</small></div></button><div className="language"><span>{language}</span><button className="toggle" aria-label="Toggle language" onClick={onLanguage} /></div><button className="logout" onClick={onLogout}>↪ &nbsp; Log out</button></div></aside>;
}
