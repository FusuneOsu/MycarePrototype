import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import DashboardPage from './pages/Dashboard/DashboardPage.jsx';
import AppointmentsPage from './pages/Appointments/AppointmentsPage.jsx';
import CaregiversPage from './pages/Caregivers/CaregiversPage.jsx';
import PostOpPatientsPage from './pages/PostOpPatients/PostOpPatientsPage.jsx';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/caregivers" element={<CaregiversPage />} />
        <Route path="/post-op-patients" element={<PostOpPatientsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
