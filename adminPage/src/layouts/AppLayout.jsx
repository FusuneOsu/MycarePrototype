import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar/Sidebar.jsx';
import './AppLayout.css';

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
