import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar/Sidebar.jsx';
import Chatbox from '../components/Chatbox.jsx';

/** The shared app shell: fixed system sidebar + padded main column. */
function AppLayout({ onLogout }) {
  return (
    <div className="ui-shell">
      <Sidebar onLogout={onLogout} />
      <main className="ui-shell__main">
        <Outlet />
      </main>
      <Chatbox />
    </div>
  );
}

export default AppLayout;
