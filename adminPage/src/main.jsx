import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { seedDemoApplications } from '../../shared/demoApplications.js';
import { seedBookingData } from '../../shared/demoBookings.js';
import { refreshCache } from '../../shared/bookingStore.js';
import './styles/global.css';

// Ensure legacy mock entries are wiped and database cache is populated
seedDemoApplications();
seedBookingData();
refreshCache();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
