// scripts/test-endpoints.mjs
const endpoints = [
  '/api/db/test',
  '/api/caregivers',
  '/api/caregivers-list',
  '/api/bookings',
  '/api/appointments',
  '/api/requests',
  '/api/patients',
  '/api/payments',
  '/api/dashboard',
  '/api/caregiving-sites',
];

async function testAll() {
  console.log('Testing live endpoints against http://localhost:5173...');
  for (const ep of endpoints) {
    try {
      const res = await fetch('http://localhost:5173' + ep);
      const data = await res.json();
      let summary = '';
      if (Array.isArray(data)) {
        summary = `Array (${data.length} items): ` + data.map((d) => d.id || d.name).slice(0, 3).join(', ');
      } else if (data.bookings) {
        summary = `Dashboard: bookings=${data.bookings.length}, caregivers=${data.caregivers.length}`;
      } else {
        summary = JSON.stringify(data).slice(0, 80);
      }
      console.log(`[HTTP ${res.status}] ${ep.padEnd(25)} -> ${summary}`);
    } catch (err) {
      console.error(`[FAIL] ${ep}:`, err.message);
    }
  }
}

testAll();
