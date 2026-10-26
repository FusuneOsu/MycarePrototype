// Single source of truth for the option lists both apps use.
//
// The admin caregiver table/detail modal and the caregiver-facing application
// and profile must agree on these values, otherwise a caregiver picks
// "Bahasa Melayu" and the admin list filters on "Malay" and never finds them.
// adminPage/src/data/caregiverFormOptions.js and languageOptions.js re-export
// from here under their original names.

export const GENDERS = ['Male', 'Female'];

export const LANGUAGES = ['Malay', 'English', 'Chinese', 'Tamil'];

export const TRAVEL_MODES = ['Car', 'Motorcycle', 'Public Transport', 'Ride-sharing'];

export const CENTERS = ['Ampang', 'Cheras', 'Petaling Jaya', 'Setiawangsa', 'Shah Alam', 'Subang Jaya'];

// Caregiving sites with approximate GPS coordinates for OpenStreetMap.
// A caregiving site is a physical location where services can happen.
// A caregiver's "base" (their reporting branch) references one of these.
// id is the primary key in the `caregiving_sites` SQL table.
export const CAREGIVING_SITES = [
  { id: 'SITE-001', name: 'Caregiver Center 1', area: 'Petaling Jaya', address: '12 Jalan SS 21/1, Damansara Utama, 47400 Petaling Jaya', latitude: 3.1073, longitude: 101.6064, phone: '+60 3-XXXX 1001', facilityFee: 10, operatingHours: { open: '07:00', close: '23:00' } },
  { id: 'SITE-002', name: 'Caregiver Center 2', area: 'Subang Jaya',    address: '8 Jalan USJ 10/1, Taipan, 47620 Subang Jaya',         latitude: 3.0568, longitude: 101.5852, phone: '+60 3-XXXX 1002', facilityFee: 8,  operatingHours: { open: '07:00', close: '22:00' } },
  { id: 'SITE-003', name: 'Caregiver Center 3', area: 'Cheras',         address: '22 Jalan Ceria 2, Taman Ceria, 56100 Cheras',          latitude: 3.1008, longitude: 101.7242, phone: '+60 3-XXXX 1003', facilityFee: 8,  operatingHours: { open: '08:00', close: '22:00' } },
  { id: 'SITE-004', name: 'Caregiver Center 4', area: 'Ampang',         address: '5 Jalan Ampang Indah, Taman Ampang Indah, 68000 Ampang', latitude: 3.1480, longitude: 101.7595, phone: '+60 3-XXXX 1004', facilityFee: 10, operatingHours: { open: '07:00', close: '23:00' } },
  { id: 'SITE-005', name: 'Caregiver Center 5', area: 'Setiawangsa',    address: '3 Jalan Setiawangsa 11, Taman Setiawangsa, 54200 Kuala Lumpur', latitude: 3.1905, longitude: 101.7380, phone: '+60 3-XXXX 1005', facilityFee: 7,  operatingHours: { open: '08:00', close: '21:00' } },
  { id: 'SITE-006', name: 'Caregiver Center 6', area: 'Shah Alam',      address: '15 Jalan SA 2, Seksyen 2, 40000 Shah Alam',            latitude: 3.0733, longitude: 101.5185, phone: '+60 3-XXXX 1006', facilityFee: 6,  operatingHours: { open: '08:00', close: '21:00' } },
];

// Helper: find a site by id
export function getSiteById(id) {
  return CAREGIVING_SITES.find((s) => s.id === id) || null;
}

// Haversine distance (km) between two { lat, lng } points.
function haversineKm(a, b) {
  if (!a || !b) return null;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// Compute distance from a caregiver's base site to a patient's coordinates.
// Returns null when either side has missing coordinates.
export function distanceFromBaseToPatient(caregiverBaseSiteId, patientLat, patientLng) {
  if (!caregiverBaseSiteId || patientLat == null || patientLng == null) return null;
  const site = getSiteById(caregiverBaseSiteId);
  if (!site) return null;
  return haversineKm({ lat: site.latitude, lng: site.longitude }, { lat: patientLat, lng: patientLng });
}

// Area → zone mapping used for "nearest to patient" recommendations.
export const SITE_AREAS = CAREGIVING_SITES.map(s => s.area);

// Neighbourhoods a caregiver is willing to travel to for home visits. Separate
// from CENTERS: a caregiver is based at one center but covers several areas.
export const COVERAGE_AREAS = ['Ampang', 'Bangsar', 'Cheras', 'Kepong', 'Kuala Lumpur City', 'Petaling Jaya', 'Puchong', 'Setapak', 'Shah Alam', 'Subang Jaya'];

// Matches the `availability` column in adminPage/db/schema.sql.
export const AVAILABILITY = ['Available', 'On Duty', 'Off Duty', 'On Leave'];

// Admin actions that take an Active caregiver out of the booking pool without
// deleting their record. Suspended = temporary (e.g. long leave, investigation);
// Deactivated = offboarded. Both can be reversed.
export const ACCOUNT_HOLDS = ['Suspended', 'Deactivated'];

export const STATES = ['Kuala Lumpur', 'Selangor', 'Putrajaya', 'Penang', 'Johor', 'Perak', 'Negeri Sembilan', 'Melaka'];

export const EXPERIENCE_BANDS = ['Less than 1 year', '1 - 2 years', '3 - 5 years', '6 - 10 years', 'More than 10 years'];

export const SPECIALISATIONS = ['Post-operative care', 'Elderly care', 'Dementia care', 'Physiotherapy support', 'Wound care', 'Palliative care', 'Paediatric care', 'Medication management'];

export const SHIFTS = ['Morning (7am - 3pm)', 'Afternoon (3pm - 11pm)', 'Night (11pm - 7am)', 'Flexible'];

export const WORKING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const WORK_ACCOMMODATIONS_MAX_WORDS = 250;
