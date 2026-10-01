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
// id is the primary key in the `caregiving_sites` SQL table.
export const CAREGIVING_SITES = [
  { id: 'SITE-001', name: 'Caregiver Center 1', area: 'Petaling Jaya', latitude: 3.1073, longitude: 101.6064 },
  { id: 'SITE-002', name: 'Caregiver Center 2', area: 'Subang Jaya',    latitude: 3.0568, longitude: 101.5852 },
  { id: 'SITE-003', name: 'Caregiver Center 3', area: 'Cheras',         latitude: 3.1008, longitude: 101.7242 },
  { id: 'SITE-004', name: 'Caregiver Center 4', area: 'Ampang',         latitude: 3.1480, longitude: 101.7595 },
  { id: 'SITE-005', name: 'Caregiver Center 5', area: 'Setiawangsa',    latitude: 3.1905, longitude: 101.7380 },
  { id: 'SITE-006', name: 'Caregiver Center 6', area: 'Shah Alam',      latitude: 3.0733, longitude: 101.5185 },
];

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
