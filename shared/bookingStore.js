// Module 1 — patient requests and bookings, shared by both apps.
//
// The admin app turns a request into a confirmed booking; the caregiver app
// reads the same booking as a job. One record, so the two views always tally.
// Like the caregiver store, this sits on localStorage (same origin via the
// /caregiver proxy) until the D1 tables exist.

export const REQUESTS_KEY = 'mycare.patientRequests';
export const BOOKINGS_KEY = 'mycare.bookings';
export const NOTIFICATIONS_KEY = 'mycare.notifications';
export const BOOKING_STORE_KEYS = [REQUESTS_KEY, BOOKINGS_KEY, NOTIFICATIONS_KEY];

export const REQUEST_STATUS = { new: 'New', review: 'In Review', booked: 'Booked', rejected: 'Rejected' };
export const REQUEST_STATUSES = Object.values(REQUEST_STATUS);
export const REQUEST_SOURCES = ['WhatsApp', 'Website'];
export const BOOKING_STATUS = { confirmed: 'Confirmed', rescheduled: 'Rescheduled', cancelled: 'Cancelled', completed: 'Completed' };
export const GENDER_PREFERENCES = ['Female', 'Male', 'No preference'];

/** Approximate centre point of each coverage zone / center, for distance ranking. */
export const AREA_COORDS = {
  Ampang: { lat: 3.1500, lng: 101.7600 },
  Bangsar: { lat: 3.1300, lng: 101.6780 },
  Cheras: { lat: 3.0850, lng: 101.7400 },
  Kepong: { lat: 3.2100, lng: 101.6360 },
  'Kuala Lumpur City': { lat: 3.1478, lng: 101.6953 },
  'Petaling Jaya': { lat: 3.1073, lng: 101.6067 },
  Puchong: { lat: 3.0330, lng: 101.6180 },
  Setapak: { lat: 3.1990, lng: 101.7170 },
  'Shah Alam': { lat: 3.0733, lng: 101.5185 },
  'Subang Jaya': { lat: 3.0567, lng: 101.5851 },
};

/** Default hourly rate per service type (RM). The admin can override per booking. */
export const SERVICE_RATES = {
  'Post-operative care': 45,
  'Elderly care': 35,
  'Dementia care': 40,
  'Physiotherapy support': 50,
  'Wound care': 45,
  'Palliative care': 55,
  'Paediatric care': 40,
  'Medication management': 30,
};

/** Share of the booking price paid out to the caregiver. */
export const CAREGIVER_SHARE = 0.75;

/* Time helpers ---------------------------------------------------------------- */

