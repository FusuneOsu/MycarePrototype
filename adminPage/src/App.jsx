import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import DashboardPage from './pages/Dashboard/DashboardPage.jsx';
import AppointmentsPage from './pages/Appointments/AppointmentsPage.jsx';
import CaregiversPage from './pages/Caregivers/CaregiversPage.jsx';
import PostOpPatientsPage from './pages/PostOpPatients/PostOpPatientsPage.jsx';
import PatientRequestPage from './pages/PatientRequest/PatientRequestPage.jsx';
import WhatsAppDemoPage from './pages/WhatsAppDemo/WhatsAppDemoPage.jsx';
import PaymentsDemoPage from './pages/PaymentsDemo/PaymentsDemoPage.jsx';
import RequestsPage from './pages/Requests/RequestsPage.jsx';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => new URLSearchParams(window.location.search).get('session') === 'admin',
  );

  useEffect(() => {
    if (!isAuthenticated) {
      const caregiverUrl = import.meta.env.VITE_CAREGIVER_URL || 'http://localhost:5173/caregiver/';
      const target = new URL(caregiverUrl, window.location.origin);
      target.searchParams.set('return', 'admin');
      window.location.replace(target.toString());
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <Routes>
      <Route element={<AppLayout onLogout={() => setIsAuthenticated(false)} />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/caregivers" element={<CaregiversPage />} />
        <Route path="/post-op-patients" element={<PostOpPatientsPage />} />
        <Route path="/requests/:requestId" element={<PatientRequestPage />} />
        <Route path="/whatsapp" element={<WhatsAppDemoPage />} />
        <Route path="/payments" element={<PaymentsDemoPage />} />
      </Route>
    </Routes>
  );
}

export default App;
