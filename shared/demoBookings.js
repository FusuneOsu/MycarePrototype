// Seed requests and bookings so the Requests queue, the calendar and the
// caregiver's job list all have (the same) data on a fresh browser. Dates are
// relative to today so the demo never goes stale. Idempotent: runs only when
// the request store is empty, so anything you create is never overwritten.
import {
  BOOKING_STATUS, BOOKING_STORE_KEYS, CAREGIVER_SHARE, REQUESTS_KEY, REQUEST_STATUS, BOOKINGS_KEY,
  SERVICE_RATES, endTimeOf, localDate, priceFor,
} from './bookingStore.js';

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString();

const REQUESTS = [
  {
    id: 'WA-REQ-1001', source: 'WhatsApp', status: REQUEST_STATUS.new, receivedAt: hoursAgo(1),
    patientName: 'Nur Aisyah Rahman', phone: '+60 12-345 6789',
    address: '24 Jalan Damai, Kampung Datuk Keramat, 54000 Kuala Lumpur', area: 'Kuala Lumpur City', lat: 3.1641, lng: 101.7295,
    careType: 'Post-operative care', preferredDate: localDate(7), preferredStart: '10:00', durationMins: 120, preferredGender: 'Female',
    notes: 'Needs help with mobility, medication reminders, and wound-care observation after knee surgery.',
  },
  {
    id: 'WEB-REQ-1002', source: 'Website', status: REQUEST_STATUS.review, receivedAt: hoursAgo(20),
    patientName: 'Daniel Lim', phone: '+60 17-221 4480',
    address: '8 Jalan SS 15/4, 47500 Subang Jaya', area: 'Subang Jaya', lat: 3.0751, lng: 101.5877,
    careType: 'Elderly care', preferredDate: localDate(8), preferredStart: '09:00', durationMins: 180, preferredGender: 'No preference',
    notes: 'Father has mild dementia and prefers a calm, patient caregiver. Ground-floor unit, no stairs.',
  },
  {
    id: 'WA-REQ-0998', source: 'WhatsApp', status: REQUEST_STATUS.booked, receivedAt: hoursAgo(70),
    patientName: 'Nadia Ismail', phone: '+60 19-876 5501',
    address: '15 Jalan 17/29, Seksyen 17, 46400 Petaling Jaya', area: 'Petaling Jaya', lat: 3.1215, lng: 101.6360,
    careType: 'Physiotherapy support', preferredDate: localDate(3), preferredStart: '14:00', durationMins: 60, preferredGender: 'Female',
    notes: 'Post-stroke mobility exercises. Please bring a resistance band.',
    booking: { caregiverId: 'CG-1004', caregiverName: 'Siti Aminah' },
  },
  {
    id: 'WEB-REQ-0995', source: 'Website', status: REQUEST_STATUS.rejected, receivedAt: hoursAgo(96),
    statusReason: 'Asked for a single 15-minute reminder call; our minimum home visit is 1 hour.',
    patientName: 'Sofia Hassan', phone: '+60 11-3350 7712',
    address: '3 Jalan Cheras Hartamas, 56100 Cheras', area: 'Cheras', lat: 3.0900, lng: 101.7450,
    careType: 'Medication management', preferredDate: localDate(5), preferredStart: '11:00', durationMins: 60, preferredGender: 'No preference',
    notes: 'Medication reminder only.',
  },
  // Today's jobs for the demo caregiver, Sarah Tan (CG-1013).
  {
    id: 'WA-REQ-0991', source: 'WhatsApp', status: REQUEST_STATUS.booked, receivedAt: hoursAgo(120),
    patientName: 'Mei Ling', phone: '+60 12-610 3321',
    address: '18 Jalan Desa Bakti, Taman Desa, 58100 Kuala Lumpur', area: 'Kuala Lumpur City', lat: 3.1027, lng: 101.6852,
    careType: 'Medication management', preferredDate: localDate(0), preferredStart: '08:30', durationMins: 45, preferredGender: 'Female',
    notes: 'Morning medication and a quick wellbeing check. Emergency contact: Daniel Ling, 012-345 6789.',
    booking: { caregiverId: 'CG-1013', caregiverName: 'Sarah Tan' },
  },
  {
    id: 'WEB-REQ-0989', source: 'Website', status: REQUEST_STATUS.booked, receivedAt: hoursAgo(118),
    patientName: 'Ahmad Ibrahim', phone: '+60 13-448 9012',
    address: '22 Jalan Telawi 5, Bangsar Baru, 59100 Kuala Lumpur', area: 'Bangsar', lat: 3.1310, lng: 101.6710,
    careType: 'Physiotherapy support', preferredDate: localDate(0), preferredStart: '10:30', durationMins: 60, preferredGender: 'No preference',
    notes: 'Knee-strengthening routine from his physiotherapist. Parking is at the back lane.',
    booking: { caregiverId: 'CG-1013', caregiverName: 'Sarah Tan' },
  },
  {
    id: 'WA-REQ-0987', source: 'WhatsApp', status: REQUEST_STATUS.booked, receivedAt: hoursAgo(110),
    patientName: 'Lily Wong', phone: '+60 16-720 5518',
    address: '9 Jalan Seputeh, Taman Seputeh, 58000 Kuala Lumpur', area: 'Kuala Lumpur City', lat: 3.1142, lng: 101.6846,
    careType: 'Elderly care', preferredDate: localDate(0), preferredStart: '14:00', durationMins: 90, preferredGender: 'Female',
    notes: 'Grocery run and companionship. Enjoys a short walk to the park if the weather is fine.',
    booking: { caregiverId: 'CG-1013', caregiverName: 'Sarah Tan' },
  },
];

export function seedBookingData() {
  if (window.localStorage.getItem(REQUESTS_KEY)) return;

  const requests = {};
  const bookings = {};
  let nextId = 7001;

  REQUESTS.forEach(({ booking: assignment, ...request }) => {
    requests[request.id] = { ...request, statusReason: request.statusReason || '', bookingId: '', updatedAt: request.receivedAt };
    if (!assignment) return;

    const id = `BK-${nextId++}`;
    const rate = SERVICE_RATES[request.careType] || 40;
    const price = priceFor(rate, request.durationMins);
    requests[request.id].bookingId = id;
    bookings[id] = {
      id,
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
      caregiverId: assignment.caregiverId,
      caregiverName: assignment.caregiverName,
      date: request.preferredDate,
      startTime: request.preferredStart,
      endTime: endTimeOf(request.preferredStart, request.durationMins),
      durationMins: request.durationMins,
      rate,
      price,
      caregiverPayout: Math.round(price * CAREGIVER_SHARE * 100) / 100,
      status: BOOKING_STATUS.confirmed,
      receiptStatus: 'Receipt pending',
      payoutStatus: 'Awaiting payout',
      createdAt: request.receivedAt,
      updatedAt: request.receivedAt,
      history: [{ at: request.receivedAt, action: BOOKING_STATUS.confirmed, reason: '' }],
    };
  });

  window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  window.localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export function resetBookingData() {
  BOOKING_STORE_KEYS.forEach((key) => window.localStorage.removeItem(key));
}
