// mockAppointments.js — Dummy data removed.
// Live appointments are surfaced from PostgreSQL bookings.
import { listBookings } from '../../../shared/bookingStore.js';

export const mockAppointments = [];

export async function fetchAppointments() {
  try {
    const res = await fetch('/api/appointments');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('[fetchAppointments] error:', err.message);
  }
  return [];
}

// Converts a booking object to the appointment shape expected by the
// calendar and modal views.
export function bookingToAppointment(booking) {
  return {
    id: booking.id,
    patientId: booking.patientId || booking.patient_id || null,
    patientName: booking.patientName || booking.patient_name || '',
    caregiverId: booking.caregiverId || booking.caregiver_id || null,
    caregiverName: booking.caregiverName || booking.caregiver_name || '',
    date: booking.date ? (typeof booking.date === 'string' ? booking.date.slice(0, 10) : booking.date) : '',
    startTime: booking.startTime || booking.start_time || '',
    endTime: booking.endTime || booking.end_time || '',
    status: booking.status || 'Scheduled',
    appointmentType: booking.appointmentType || booking.appointment_type || 'Home Visit',
    bookingType: booking.bookingType || booking.booking_type || 'One time',
    caregiverGenderPreference: booking.caregiverGenderPreference || booking.caregiver_gender_preference || 'No preference',
    locationMode: booking.locationMode || booking.location_mode || 'address',
    locationText: booking.locationText || booking.location || booking.address || '',
    latitude: booking.lat || booking.latitude || null,
    longitude: booking.lng || booking.longitude || null,
    tasks: Array.isArray(booking.tasks) ? booking.tasks : [],
    specialInstructions: booking.specialInstructions || booking.special_instructions || '',
    isConflict: false,
    sourceBookingId: booking.id,
  };
}

// Returns ONLY live database bookings as appointments
export function getAllAppointments() {
  const live = listBookings().map(bookingToAppointment);
  return live;
}