const pad = (n) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD, `offset` days from today (never UTC — that shifts the day in Malaysia). */
export function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const toMinutes = (time) => { const [h, m] = String(time).split(':').map(Number); return h * 60 + m; };
export const fromMinutes = (mins) => `${pad(Math.floor((mins % 1440) / 60))}:${pad(mins % 60)}`;
export const endTimeOf = (start, durationMins) => fromMinutes(toMinutes(start) + Number(durationMins));
export const overlaps = (aStart, aEnd, bStart, bEnd) => toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
export const weekdayOf = (isoDate) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${isoDate}T00:00:00`).getDay()];
export const formatDate = (isoDate) => (isoDate ? new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const formatDuration = (mins) => { const h = Math.floor(mins / 60); const m = mins % 60; return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(' ') || '0 min'; };
export const formatMoney = (amount) => `RM ${Number(amount || 0).toFixed(2)}`;

export function distanceKm(a, b) {
  if (!a || !b) return null;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** Hours a shift covers, in minutes from midnight. Flexible / unknown shifts cover the whole day. */
const SHIFT_WINDOWS = {
  'Morning (7am - 3pm)': [7 * 60, 15 * 60],
  'Afternoon (3pm - 11pm)': [15 * 60, 23 * 60],
  'Night (11pm - 7am)': [23 * 60, 31 * 60],
};

/* Storage -------------------------------------------------------------------- */

function read(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const write = (key, value) => window.localStorage.setItem(key, JSON.stringify(value));
const now = () => new Date().toISOString();

/* Requests ------------------------------------------------------------------- */

export function listRequests() {
  return Object.values(read(REQUESTS_KEY) || {}).sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
}

export function getRequest(id) {
  return (read(REQUESTS_KEY) || {})[id] || null;
}

export function updateRequest(id, changes) {
  const requests = read(REQUESTS_KEY) || {};
  if (!requests[id]) return null;
  requests[id] = { ...requests[id], ...changes, updatedAt: now() };
  write(REQUESTS_KEY, requests);
  return requests[id];
}

export function setRequestStatus(id, status, reason = '') {
  return updateRequest(id, { status, statusReason: reason });
}

/* Notifications -------------------------------------------------------------- */

/**
 * audience: 'patient' | 'caregiver'. `to` is the patient's phone number or the
 * caregiver's id. channel: 'WhatsApp' | 'System'.
 */
export function notify({ audience, to, channel, title, body, bookingId }) {
  const list = read(NOTIFICATIONS_KEY) || [];
  const entry = { id: `NT-${Date.now().toString(36)}-${list.length}`, audience, to, channel, title, body, bookingId, at: now(), read: false };
  write(NOTIFICATIONS_KEY, [entry, ...(Array.isArray(list) ? list : [])]);
  return entry;
}

export function listNotifications({ audience, to, bookingId } = {}) {
  const list = read(NOTIFICATIONS_KEY);
  return (Array.isArray(list) ? list : []).filter((item) =>
    (!audience || item.audience === audience) && (!to || item.to === to) && (!bookingId || item.bookingId === bookingId));
}

export function markNotificationsRead({ audience, to }) {
  const list = read(NOTIFICATIONS_KEY);
  if (!Array.isArray(list)) return;
  write(NOTIFICATIONS_KEY, list.map((item) => (item.audience === audience && item.to === to ? { ...item, read: true } : item)));
}

/** Tell the patient (WhatsApp) and the caregiver (in-app + WhatsApp) about a booking event. */
function notifyBothParties(booking, headline, detail) {
  const when = `${formatDate(booking.date)}, ${booking.startTime}–${booking.endTime}`;
  notify({ audience: 'patient', to: booking.patientPhone, channel: 'WhatsApp', bookingId: booking.id, title: headline, body: `Hi ${booking.patientName}, ${detail} Caregiver: ${booking.caregiverName}. ${when}. Ref ${booking.id}.` });
  notify({ audience: 'caregiver', to: booking.caregiverId, channel: 'System', bookingId: booking.id, title: headline, body: `${booking.serviceType} for ${booking.patientName} · ${when} · ${booking.address}` });
  notify({ audience: 'caregiver', to: booking.caregiverId, channel: 'WhatsApp', bookingId: booking.id, title: headline, body: `${detail} Patient: ${booking.patientName}. ${when}. Ref ${booking.id}.` });
}

/* Bookings ------------------------------------------------------------------- */

export function listBookings({ caregiverId, date, includeCancelled = true } = {}) {
  return Object.values(read(BOOKINGS_KEY) || {})
    .filter((booking) => (!caregiverId || booking.caregiverId === caregiverId) && (!date || booking.date === date) && (includeCancelled || booking.status !== BOOKING_STATUS.cancelled))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

export function getBooking(id) {
  return (read(BOOKINGS_KEY) || {})[id] || null;
}

export function getBookingForRequest(requestId) {
  return Object.values(read(BOOKINGS_KEY) || {}).find((booking) => booking.requestId === requestId) || null;
}

function saveBooking(booking) {
  const bookings = read(BOOKINGS_KEY) || {};
  bookings[booking.id] = { ...booking, updatedAt: now() };
  write(BOOKINGS_KEY, bookings);
  return bookings[booking.id];
}

function nextBookingId() {
  const used = Object.keys(read(BOOKINGS_KEY) || {}).map((id) => Number(id.replace('BK-', '')) || 0);
  return `BK-${Math.max(7000, ...used) + 1}`;
}

export const priceFor = (rate, durationMins) => Math.round(Number(rate) * (Number(durationMins) / 60) * 100) / 100;

/** Admin confirms the booking: creates the record, marks the request Booked, notifies both sides. */
export function confirmBooking({ request, caregiver, date, startTime, durationMins, rate }) {
  const price = priceFor(rate, durationMins);
  const booking = saveBooking({
    id: nextBookingId(),
    requestId: request.id,
    source: request.source,
    patientName: request.patientName,
    patientPhone: request.phone,
    address: request.address,
    area: request.area,
    lat: request.lat,
    lng: request.lng,
    serviceType: request.careType,
    preferredGender: request.preferredGender,
    notes: request.notes,
    caregiverId: caregiver.id,
    caregiverName: caregiver.name,
    date,
    startTime,
    endTime: endTimeOf(startTime, durationMins),
    durationMins: Number(durationMins),
    rate: Number(rate),
    price,
    caregiverPayout: Math.round(price * CAREGIVER_SHARE * 100) / 100,
    status: BOOKING_STATUS.confirmed,
    receiptStatus: 'Receipt pending',
    payoutStatus: 'Awaiting payout',
    createdAt: now(),
    history: [{ at: now(), action: BOOKING_STATUS.confirmed, reason: '' }],
  });
  updateRequest(request.id, { status: REQUEST_STATUS.booked, statusReason: '', bookingId: booking.id });
  notifyBothParties(booking, 'Booking confirmed', 'your caregiver booking is confirmed.');
  return booking;
}

export function rescheduleBooking(id, { date, startTime, durationMins, reason }) {
  const booking = getBooking(id);
  if (!booking) return null;
  const from = { date: booking.date, startTime: booking.startTime, endTime: booking.endTime };
  const price = priceFor(booking.rate, durationMins);
  const updated = saveBooking({
    ...booking,
    date,
    startTime,
    durationMins: Number(durationMins),
    endTime: endTimeOf(startTime, durationMins),
    price,
    caregiverPayout: Math.round(price * CAREGIVER_SHARE * 100) / 100,
    status: BOOKING_STATUS.rescheduled,
    history: [...booking.history, { at: now(), action: BOOKING_STATUS.rescheduled, reason, from, to: { date, startTime, endTime: endTimeOf(startTime, durationMins) } }],
  });
  notifyBothParties(updated, 'Booking rescheduled', `your booking has been moved. Reason: ${reason}.`);
  return updated;
}

/** Cancelled bookings are kept for the record; the request goes back to In Review to rebook. */
export function cancelBooking(id, reason) {
  const booking = getBooking(id);
  if (!booking) return null;
  const updated = saveBooking({ ...booking, status: BOOKING_STATUS.cancelled, history: [...booking.history, { at: now(), action: BOOKING_STATUS.cancelled, reason }] });
  if (booking.requestId) updateRequest(booking.requestId, { status: REQUEST_STATUS.review, statusReason: `Booking ${booking.id} cancelled: ${reason}`, bookingId: '' });
  notifyBothParties(updated, 'Booking cancelled', `your booking has been cancelled. Reason: ${reason}.`);
  return updated;
}

/** The caregiver marks the visit done from their job page. */
export function completeBooking(id) {
  const booking = getBooking(id);
  if (!booking) return null;
  return saveBooking({ ...booking, status: BOOKING_STATUS.completed, receiptStatus: 'Receipt submitted', completedAt: now(), history: [...booking.history, { at: now(), action: BOOKING_STATUS.completed, reason: '' }] });
}

export function updateBookingPayment(id, changes) {
  const booking = getBooking(id);
  return booking ? saveBooking({ ...booking, ...changes }) : null;
}

export const isActiveBooking = (booking) => booking.status !== BOOKING_STATUS.cancelled;

/* Caregiver matching ----------------------------------------------------------- */

/**
 * Scores every caregiver against a request for the chosen slot. Returns each
 * caregiver with the individual checks, so the admin can see *why* someone is
 * filtered out, sorted nearest first.
 *
 * caregivers:  Active caregivers (the booking pool).
 * slot:        { date, startTime, durationMins }
 * extraBookings: other commitments to clash-check against (e.g. calendar appointments).
 */
export function matchCaregivers(request, caregivers, slot, extraBookings = []) {
  const endTime = endTimeOf(slot.startTime, slot.durationMins);
  const patientPoint = request.lat && request.lng ? { lat: request.lat, lng: request.lng } : AREA_COORDS[request.area];
  const commitments = [
    ...listBookings({ includeCancelled: false }).filter((booking) => booking.requestId !== request.id),
    ...extraBookings,
  ];
  const day = weekdayOf(slot.date);
  const start = toMinutes(slot.startTime);
  const end = toMinutes(endTime) <= start ? toMinutes(endTime) + 1440 : toMinutes(endTime);

  return caregivers.map((caregiver) => {
    const base = AREA_COORDS[caregiver.center];
    const distance = distanceKm(base, patientPoint);
    const inZone = (caregiver.coverageAreas || []).includes(request.area);

    const clash = commitments.find((item) => item.caregiverId === caregiver.id && item.date === slot.date && overlaps(item.startTime, item.endTime, slot.startTime, endTime));
    const worksThatDay = !caregiver.workingDays?.length || caregiver.workingDays.includes(day);
    const window = SHIFT_WINDOWS[caregiver.shift];
    const inShift = !window || (start >= window[0] && end <= window[1]) || (start + 1440 >= window[0] && end + 1440 <= window[1]);
    const onLeave = caregiver.availability === 'On Leave';

    let availabilityNote = 'Free for this slot';
    if (onLeave) availabilityNote = 'On leave';
    else if (clash) availabilityNote = `Booked ${clash.startTime}–${clash.endTime}${clash.id ? ` (${clash.id})` : ''}`;
    else if (!worksThatDay) availabilityNote = `Doesn't work ${day}`;
    else if (!inShift) availabilityNote = `Outside shift (${caregiver.shift})`;

    const genderMatch = !request.preferredGender || request.preferredGender === 'No preference' || caregiver.gender === request.preferredGender;
    const skillMatch = (caregiver.specialisations || []).includes(request.careType);

    return {
      caregiver,
      distanceKm: distance,
      inZone,
      available: !onLeave && !clash && worksThatDay && inShift,
      availabilityNote,
      genderMatch,
      skillMatch,
    };
  }).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

