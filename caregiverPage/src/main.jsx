import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { OriginNotice } from './components/common.jsx';
import { seedDemoApplications } from '../../shared/demoApplications.js';
import { seedBookingData } from '../../shared/demoBookings.js';
import './styles/global.css';

// Same seed as the admin app, so the seeded applicants can sign in here too.
seedDemoApplications();
seedBookingData();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OriginNotice />
    <App />
  </StrictMode>,
);
