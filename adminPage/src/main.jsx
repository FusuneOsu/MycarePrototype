import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { seedDemoApplications } from '../../shared/demoApplications.js';
import { seedBookingData } from '../../shared/demoBookings.js';
import './styles/global.css';

// Gives the Caregivers approval queue something to review on a fresh browser.
// Idempotent — never overwrites applications submitted through the wizard.
seedDemoApplications();
seedBookingData();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
