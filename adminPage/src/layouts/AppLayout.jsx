import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar/Sidebar.jsx';
import WhatsAppRequestPopup from '../components/common/WhatsAppRequestPopup.jsx';
import './AppLayout.css';

function AppLayout({ onLogout }) {
  return (
    <div className="app-layout">
      <Sidebar onLogout={onLogout} />
      <main className="app-layout__content">
        <Outlet />
      </main>
      <WhatsAppRequestPopup />
    </div>
  );
}

export default AppLayout;
