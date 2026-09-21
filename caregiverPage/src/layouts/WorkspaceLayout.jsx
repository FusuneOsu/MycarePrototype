import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';

export default function WorkspaceLayout({ page, children, onNavigate, language, onLanguage, onLogout, onNotify, profile }) {
  return <div className="app"><Sidebar page={page} onNavigate={onNavigate} language={language} onLanguage={onLanguage} onLogout={onLogout} profile={profile} /><main className="main"><Topbar page={page} onNotify={onNotify} profile={profile} />{children}</main></div>;
}
