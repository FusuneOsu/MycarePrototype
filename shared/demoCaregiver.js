// The one demo caregiver both apps show.
//
// The admin directory reads the operational half (id, center, availability,
// manager…) and the caregiver profile page reads all of it. Keeping a single
// record means the two views cannot disagree about the same person — an
// earlier duplicate had Sarah listed under a different ID with a different
// phone number in each app.
export const DEMO_CAREGIVER = {
  // Directory / admin-owned
  id: 'CG-1013',
  name: 'Sarah Tan',
  username: 'sarah.tan',
  email: 'sarah.tan@example.com',
  gender: 'Female',
  center: 'Petaling Jaya',
  coverageAreas: ['Petaling Jaya', 'Bangsar', 'Kuala Lumpur City'],
  availability: 'Available',
  travelMode: 'Car',
  languages: ['English', 'Malay', 'Chinese'],
  workAccommodations: 'Keeps Friday afternoons free for a standing family commitment.',
  autoAssigned: 'Yes',
  managerName: 'Grace Lim',
  managerId: 'MGR-001',

  // Caregiver-facing profile
  role: 'Caregiver',
  initials: 'ST',
  joinedOn: '14 Mar 2023',
  startDate: '2023-03-14',
  phone: '+60 12-345 6789',
  idNumber: '940608-14-5522',
  dob: '1994-06-08',
  nationality: 'Malaysian',
  address: '12-3 Jalan Kemuja, Bangsar Utama',
  city: 'Kuala Lumpur',
  state: 'Kuala Lumpur',
  postcode: '59000',
  emergencyName: 'Daniel Tan',
  emergencyRelationship: 'Brother',
  emergencyPhone: '+60 12-988 4410',
  experienceBand: '3 - 5 years',
  previousEmployer: 'Sunway Medical Centre · Home Care Unit',
  bio: 'Community caregiver focused on post-operative recovery and elderly support. Comfortable coordinating medication schedules and keeping families informed after every visit.',
  specialisations: ['Post-operative care', 'Elderly care', 'Medication management'],
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  shift: 'Morning (7am - 3pm)',
  documents: [
    { label: 'IC or passport', file: 'sarah-tan-ic.pdf', status: 'Verified', expiry: '—' },
    { label: 'Caregiving or nursing certificate', file: 'nursing-diploma.pdf', status: 'Verified', expiry: '—' },
    { label: 'Additional training certificates', file: 'cpr-first-aid-2025.pdf', status: 'Verified', expiry: '30 Nov 2026' },
    { label: 'Reference letter', file: 'sunway-reference.pdf', status: 'Verified', expiry: '—' },
  ],
};
