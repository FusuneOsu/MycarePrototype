import { BOOKING_STATUS, listBookings } from '../../../shared/bookingStore.js';

const CALENDAR_STATUS = {
  [BOOKING_STATUS.confirmed]: 'Caregiver assigned',
  [BOOKING_STATUS.inProgress]: 'In progress',
  [BOOKING_STATUS.serviceCompleted]: 'Service completed',
  [BOOKING_STATUS.paymentPending]: 'Service completed',
  [BOOKING_STATUS.linkSent]: 'Service completed',
  [BOOKING_STATUS.paidOnline]: 'Service completed',
  [BOOKING_STATUS.paidCollected]: 'Service completed',
  [BOOKING_STATUS.cancelled]: 'Cancelled',
  [BOOKING_STATUS.missed]: 'Missed',
};

/**
 * Confirmed bookings shaped as calendar appointments.
 * Since the schema merge, bookings already contain appointment fields
 * (appointmentType, bookingType, locationMode, tasks, specialInstructions),
 * so this mapping is minimal.
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
    status: CALENDAR_STATUS[booking.status] || booking.status,
    appointmentType: booking.appointmentType || 'Home Visit',
    bookingType: booking.bookingType || 'One time',
    caregiverGenderPreference: booking.caregiverGenderPreference || 'No preference',
    locationMode: booking.locationMode || 'address',
    locationText: booking.location || '',
    latitude: booking.lat ? String(booking.lat) : null,
    longitude: booking.lng ? String(booking.lng) : null,
    tasks: booking.tasks || [booking.serviceType],
    specialInstructions: booking.specialInstructions || '',
    isConflict: false,
    fromBooking: true,
  }));
}
