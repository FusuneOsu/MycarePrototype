/**
 * Appointment utilities — pure functions for date math, formatting,
 * calendar grid generation, and API ↔ frontend data mapping.
 */

export const STATUS_OPTIONS = [
  'Caregiver assigned', 'Scheduled', 'In progress', 'Cancelled',
  'Missed', 'Completed', 'No caregiver assigned',
];

export const STATUS_COLORS = {
  'Scheduled': 'var(--color-blue, #3b82f6)',
  'Caregiver assigned': 'var(--color-indigo, #6366f1)',
  'In progress': 'var(--color-gold, #eab308)',
  'Completed': 'var(--color-green, #22c55e)',
  'Cancelled': 'var(--color-red, #ef4444)',
  'Missed': 'var(--color-orange, #f97316)',
  'No caregiver assigned': 'var(--color-gray, #6b7280)',
};

/** Convert a date value to an ISO date string (YYYY-MM-DD). */
export function toISODate(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

/** Parse an ISO date string to a Date object. */
export function toDateObject(value) {
  const d = new Date(value + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Add days to a date and return a new Date. */
export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Return midnight Monday of the week containing the given date. */
export function startOfWeek(date) {
  const s = new Date(date);
  s.setDate(s.getDate() + (s.getDay() === 0 ? -6 : 1 - s.getDay()));
  s.setHours(0, 0, 0, 0);
  return s;
}

/**
 * Generate a 6-week (42-day) grid for a month calendar view.
 * Each cell: { date, dayNumber, inMonth, isToday }.
 */
export function monthGridFor(dateValue) {
  const date = toDateObject(dateValue);
  const y = date.getFullYear(), m = date.getMonth();
  const start = startOfWeek(new Date(y, m, 1));
  const today = toISODate(new Date());
  return Array.from({ length: 42 }, (_, i) => {
    const cd = addDays(start, i);
    return { date: toISODate(cd), dayNumber: cd.getDate(), inMonth: cd.getMonth() === m, isToday: toISODate(cd) === today };
  });
}

/** Generate a 7-day week grid. */
export function weekGridFor(dateValue) {
  const start = startOfWeek(toDateObject(dateValue));
  const today = toISODate(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const cd = addDays(start, i);
    return {
      date: toISODate(cd), dayNumber: cd.getDate(),
      label: cd.toLocaleDateString('en-SG', { weekday: 'short' }),
      isToday: toISODate(cd) === today,
    };
  });
}

/** Human-readable date label, e.g. "Mon, 14 Oct 2024". */
export function formatDateLabel(dateValue) {
  return toDateObject(dateValue).toLocaleDateString('en-SG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Format a time range string, e.g. "09:00 - 10:00". */
export function formatTimeRange(s, e) {
  return s + ' - ' + e;
}

/**
 * Normalize an API appointment (snake_case) to frontend format (camelCase).
 */
export function normalizeAppointment(a) {
  return {
    id: a.id,
    patientId: a.patient_id,
    patientName: a.patient_name,
    caregiverId: a.caregiver_id,
    caregiverName: a.caregiver_name || 'Unassigned',
    date: a.date,
    startTime: a.start_time,
    endTime: a.end_time,
    status: a.status,
    appointmentType: a.appointment_type,
    bookingType: a.booking_type,
    caregiverGenderPreference: a.caregiver_gender_preference,
    locationMode: a.location_mode,
    locationText: a.location_text,
    latitude: a.latitude,
    longitude: a.longitude,
    tasks: a.tasks || [],
    specialInstructions: a.special_instructions || '',
    duration_mins: a.duration_mins,
  };
}

/**
 * Convert frontend appointment (camelCase) back to API format (snake_case).
 */
export function toApiFormat(a) {
  return {
    patient_id: a.patientId,
    patient_name: a.patientName,
    caregiver_id: a.caregiverId,
    caregiver_name: a.caregiverName,
    date: a.date,
    start_time: a.startTime,
    end_time: a.endTime,
    status: a.status,
    appointment_type: a.appointmentType,
    booking_type: a.bookingType,
    caregiver_gender_preference: a.caregiverGenderPreference,
    location_mode: a.locationMode,
    location_text: a.locationText,
    latitude: a.latitude,
    longitude: a.longitude,
    tasks: a.tasks,
    special_instructions: a.specialInstructions,
    duration_mins: a.duration_mins,
  };
}
