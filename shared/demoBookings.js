// demoBookings.js — All dummy data removed. Only live database data is used.
import {
  BOOKING_STORE_KEYS,
} from './bookingStore.js';

const SEED_VERSION_KEY = 'mycare.demoBookings.version';

// Dummy requests removed: all data must come from the live database.
export const REQUESTS = [];

export function seedBookingData() {
  // Ensure legacy seeded demo bookings are cleaned up so only live database records show
  const version = typeof window !== 'undefined' ? window.localStorage.getItem(SEED_VERSION_KEY) : null;
  if (version !== 'database-only') {
    resetBookingData();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SEED_VERSION_KEY, 'database-only');
    }
  }
}

export function resetBookingData() {
  if (typeof window !== 'undefined') {
    BOOKING_STORE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.removeItem(SEED_VERSION_KEY);
  }
}
