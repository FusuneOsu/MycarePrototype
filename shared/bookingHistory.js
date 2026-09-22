// Completed bookings and patient ratings, per caregiver.
//
// Seeded history holds past visits with patient ratings. On top of that, any
// booking the caregiver marks complete (shared/bookingStore.js) appears here
// straight away, unrated until the patient rates it.
import { BOOKING_STATUS, formatDuration, listBookings } from './bookingStore.js';

// The caregiver app used to assign the demo request to a placeholder id. It is
// the same person as CG-1013 (shared/demoCaregiver.js).
export const LEGACY_DEMO_ID = 'CG-DEMO';
export const canonicalCaregiverId = (id) => (id === LEGACY_DEMO_ID ? 'CG-1013' : id);

const SEEDED = [
  { id: 'BK-9001', caregiverId: 'CG-1013', patient: 'Mei Ling', service: 'Medication check-in', date: '2026-09-14', duration: '45 min', rating: 5, feedback: 'Always on time and explains every medication clearly.' },
  { id: 'BK-9002', caregiverId: 'CG-1013', patient: 'Ahmad Ibrahim', service: 'Physiotherapy support', date: '2026-09-11', duration: '1 hr', rating: 5, feedback: 'Patient and encouraging with my father’s exercises.' },
  { id: 'BK-9003', caregiverId: 'CG-1013', patient: 'Lily Wong', service: 'Companionship', date: '2026-09-06', duration: '1.5 hr', rating: 4, feedback: 'Kind and chatty — arrived a little late once.' },
  { id: 'BK-9004', caregiverId: 'CG-1013', patient: 'Tan Ah Kow', service: 'Post-operative care', date: '2026-08-28', duration: '2 hr', rating: 5, feedback: '' },
  { id: 'BK-9005', caregiverId: 'CG-1001', patient: 'Rosnah Ali', service: 'Elderly care', date: '2026-09-12', duration: '3 hr', rating: 5, feedback: 'Very gentle with my mother.' },
  { id: 'BK-9006', caregiverId: 'CG-1001', patient: 'Kumar Selvam', service: 'Wound care', date: '2026-09-03', duration: '1 hr', rating: 4, feedback: '' },
  { id: 'BK-9007', caregiverId: 'CG-1002', patient: 'Lim Siew Ling', service: 'Dementia care', date: '2026-09-15', duration: '4 hr', rating: 5, feedback: 'Calm and very experienced.' },
  { id: 'BK-9008', caregiverId: 'CG-1004', patient: 'Hassan Omar', service: 'Medication management', date: '2026-09-09', duration: '1 hr', rating: 3, feedback: 'Good care but communication could improve.' },
  { id: 'BK-9009', caregiverId: 'CG-1006', patient: 'Wong Mei Fong', service: 'Physiotherapy support', date: '2026-09-10', duration: '1.5 hr', rating: 5, feedback: '' },
];

/** Bookings the caregiver has marked complete in the app (not yet rated by the patient). */
function completedBookings(caregiverId) {
  return listBookings({ caregiverId })
    .filter((booking) => booking.status === BOOKING_STATUS.completed)
    .map((booking) => ({
      id: booking.id,
      caregiverId: booking.caregiverId,
      patient: booking.patientName,
      service: booking.serviceType,
      date: booking.date,
      duration: formatDuration(booking.durationMins),
      rating: null,
      feedback: '',
    }));
}

export function getBookingHistory(caregiverId) {
  return [...completedBookings(caregiverId), ...SEEDED.filter((booking) => booking.caregiverId === caregiverId)]
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Completed count and average of the bookings that have a rating. */
export function summariseBookings(history) {
  const rated = history.filter((booking) => typeof booking.rating === 'number');
  const average = rated.length ? rated.reduce((sum, booking) => sum + booking.rating, 0) / rated.length : null;
  return { completed: history.length, rated: rated.length, averageRating: average === null ? null : Math.round(average * 10) / 10 };
}

export const formatRating = (summary) => (summary.averageRating === null ? 'No ratings yet' : `★ ${summary.averageRating.toFixed(1)} (${summary.rated})`);
