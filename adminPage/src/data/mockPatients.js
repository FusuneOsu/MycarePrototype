const today = new Date();

function offsetDate(days) {
  const date = new Date(today);
  date.setDate(today.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export const mockPatients = [
  {
    id: 'PT-1001',
    name: 'Aisha Rahman',
    gender: 'Female',
    preferredLanguage: 'Malay',
    languages: ['Malay', 'English'],
    dateAdded: offsetDate(0),
    center: 'Petaling Jaya',
  },
  {
    id: 'PT-1002',
    name: 'Daniel Lim',
    gender: 'Male',
    preferredLanguage: 'English',
    languages: ['English', 'Mandarin'],
    dateAdded: offsetDate(-2),
    center: 'Subang Jaya',
  },
  {
    id: 'PT-1003',
    name: 'Sofia Hassan',
    gender: 'Female',
    preferredLanguage: 'Malay',
    languages: ['Malay', 'Tamil'],
    dateAdded: offsetDate(-5),
    center: 'Cheras',
  },
  {
    id: 'PT-1004',
    name: 'Wei Jun Tan',
    gender: 'Male',
    preferredLanguage: 'Mandarin',
    languages: ['Mandarin', 'English'],
    dateAdded: offsetDate(-8),
    center: 'Ampang',
  },
  {
    id: 'PT-1005',
    name: 'Nadia Ismail',
    gender: 'Female',
    preferredLanguage: 'English',
    languages: ['English', 'Malay'],
    dateAdded: offsetDate(-12),
    center: 'Petaling Jaya',
  },
  {
    id: 'PT-1006',
    name: 'Ravi Nair',
    gender: 'Male',
    preferredLanguage: 'Tamil',
    languages: ['Tamil', 'English'],
    dateAdded: offsetDate(-18),
    center: 'Cheras',
  },
  {
    id: 'PT-1007',
    name: 'Maya Binti Idris',
    gender: 'Female',
    preferredLanguage: 'Malay',
    languages: ['Malay', 'English', 'Arabic'],
    dateAdded: offsetDate(-22),
    center: 'Ampang',
  },
  {
    id: 'PT-1008',
    name: 'Harish Menon',
    gender: 'Male',
    preferredLanguage: 'English',
    languages: ['English'],
    dateAdded: offsetDate(-30),
    center: 'Subang Jaya',
  },
  {
    id: 'PT-1009',
    name: 'Leela Ramachandran',
    gender: 'Female',
    preferredLanguage: 'Tamil',
    languages: ['Tamil', 'Malay'],
    dateAdded: offsetDate(-40),
    center: 'Petaling Jaya',
  },
  {
    id: 'PT-1010',
    name: 'Irfan Abdullah',
    gender: 'Male',
    preferredLanguage: 'Malay',
    languages: ['Malay', 'English'],
    dateAdded: offsetDate(-45),
    center: 'Kuala Lumpur',
  },
];

export function fetchPatients() {
  return Promise.resolve(mockPatients);
}
