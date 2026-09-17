import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';

export default function WorkspaceLayout({ page, children, onNavigate, language, onLanguage, onLogout, onNotify }) {
  return <div className="app"><Sidebar page={page} onNavigate={onNavigate} language={language} onLanguage={onLanguage} onLogout={onLogout} /><main className="main"><Topbar page={page} onNotify={onNotify} />{children}</main></div>;
}
