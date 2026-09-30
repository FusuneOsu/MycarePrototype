import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar/Sidebar.jsx';
import Chatbox from '../components/Chatbox.jsx';

/** The shared app shell: fixed system sidebar + padded main column. */
function AppLayout({ onLogout }) {
  return (
    <div className="ui-shell">
      <Sidebar />
      <main className="ui-shell__main">
        {/* Pages render their own Topbar, which holds the log-out button. */}
        <Outlet context={{ onLogout }} />
      </main>
      <Chatbox />
    </div>
  );
}

export default AppLayout;
