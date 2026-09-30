import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';

/** The shared app shell (same as the admin app): fixed sidebar + padded main column. */
export default function WorkspaceLayout({ page, children, onNavigate, onLogout, onNotify, profile, notifications, onReadNotifications, onOpenJob }) {
  return <div className="ui-shell"><Sidebar page={page} onNavigate={onNavigate} profile={profile} /><main className="ui-shell__main"><Topbar page={page} onNotify={onNotify} profile={profile} notifications={notifications} onReadNotifications={onReadNotifications} onOpenJob={onOpenJob} onLogout={onLogout} />{children}</main></div>;
}
