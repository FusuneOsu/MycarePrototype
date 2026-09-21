export const mockBedInventory = [
  {
    location: 'Petaling Jaya',
    bedsTotal: 28,
    occupied: 18,
    available: 10,
    lastUpdated: '2026-09-17',
    type: 'Care center',
    occupancyRate: 64,
  },
  {
    location: 'Subang Jaya',
    bedsTotal: 22,
    occupied: 16,
    available: 6,
    lastUpdated: '2026-09-17',
    type: 'Care center',
    occupancyRate: 73,
  },
  {
    location: 'Cheras',
    bedsTotal: 19,
    occupied: 12,
    available: 7,
    lastUpdated: '2026-09-17',
    type: 'Care center',
    occupancyRate: 63,
  },
  {
    location: 'Ampang',
    bedsTotal: 25,
    occupied: 14,
    available: 11,
    lastUpdated: '2026-09-17',
    type: 'Care center',
    occupancyRate: 56,
  },
  {
    location: 'Kuala Lumpur',
    bedsTotal: 30,
    occupied: 21,
    available: 9,
    lastUpdated: '2026-09-17',
    type: 'Home-based + centre',
    occupancyRate: 70,
  },
];

export const mockDischargeBreakdown = [
  { label: 'Previously discharged', value: 42, color: 'var(--ui-green)' },
  { label: 'Currently active', value: 58, color: 'var(--ui-gold)' },
];

export const mockPtoRequests = [
  { caregiver: 'Adam Tan', dates: '2026-09-18 to 2026-09-20', status: 'Approved', days: 3 },
  { caregiver: 'Nurul Huda', dates: '2026-09-19 to 2026-09-21', status: 'Pending', days: 3 },
  { caregiver: 'Wei Ling Chong', dates: '2026-09-20', status: 'Approved', days: 1 },
  { caregiver: 'Priya Sharma', dates: '2026-09-22 to 2026-09-24', status: 'Pending', days: 3 },
];

export const mockTrendSeries = [
  { label: 'Mon', patients: 18, appointments: 26, beds: 72 },
  { label: 'Tue', patients: 21, appointments: 30, beds: 68 },
  { label: 'Wed', patients: 17, appointments: 27, beds: 70 },
  { label: 'Thu', patients: 23, appointments: 31, beds: 74 },
  { label: 'Fri', patients: 24, appointments: 34, beds: 76 },
  { label: 'Sat', patients: 16, appointments: 20, beds: 69 },
  { label: 'Sun', patients: 14, appointments: 18, beds: 66 },
];

// This is intentionally generated as a prototype dataset for future D1 / SQL storage.
// It mirrors the shape of a future `in_house_beds` table for dashboard use.
export const mockBedSeedSql = `
CREATE TABLE in_house_beds (
  id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  beds_total INTEGER NOT NULL,
  occupied INTEGER NOT NULL,
  available INTEGER NOT NULL,
  occupancy_rate INTEGER NOT NULL,
  last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO in_house_beds (id, location, beds_total, occupied, available, occupancy_rate, last_updated) VALUES
  ('BED-001', 'Petaling Jaya', 28, 18, 10, 64, '2026-09-17'),
  ('BED-002', 'Subang Jaya', 22, 16, 6, 73, '2026-09-17'),
  ('BED-003', 'Cheras', 19, 12, 7, 63, '2026-09-17'),
  ('BED-004', 'Ampang', 25, 14, 11, 56, '2026-09-17'),
  ('BED-005', 'Kuala Lumpur', 30, 21, 9, 70, '2026-09-17');
`;
