import { BOOKING_STATUS, listBookings } from '../../../shared/bookingStore.js';

const CALENDAR_STATUS = {
  [BOOKING_STATUS.confirmed]: 'Scheduled',
  [BOOKING_STATUS.rescheduled]: 'Scheduled',
  [BOOKING_STATUS.cancelled]: 'Cancelled',
  [BOOKING_STATUS.completed]: 'Completed',
};

/**
 * Confirmed bookings (Module 1) shaped as calendar appointments, so every
 * booking made from a patient request also shows on the Appointments page.
 */
export function bookingsAsAppointments() {
  return listBookings().map((booking) => ({
    id: booking.id,
    patientId: booking.requestId,
    patientName: booking.patientName,
    caregiverId: booking.caregiverId,
    caregiverName: booking.caregiverName,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: CALENDAR_STATUS[booking.status] || 'Scheduled',
    appointmentType: 'Home Visit',
    bookingType: 'One time',
    caregiverGenderPreference: booking.preferredGender,
    locationMode: 'address',
    locationText: booking.address,
    latitude: booking.lat ? String(booking.lat) : null,
    longitude: booking.lng ? String(booking.lng) : null,
    tasks: [booking.serviceType],
    specialInstructions: booking.notes,
    isConflict: false,
    fromBooking: true,
  }));
}
