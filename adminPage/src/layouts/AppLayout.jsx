import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar/Sidebar.jsx';
import './AppLayout.css';

function AppLayout({ onLogout }) {
  return (
    <div className="app-layout">
      <Sidebar onLogout={onLogout} />
      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
