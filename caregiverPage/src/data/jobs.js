import { AREA_COORDS, BOOKING_STATUS, distanceKm, formatDate, formatMoney, listBookings, localDate } from '../../../shared/bookingStore.js';

const TONES = ['mint', 'blue', 'coral'];
const initialsOf = (name) => String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
/** "18 Jalan Desa Bakti, Taman Desa, 58100 Kuala Lumpur" -> "Taman Desa" */
const neighbourhoodOf = (address, fallback) => String(address).split(',').map((part) => part.trim())[1] || fallback;

/**
 * A caregiver's jobs are the bookings the admin confirmed for them
 * (shared/bookingStore.js) — the same records the admin sees, so the job page
 * and the booking always tally. Keyed by booking id, in visit order.
 */
export function jobsFor(caregiverId) {
  const bookings = listBookings({ caregiverId }).filter((booking) => booking.date >= localDate(0) || booking.status === BOOKING_STATUS.completed);
  return Object.fromEntries(bookings.map((booking, index) => [booking.id, {
    id: booking.id,
    booking,
    name: booking.patientName,
    initials: initialsOf(booking.patientName),
    neighbourhood: neighbourhoodOf(booking.address, booking.area),
    care: booking.serviceType,
    time: `${booking.startTime} - ${booking.endTime}`,
    dateLabel: booking.date === localDate(0) ? 'Today' : formatDate(booking.date),
    payout: formatMoney(booking.caregiverPayout),
    tone: TONES[index % TONES.length],
    status: booking.status,
    active: booking.status === BOOKING_STATUS.confirmed || booking.status === BOOKING_STATUS.rescheduled,
  }]));
}

/** Today's visits that still need doing, in order. */
export const todaysStops = (jobs) => Object.values(jobs).filter((job) => job.active && job.booking.date === localDate(0));

/** Rough route length from the caregiver's center through each stop, and drive time at ~25 km/h city speed. */
export function routeEstimate(stops, center) {
  let from = AREA_COORDS[center] || null;
  let km = 0;
  stops.forEach((stop) => {
    const point = { lat: stop.booking.lat, lng: stop.booking.lng };
    km += distanceKm(from, point) || 0;
    from = point;
  });
  return { km: Math.round(km * 10) / 10, minutes: Math.round((km / 25) * 60) };
}