/** Applies the admin's filter choices to matchCaregivers() output. */
export function filterMatches(matches, { location = 'zone', radiusKm = 10, availability = true, gender = true, skill = false }) {
  return matches.filter((match) =>
    (location === 'any' || (location === 'zone' ? match.inZone : (match.distanceKm ?? Infinity) <= radiusKm))
    && (!availability || match.available)
    && (!gender || match.genderMatch)
    && (!skill || match.skillMatch));
}

/* Navigation links ------------------------------------------------------------ */

/** Deep links that open the phone's navigation app (or the web version on desktop). */
export function navigationLinks({ lat, lng, address }) {
  const hasPoint = lat && lng;
  const target = hasPoint ? `${lat},${lng}` : address;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}&travelmode=driving`,
    waze: hasPoint ? `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
    apple: `https://maps.apple.com/?daddr=${encodeURIComponent(target)}&dirflg=d`,
  };
}

/** A Google Maps route through several stops, in visit order (the last stop is the destination). */
export function routeLink(stops) {
  const points = stops.map((stop) => (stop.lat && stop.lng ? `${stop.lat},${stop.lng}` : stop.address));
  if (!points.length) return '';
  const destination = points[points.length - 1];
  const waypoints = points.slice(0, -1).join('|');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}&travelmode=driving`;
}
