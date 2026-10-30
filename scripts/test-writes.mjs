// scripts/test-writes.mjs
async function run() {
  console.log('Testing Write APIs on http://localhost:5173...\n');

  // 1. Create a Caregiver
  const cgRes = await fetch('http://localhost:5173/api/caregivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nurul Huda Test',
      gender: 'Female',
      center: 'Kuala Lumpur',
      availability: 'Available',
      languages: ['Malay', 'English'],
      skills: ['Elderly Care', 'Wound Dressing'],
    }),
  });
  const cgData = await cgRes.json();
  console.log(`1. POST /api/caregivers -> HTTP ${cgRes.status}:`, cgData);

  const newCgId = cgData.id;

  // 2. Update Caregiver Availability
  if (newCgId) {
    const availRes = await fetch(`http://localhost:5173/api/caregivers/${newCgId}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: 'On Duty' }),
    });
    const availData = await availRes.json();
    console.log(`2. PUT /api/caregivers/${newCgId}/availability -> HTTP ${availRes.status}:`, availData);
  }

  // 3. Create a Request
  const reqRes = await fetch('http://localhost:5173/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'WhatsApp',
      patient_name: 'Uncle Lee Test',
      phone: '+60129998877',
      requested_date: '2026-11-01',
      preferred_start: '09:00',
      preferred_end: '12:00',
      location: 'Bangsar, KL',
      notes: 'Need mobility assistance test',
    }),
  });
  const reqData = await reqRes.json();
  console.log(`3. POST /api/requests -> HTTP ${reqRes.status}:`, reqData);

  const newReqId = reqData.id;

  // 4. Create a Booking from that request
  const bkRes = await fetch('http://localhost:5173/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: newReqId,
      caregiver_id: newCgId || 'CG-1001',
      patient_name: 'Uncle Lee Test',
      date: '2026-11-01',
      start_time: '09:00',
      end_time: '12:00',
      duration_mins: 180,
      location: 'Bangsar, KL',
      service_type: 'Elderly Care',
      rate_cents: 4500,
    }),
  });
  const bkData = await bkRes.json();
  console.log(`4. POST /api/bookings -> HTTP ${bkRes.status}:`, bkData);

  // 5. Query /api/caregivers, /api/requests, and /api/bookings to verify persistence
  console.log('\n--- Verifying Persistence from DB Read Endpoints ---');
  const getCg = await (await fetch('http://localhost:5173/api/caregivers')).json();
  console.log(`Caregivers count: ${getCg.length}, includes Nurul: ${getCg.some(c => c.name.includes('Nurul'))}`);

  const getBk = await (await fetch('http://localhost:5173/api/bookings')).json();
  console.log(`Bookings count: ${getBk.length}, includes Uncle Lee: ${getBk.some(b => b.patient_name?.includes('Uncle Lee'))}`);

  const getReq = await (await fetch('http://localhost:5173/api/requests')).json();
  const testReq = getReq.find(r => r.id === newReqId);
  console.log(`Requests count: ${getReq.length}, test request status: ${testReq ? testReq.status : 'not found'}`);
}

run().catch(console.error);
