import { useEffect, useState } from 'react';
import AuthPage from './components/AuthPage.jsx';
import WorkspaceLayout from './layouts/WorkspaceLayout.jsx';
import DashboardPage from './pages/Dashboard/DashboardPage.jsx';
import JobsPage from './pages/Jobs/JobsPage.jsx';
import JobDetailPage from './pages/JobDetail/JobDetailPage.jsx';
import ReportsPage from './pages/Reports/ReportsPage.jsx';
import { Toast } from './components/common.jsx';
import { demoRequestPatient, getAssignedDemoRequest, patients } from './data/caregiverData.js';

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState('mei');
  const [language, setLanguage] = useState('English');
  const [toast, setToast] = useState('');
  const [demoRequest, setDemoRequest] = useState(getAssignedDemoRequest);
  useEffect(() => {
    const syncRequest = () => setDemoRequest(getAssignedDemoRequest());
    window.addEventListener('storage', syncRequest);
    return () => window.removeEventListener('storage', syncRequest);
  }, []);
  const notify = (message) => { setToast(message); window.clearTimeout(window.__careToast); window.__careToast = window.setTimeout(() => setToast(''), 2400); };
  const navigate = (nextPage) => setPage(nextPage);
  const openPatient = (id) => { setSelectedPatient(id); navigate('detail'); };
  const assignedPatients = demoRequest ? { ...patients, demo: { ...demoRequestPatient, ...demoRequest, amount: demoRequestPatient.amount } } : patients;
  const content = page === 'dashboard' ? <DashboardPage patients={assignedPatients} onNavigate={navigate} onOpenPatient={openPatient} onNotify={notify} /> : page === 'jobs' ? <JobsPage patients={assignedPatients} onOpenPatient={openPatient} onNotify={notify} /> : page === 'detail' ? <JobDetailPage patient={assignedPatients[selectedPatient]} onBack={() => navigate('jobs')} onNotify={notify} onComplete={() => { const next = { ...demoRequest, serviceStatus: 'Completed', receiptStatus: 'Receipt submitted' }; window.localStorage.setItem('mycare.patientRequest.WA-REQ-1001', JSON.stringify(next)); setDemoRequest(next); }} /> : <ReportsPage onOpenHistory={openPatient} onNotify={notify} />;
  if (!signedIn) return <><AuthPage onAuth={(account) => { setSignedIn(true); notify(`Welcome back, ${account.name || 'Sarah'}`); }} /><Toast message={toast} /></>;
  return <><WorkspaceLayout page={page} onNavigate={navigate} language={language} onLanguage={() => { const next = language === 'English' ? 'Bahasa Melayu' : 'English'; setLanguage(next); notify(next === 'English' ? 'Language changed to English' : 'Bahasa ditukar kepada Bahasa Melayu'); }} onLogout={() => { setSignedIn(false); setPage('dashboard'); notify('You have been logged out'); }} onNotify={notify}>{content}</WorkspaceLayout><Toast message={toast} /></>;
}
