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

const SESSION_KEY = 'mycare.adminSession';

const readStoredSession = () => {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === 'admin';
  } catch {
    return false;
  }
};

const writeStoredSession = (value) => {
  try {
    if (value) window.sessionStorage.setItem(SESSION_KEY, 'admin');
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Private browsing with storage blocked — the session just will not survive a refresh.
  }
};

function App() {
  // The session arrives as ?session=admin from the caregiver-side login, but it
  // has to outlive it: react-router drops the query on the first navigation, so
  // without this a refresh on any inner page would blank the screen and bounce
  // the admin back to the login form.
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const fromQuery = new URLSearchParams(window.location.search).get('session') === 'admin';
    if (fromQuery) writeStoredSession(true);
    return fromQuery || readStoredSession();
  });

  useEffect(() => {
    if (isAuthenticated) {
      // Drop the token from the address bar once it is stored.
      const url = new URL(window.location.href);
      if (url.searchParams.has('session')) {
        url.searchParams.delete('session');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
      return;
    }

    const caregiverUrl = import.meta.env.VITE_CAREGIVER_URL || 'http://localhost:5173/caregiver/';
    const target = new URL(caregiverUrl, window.location.origin);
    target.searchParams.set('return', 'admin');
    window.location.replace(target.toString());
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const logout = () => {
    writeStoredSession(false);
    setIsAuthenticated(false);
  };

  return (
    <Routes>
      <Route element={<AppLayout onLogout={logout} />}>
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
