const today = new Date();

function offsetDate(days) {
  const date = new Date(today);
  date.setDate(today.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const mockAppointments = [
  {
    id: 'AP-3001',
    patientId: 'PT-1001',
    patientName: 'Aisha Rahman',
    caregiverId: 'CG-1001',
    caregiverName: 'Adam Tan',
    date: offsetDate(0),
    startTime: '09:00',
    endTime: '10:30',
    status: 'Scheduled',
    appointmentType: 'Home Visit',
    bookingType: 'One time',
    caregiverGenderPreference: 'Female',
    locationMode: 'address',
    locationText: '12 Jalan Ampang, Kuala Lumpur',
    latitude: null,
    longitude: null,
    tasks: ['Assess mobility', 'Update wound notes'],
    specialInstructions: 'Please verify the stair rail and ensure medication schedule is reviewed.',
    isConflict: false,
  },
  {
    id: 'AP-3002',
    patientId: 'PT-1002',
    patientName: 'Daniel Lim',
    caregiverId: 'CG-1001',
    caregiverName: 'Adam Tan',
    date: offsetDate(0),
    startTime: '09:30',
    endTime: '11:00',
    status: 'Caregiver assigned',
    appointmentType: 'Home Visit',
    bookingType: 'One time',
    caregiverGenderPreference: 'Male',
    locationMode: 'pinpoint',
    locationText: 'Pinpointed location for Daniel Lim',
    latitude: '3.0849',
    longitude: '101.5860',
    tasks: ['Check blood pressure', 'Document recovery progress'],
    specialInstructions: 'Use the side gate and call before arrival.',
    isConflict: true,
  },
  {
    id: 'AP-3003',
    patientId: 'PT-1005',
    patientName: 'Nadia Ismail',
    caregiverId: 'CG-1004',
    caregiverName: 'Siti Aminah',
    date: offsetDate(1),
    startTime: '14:00',
    endTime: '15:00',
    status: 'Completed',
    appointmentType: 'Care Center',
    bookingType: 'Recurring',
    caregiverGenderPreference: 'No preference',
    locationMode: 'center',
    locationText: 'Bangsar Care Centre',
    latitude: null,
    longitude: null,
    tasks: ['Review physiotherapy goals'],
    specialInstructions: 'Bring the updated recovery booklet for review.',
    isConflict: false,
  },
  {
    id: 'AP-3004',
    patientId: 'PT-1006',
    patientName: 'Ravi Nair',
    caregiverId: 'CG-1009',
    caregiverName: 'Mei Ling Ong',
    date: offsetDate(2),
    startTime: '11:00',
    endTime: '12:00',
    status: 'In progress',
    appointmentType: 'Home Visit',
    bookingType: 'One time',
    caregiverGenderPreference: 'No preference',
    locationMode: 'address',
    locationText: '88 Jalan Sentral, Kuala Lumpur',
    latitude: null,
    longitude: null,
    tasks: ['Monitor hydration', 'Prepare education checklist'],
    specialInstructions: 'Patient may request additional rest after 20 minutes.',
    isConflict: false,
  },
  {
    id: 'AP-3005',
    patientId: 'PT-1007',
    patientName: 'Maya Binti Idris',
    caregiverId: 'CG-1012',
    caregiverName: 'Marcus D\'Souza',
    date: offsetDate(0),
    startTime: '15:00',
    endTime: '16:30',
    status: 'No caregiver assigned',
    appointmentType: 'Care Center',
    bookingType: 'Recurring',
    caregiverGenderPreference: 'Female',
    locationMode: 'center',
    locationText: 'Sungai Buloh Care Centre',
    latitude: null,
    longitude: null,
    tasks: ['Await caregiver assignment'],
    specialInstructions: 'Keep an empty bed slot ready at the care centre reception desk.',
    isConflict: true,
  },
  {
    id: 'AP-3006',
    patientId: 'PT-1009',
    patientName: 'Leela Ramachandran',
    caregiverId: 'CG-1002',
    caregiverName: 'Nurul Huda',
    date: offsetDate(4),
    startTime: '08:30',
    endTime: '09:30',
    status: 'Cancelled',
    appointmentType: 'Home Visit',
    bookingType: 'One time',
    caregiverGenderPreference: 'Female',
    locationMode: 'pinpoint',
    locationText: 'Patient-shortlisted location',
    latitude: '3.0823',
    longitude: '101.6802',
    tasks: ['Cancel and reschedule'],
    specialInstructions: 'Check whether the patient wants a male caregiver for the next cycle.',
    isConflict: false,
  },
  {
    id: 'AP-3007',
    patientId: 'PT-1010',
    patientName: 'Irfan Abdullah',
    caregiverId: 'CG-1006',
    caregiverName: 'Rajesh Kumar',
    date: offsetDate(5),
    startTime: '10:15',
    endTime: '11:45',
    status: 'Scheduled',
    appointmentType: 'Home Visit',
    bookingType: 'Recurring',
    caregiverGenderPreference: 'Male',
    locationMode: 'address',
    locationText: '15 Lorong Bukit, Shah Alam',
    latitude: null,
    longitude: null,
    tasks: ['Review medication reminders'],
    specialInstructions: 'Patient prefers short visits after breakfast.',
    isConflict: false,
  },
  {
    id: 'AP-3008',
    patientId: 'PT-1003',
    patientName: 'Sofia Hassan',
    caregiverId: 'CG-1007',
    caregiverName: 'Farah Aziz',
    date: offsetDate(6),
    startTime: '13:00',
    endTime: '14:00',
    status: 'Missed',
    appointmentType: 'Care Center',
    bookingType: 'One time',
    caregiverGenderPreference: 'No preference',
    locationMode: 'center',
    locationText: 'Cyberjaya Care Centre',
    latitude: null,
    longitude: null,
    tasks: ['Follow-up call'],
    specialInstructions: 'Confirm if patient is available for a rebook after the missed visit.',
    isConflict: false,
  },
];

export function fetchAppointments() {
  return Promise.resolve(mockAppointments);
}

// Bookings confirmed from the Requests flow (see mockRequests.js) live here,
// keyed by request id, so re-assigning a request updates the same visit
// instead of duplicating it. Kept separate from mockAppointments so the
// existing calendar seed data stays untouched.
const REQUEST_APPOINTMENTS_KEY = 'mycare.requestAppointments';

function readRequestAppointments() {
  try {
    return JSON.parse(window.localStorage.getItem(REQUEST_APPOINTMENTS_KEY) || '{}');
  } catch {
    return {};
  }
}

// Creates or updates the calendar visit tied to a patient request once a
// caregiver is confirmed — this is what makes the booking show up in the
// Appointments calendar. No payment step is required for this to happen.
export function upsertAppointmentFromRequest(request, caregiver) {
  const byRequestId = readRequestAppointments();
  byRequestId[request.id] = {
    id: `AP-${request.id}`,
    patientId: request.patientId,
    patientName: request.patientName,
    caregiverId: caregiver.id,
    caregiverName: caregiver.name,
    date: request.requestedDateISO,
    startTime: request.preferredStart,
    endTime: request.preferredEnd,
    status: 'Caregiver assigned',
    appointmentType: 'Home Visit',
    bookingType: 'One time',
    caregiverGenderPreference: request.genderPreference,
    locationMode: 'address',
    locationText: request.location,
    latitude: null,
    longitude: null,
    tasks: [],
    specialInstructions: request.notes || '',
    isConflict: false,
    sourceRequestId: request.id,
  };
  window.localStorage.setItem(REQUEST_APPOINTMENTS_KEY, JSON.stringify(byRequestId));
  return byRequestId[request.id];
}

// mockAppointments (calendar seed data) + any bookings confirmed via Requests.
export function getAllAppointments() {
  return [...mockAppointments, ...Object.values(readRequestAppointments())];
}

