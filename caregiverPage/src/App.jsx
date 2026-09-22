import { useEffect, useMemo, useState } from 'react';
import AuthPage from './components/AuthPage.jsx';
import WorkspaceLayout from './layouts/WorkspaceLayout.jsx';
import ApplyPage from './pages/Apply/ApplyPage.jsx';
import ApplicationStatusPage from './pages/ApplicationStatus/ApplicationStatusPage.jsx';
import DashboardPage from './pages/Dashboard/DashboardPage.jsx';
import JobsPage from './pages/Jobs/JobsPage.jsx';
import JobDetailPage from './pages/JobDetail/JobDetailPage.jsx';
import ProfilePage from './pages/Profile/ProfilePage.jsx';
import ProfileEditModal from './pages/Profile/ProfileEditModal.jsx';
import ReportsPage from './pages/Reports/ReportsPage.jsx';
import { Toast } from './components/common.jsx';
import { getApplication, STATUS } from './data/applicationData.js';
import { buildProfile } from './data/profileData.js';
import { requestProfileChanges } from './data/profileChanges.js';
import { jobsFor } from './data/jobs.js';
import NavigateSheet from './components/NavigateSheet.jsx';
import { completeBooking, listNotifications, markNotificationsRead } from '../../shared/bookingStore.js';
import { getAccountHold } from '../../shared/caregiverStore.js';
import AccountHoldPage from './pages/AccountHold/AccountHoldPage.jsx';

// A link like /caregiver/?apply=1 (shared by the admin on WhatsApp or the
// website) opens the application form straight away.
const opensApplication = () => new URLSearchParams(window.location.search).get('apply') === '1';

