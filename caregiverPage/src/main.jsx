import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { LanguageProvider } from '../../shared/i18n/LanguageContext.jsx';
import { OriginNotice } from './components/common.jsx';
import { seedDemoApplications } from '../../shared/demoApplications.js';
import { seedBookingData } from '../../shared/demoBookings.js';
import { refreshCache } from '../../shared/bookingStore.js';
import './styles/global.css';

// Ensure legacy mock entries are cleaned and database cache is populated
seedDemoApplications();
seedBookingData();
refreshCache();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <OriginNotice />
      <App />
    </LanguageProvider>
  </StrictMode>,
);
