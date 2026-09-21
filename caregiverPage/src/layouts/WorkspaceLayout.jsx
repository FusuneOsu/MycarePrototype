import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';

/** The shared app shell (same as the admin app): fixed sidebar + padded main column. */
export default function WorkspaceLayout({ page, children, onNavigate, language, onLanguage, onLogout, onNotify, profile }) {
  return <div className="ui-shell"><Sidebar page={page} onNavigate={onNavigate} language={language} onLanguage={onLanguage} onLogout={onLogout} profile={profile} /><main className="ui-shell__main"><Topbar page={page} onNotify={onNotify} profile={profile} />{children}</main></div>;
}
