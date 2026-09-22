import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar/Sidebar.jsx';
import WhatsAppRequestPopup from '../components/common/WhatsAppRequestPopup.jsx';

/** The shared app shell: fixed system sidebar + padded main column. */
function AppLayout({ onLogout }) {
  return (
    <div className="ui-shell">
      <Sidebar onLogout={onLogout} />
      <main className="ui-shell__main">
        <Outlet />
      </main>
      <WhatsAppRequestPopup />
    </div>
  );
}

export default AppLayout;
