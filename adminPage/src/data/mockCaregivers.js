// Placeholder data shaped like the future `caregivers` D1 table
// (see db/schema.sql). Swap fetchCaregivers() for a real API call
// once the Pages Function + D1 binding is wired up.

export const mockCaregivers = [
  { id: 'CG-1001', name: 'Adam Tan', gender: 'Male', center: 'Petaling Jaya', availability: 'Available' },
  { id: 'CG-1002', name: 'Nurul Huda', gender: 'Female', center: 'Subang Jaya', availability: 'On Duty' },
  { id: 'CG-1003', name: 'Adam Krishnan', gender: 'Male', center: 'Cheras', availability: 'Off Duty' },
  { id: 'CG-1004', name: 'Siti Aminah', gender: 'Female', center: 'Petaling Jaya', availability: 'Available' },
  { id: 'CG-1005', name: 'Wei Ling Chong', gender: 'Female', center: 'Ampang', availability: 'On Leave' },
  { id: 'CG-1006', name: 'Rajesh Kumar', gender: 'Male', center: 'Subang Jaya', availability: 'On Duty' },
  { id: 'CG-1007', name: 'Farah Aziz', gender: 'Female', center: 'Cheras', availability: 'Available' },
  { id: 'CG-1008', name: 'Adam Osei', gender: 'Male', center: 'Ampang', availability: 'Off Duty' },
  { id: 'CG-1009', name: 'Mei Ling Ong', gender: 'Female', center: 'Petaling Jaya', availability: 'On Duty' },
  { id: 'CG-1010', name: 'Hafiz Rahman', gender: 'Male', center: 'Ampang', availability: 'Available' },
  { id: 'CG-1011', name: 'Priya Sharma', gender: 'Female', center: 'Cheras', availability: 'On Leave' },
  { id: 'CG-1012', name: 'Marcus D\u2019Souza', gender: 'Male', center: 'Subang Jaya', availability: 'Available' },
];

// Simulates an async fetch so swapping in a real API later is a one-line change.
export function fetchCaregivers() {
  return Promise.resolve(mockCaregivers);
}
