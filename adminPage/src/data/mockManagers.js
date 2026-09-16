// Mock manager directory for the manager-id auto-fill lookup on the
// Assignment Reporting step. Real lookup (search-as-you-type against
// a managers table) is future development — for now this is a small
// static match so the auto-fill behavior is demonstrable.
export const MOCK_MANAGERS = [
  { name: 'Grace Lim', id: 'MGR-001' },
  { name: 'Daniel Wong', id: 'MGR-002' },
  { name: 'Aisyah Rahman', id: 'MGR-003' },
  { name: 'Kevin Pillai', id: 'MGR-004' },
];

export function lookupManagerId(managerName) {
  const match = MOCK_MANAGERS.find(
    (m) => m.name.trim().toLowerCase() === managerName.trim().toLowerCase()
  );
  return match ? match.id : '';
}