export default function App() {
  const [account, setAccount] = useState(null);
  const [screen, setScreen] = useState(() => (opensApplication() ? 'apply' : 'auth')); // auth | apply | workspace
  const [page, setPage] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [language, setLanguage] = useState('English');
  const [toast, setToast] = useState('');
  const [navigatingTo, setNavigatingTo] = useState(null);
  const [applicationVersion, setApplicationVersion] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingApplication, setEditingApplication] = useState(false);

  // Bookings, approvals and notifications are written by the admin app on the
  // same origin — pick up changes from another tab, or when this one regains focus.
  useEffect(() => {
    const sync = () => setApplicationVersion((version) => version + 1);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('focus', sync); };
  }, []);

  const notify = (message) => { setToast(message); window.clearTimeout(window.__careToast); window.__careToast = window.setTimeout(() => setToast(''), 2400); };
  const navigate = (nextPage) => setPage(nextPage);
  const openPatient = (id) => { setSelectedPatient(id); navigate('detail'); };
  const signOut = () => { setAccount(null); setScreen('auth'); setPage('dashboard'); setEditingApplication(false); notify('You have been logged out'); };

  // Re-read after the wizard submits, the status changes, or a profile edit is
  // filed or approved, so gating and the profile stay in sync with storage.
  const refreshProfile = () => setApplicationVersion((version) => version + 1);
  const application = useMemo(() => (account ? getApplication(account.email) : null), [account, applicationVersion]);
  const profile = useMemo(() => buildProfile(account), [account, applicationVersion]);
  const hold = useMemo(() => (account ? getAccountHold(account.email) : null), [account, applicationVersion]);

  if (screen === 'apply') {
    return <><ApplyPage
      onCancel={() => setScreen('auth')}
      onResume={() => setScreen('auth')}
      onNotify={notify}
      onSubmitted={(submitted) => { setAccount(submitted); setApplicationVersion((version) => version + 1); setScreen('workspace'); notify('Application submitted — we will be in touch within 3 working days.'); }}
    /><Toast message={toast} /></>;
  }

  if (!account) {
    return <><AuthPage onAuth={(signedIn) => { setAccount(signedIn); setApplicationVersion((version) => version + 1); setScreen('workspace'); notify(`Welcome back, ${signedIn.name.split(' ')[0]}`); }} onApply={() => setScreen('apply')} /><Toast message={toast} /></>;
  }

  // An applicant only reaches the workspace once an admin approves them.
  if (application && application.status !== STATUS.approved) {
    if (application.status === STATUS.draft) {
      return <><ApplyPage resume={application} onCancel={signOut} onResume={signOut} onNotify={notify} onSubmitted={() => { setApplicationVersion((version) => version + 1); notify('Application submitted — we will be in touch within 3 working days.'); }} /><Toast message={toast} /></>;
    }
    // Not approved: the applicant edits the same application and resubmits it.
    if (application.status === STATUS.moreInfo && editingApplication) {
      return <><ApplyPage
        resume={application}
        editing
        onCancel={() => { setEditingApplication(false); refreshProfile(); }}
        onResume={signOut}
        onNotify={notify}
        onSubmitted={() => { setEditingApplication(false); refreshProfile(); notify('Application resubmitted — your coordinator will review it again.'); }}
      /><Toast message={toast} /></>;
    }
    return <><ApplicationStatusPage application={application} onLogout={signOut} onNotify={notify} onRefresh={refreshProfile} onEdit={() => setEditingApplication(true)} /><Toast message={toast} /></>;
  }

  // Suspended or deactivated by the admin: the record stays, the workspace does not.
  if (hold && (!application || application.status === STATUS.approved)) {
    return <><AccountHoldPage hold={hold} name={profile.name} onLogout={signOut} onRefresh={refreshProfile} /><Toast message={toast} /></>;
  }

  // Jobs are the bookings the admin confirmed for this caregiver (Module 1).
  const jobs = jobsFor(profile.caregiverId);
  const notifications = listNotifications({ audience: 'caregiver', to: profile.caregiverId }).filter((item) => item.channel === 'System');
  const readNotifications = () => { markNotificationsRead({ audience: 'caregiver', to: profile.caregiverId }); refreshProfile(); };
  const content = page === 'dashboard' ? <DashboardPage jobs={jobs} onNavigate={navigate} onOpenPatient={openPatient} onNavigateTo={setNavigatingTo} />
    : page === 'jobs' ? <JobsPage jobs={jobs} center={profile.center} onOpenPatient={openPatient} onNavigate={setNavigatingTo} />
    : page === 'detail' ? <JobDetailPage job={jobs[selectedPatient]} onBack={() => navigate('jobs')} onNotify={notify} onNavigate={setNavigatingTo} onComplete={(id) => { completeBooking(id); refreshProfile(); }} />
    : page === 'profile' ? <ProfilePage profile={profile} onEdit={() => setEditingProfile(true)} onRefresh={refreshProfile} onNotify={notify} />
    : <ReportsPage onOpenHistory={openPatient} onNotify={notify} />;

  const toggleLanguage = () => { const next = language === 'English' ? 'Bahasa Melayu' : 'English'; setLanguage(next); notify(next === 'English' ? 'Language changed to English' : 'Bahasa ditukar kepada Bahasa Melayu'); };

  // Caregiver edits never write straight to the profile — they are filed as a
  // change request and only merged in once an admin approves them.
  const submitProfileEdits = (values) => {
    const request = requestProfileChanges(profile.email, profile, values);
    setEditingProfile(false);
    if (!request) { notify('Nothing changed, so there is nothing to approve.'); return; }
    refreshProfile();
    notify(`${Object.keys(request.changes).length} change(s) sent to your coordinator for approval`);
  };

  return <>
    <WorkspaceLayout page={page} onNavigate={navigate} language={language} onLanguage={toggleLanguage} onLogout={signOut} onNotify={notify} profile={profile} notifications={notifications} onReadNotifications={readNotifications} onOpenJob={openPatient}>{content}</WorkspaceLayout>
    {navigatingTo && <NavigateSheet job={navigatingTo} onClose={() => setNavigatingTo(null)} />}
    {editingProfile && <ProfileEditModal profile={profile} onCancel={() => setEditingProfile(false)} onSubmit={submitProfileEdits} />}
    <Toast message={toast} />
  </>;
}
