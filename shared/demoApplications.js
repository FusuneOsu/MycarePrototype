// demoApplications.js — All dummy data removed. Only live database applications used.
import { STORE_KEYS } from './caregiverStore.js';

const DEMO_APPS_VERSION_KEY = 'mycare.demoApplications.version';

export const DEMO_APPLICATIONS = [];

/** Idempotent cleanup: wipes legacy demo applicants so only live records show. */
export function seedDemoApplications() {
  if (typeof window === 'undefined') return;
  const version = window.localStorage.getItem(DEMO_APPS_VERSION_KEY);
  if (version !== 'database-only') {
    resetDemoData();
    window.localStorage.setItem(DEMO_APPS_VERSION_KEY, 'database-only');
  }
}

/** Wipes every application, profile edit and approved overlay. Demo reset. */
export function resetDemoData() {
  if (typeof window === 'undefined') return;
  STORE_KEYS.forEach((storeKey) => window.localStorage.removeItem(storeKey));
  window.localStorage.removeItem(DEMO_APPS_VERSION_KEY);
}
