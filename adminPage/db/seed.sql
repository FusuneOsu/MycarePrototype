-- Optional seed data so the D1 database has something to query
-- while you wire up real API calls.
-- Run with: wrangler d1 execute mycarePrototypeRDBMS --file=./db/seed.sql

INSERT INTO caregivers (id, name, gender, center, availability) VALUES
  ('CG-1001', 'Adam Tan', 'Male', 'Petaling Jaya', 'Available'),
  ('CG-1002', 'Nurul Huda', 'Female', 'Subang Jaya', 'On Duty'),
  ('CG-1003', 'Adam Krishnan', 'Male', 'Cheras', 'Off Duty'),
  ('CG-1004', 'Siti Aminah', 'Female', 'Petaling Jaya', 'Available'),
  ('CG-1005', 'Wei Ling Chong', 'Female', 'Ampang', 'On Leave'),
  ('CG-1006', 'Rajesh Kumar', 'Male', 'Subang Jaya', 'On Duty'),
  ('CG-1007', 'Farah Aziz', 'Female', 'Cheras', 'Available'),
  ('CG-1008', 'Adam Osei', 'Male', 'Ampang', 'Off Duty'),
  ('CG-1009', 'Mei Ling Ong', 'Female', 'Petaling Jaya', 'On Duty'),
  ('CG-1010', 'Hafiz Rahman', 'Male', 'Ampang', 'Available'),
  ('CG-1011', 'Priya Sharma', 'Female', 'Cheras', 'On Leave'),
  ('CG-1012', 'Marcus D''Souza', 'Male', 'Subang Jaya', 'Available');

INSERT INTO caregiver_skills (caregiver_id, skill) VALUES
  ('CG-1001', 'Post-surgery care'),
  ('CG-1001', 'Mobility assistance'),
  ('CG-1002', 'Elderly care'),
  ('CG-1002', 'Medication management'),
  ('CG-1003', 'Pediatric care'),
  ('CG-1004', 'Post-surgery care'),
  ('CG-1004', 'Wound care'),
  ('CG-1005', 'Elderly care'),
  ('CG-1006', 'Physiotherapy support'),
  ('CG-1006', 'Mobility assistance'),
  ('CG-1007', 'Post-surgery care'),
  ('CG-1007', 'Elderly care'),
  ('CG-1008', 'Pediatric care'),
  ('CG-1008', 'Medication management'),
  ('CG-1009', 'Physiotherapy support'),
  ('CG-1010', 'Elderly care'),
  ('CG-1010', 'Mobility assistance'),
  ('CG-1011', 'Post-surgery care'),
  ('CG-1012', 'Wound care'),
  ('CG-1012', 'Medication management');

INSERT INTO patient_requests (
  id, source, status, patient_name, phone, preferred_language, care_type,
  gender_preference, required_skill, zone, location, requested_date,
  preferred_start, preferred_end, notes, service_amount_cents, caregiver_payment_cents
) VALUES
  ('WA-REQ-1001', 'WhatsApp', 'New', 'Nur Aisyah Rahman', '+60 12-345 6789', 'Malay',
    'Post-operative home care', 'Female', 'Post-surgery care', 'Petaling Jaya',
    '24 Jalan Damai, Kuala Lumpur', date('now'), '10:00', '12:00',
    'Needs help with mobility, medication reminders, and wound-care observation after knee surgery.',
    12000, 9000),
  ('WEB-REQ-1002', 'Website', 'In Review', 'Daniel Lim', '+60 11-222 3344', 'English',
    'Daily home assistance', 'No preference', 'Elderly care', 'Subang Jaya',
    'Subang Jaya, Selangor', date('now', '+1 day'), '09:00', '10:00', NULL, 9000, 6500),
  ('WA-REQ-0998', 'WhatsApp', 'Booked', 'Nadia Ismail', '+60 13-987 6543', 'Malay',
    'Physiotherapy support', 'No preference', 'Physiotherapy support', 'Petaling Jaya',
    'Petaling Jaya, Selangor', date('now', '-4 day'), '14:00', '15:00', NULL, 8000, 6000),
  ('WEB-REQ-0995', 'Website', 'Rejected', 'Sofia Hassan', '+60 19-555 1122', 'English',
    'Medication reminders', 'No preference', 'Medication management', 'Cheras',
    'Cheras, Kuala Lumpur', date('now', '+2 day'), '11:00', '12:00', NULL, 7000, 5000);

INSERT INTO appointments (id, patient_id, patient_name, caregiver_id, caregiver_name, date, start_time, end_time, status, appointment_type, booking_type, caregiver_gender_preference, location_mode, location_text, latitude, longitude, tasks, special_instructions, duration_mins) VALUES
  ('AP-3001', NULL, 'Aisha Rahman', 'CG-1001', 'Adam Tan', date('now'), '09:00', '10:30', 'Scheduled', 'Home Visit', 'One time', 'Female', 'address', '12 Jalan Ampang, Kuala Lumpur', NULL, NULL, '["Assess mobility","Update wound notes"]', 'Please verify the stair rail and ensure medication schedule is reviewed.', 90),
  ('AP-3002', NULL, 'Daniel Lim', 'CG-1001', 'Adam Tan', date('now'), '09:30', '11:00', 'Caregiver assigned', 'Home Visit', 'One time', 'Male', 'pinpoint', 'Pinpointed location for Daniel Lim', '3.0849', '101.5860', '["Check blood pressure","Document recovery progress"]', 'Use the side gate and call before arrival.', 90),
  ('AP-3003', NULL, 'Nadia Ismail', 'CG-1004', 'Siti Aminah', date('now', '+1 day'), '14:00', '15:00', 'Completed', 'Care Center', 'Recurring', 'No preference', 'center', 'Bangsar Care Centre', NULL, NULL, '["Review physiotherapy goals"]', 'Bring the updated recovery booklet for review.', 60),
  ('AP-3004', NULL, 'Ravi Nair', 'CG-1009', 'Mei Ling Ong', date('now', '+2 day'), '11:00', '12:00', 'In progress', 'Home Visit', 'One time', 'No preference', 'address', '88 Jalan Sentral, Kuala Lumpur', NULL, NULL, '["Monitor hydration","Prepare education checklist"]', 'Patient may request additional rest after 20 minutes.', 60),
  ('AP-3005', NULL, 'Maya Binti Idris', 'CG-1012', 'Marcus D''Souza', date('now'), '15:00', '16:30', 'No caregiver assigned', 'Care Center', 'Recurring', 'Female', 'center', 'Sungai Buloh Care Centre', NULL, NULL, '["Await caregiver assignment"]', 'Keep an empty bed slot ready at the care centre reception desk.', 90),
  ('AP-3006', NULL, 'Leela Ramachandran', 'CG-1002', 'Nurul Huda', date('now', '+4 day'), '08:30', '09:30', 'Cancelled', 'Home Visit', 'One time', 'Female', 'pinpoint', 'Patient-shortlisted location', '3.0823', '101.6802', '["Cancel and reschedule"]', 'Check whether the patient wants a male caregiver for the next cycle.', 60),
  ('AP-3007', NULL, 'Irfan Abdullah', 'CG-1006', 'Rajesh Kumar', date('now', '+5 day'), '10:15', '11:45', 'Scheduled', 'Home Visit', 'Recurring', 'Male', 'address', '15 Lorong Bukit, Shah Alam', NULL, NULL, '["Review medication reminders"]', 'Patient prefers short visits after breakfast.', 90),
  ('AP-3008', NULL, 'Sofia Hassan', 'CG-1007', 'Farah Aziz', date('now', '+6 day'), '13:00', '14:00', 'Missed', 'Care Center', 'One time', 'No preference', 'center', 'Cyberjaya Care Centre', NULL, NULL, '["Follow-up call"]', 'Confirm if patient is available for a rebook after the missed visit.', 60);

INSERT INTO bookings (
  id, request_id, patient_name, caregiver_id, scheduled_at, duration_mins,
  location, service_type, status, rate_cents
) VALUES
  ('BK-5001', 'WA-REQ-0998', 'Nadia Ismail', 'CG-1006', datetime('now', '-3 day', 'start of day', '+14 hours'), 60,
    'Petaling Jaya, Selangor', 'Physiotherapy support', 'Service completed', 6000),
  ('BK-5002', 'WEB-REQ-0995', 'Sofia Hassan', 'CG-1008', datetime('now', '+2 day', 'start of day', '+11 hours'), 60,
    'Cheras, Kuala Lumpur', 'Medication management', 'Link sent (Unpaid)', 5000),
  ('BK-5003', 'WA-REQ-1001', 'Nur Aisyah Rahman', 'CG-1001', datetime('now', 'start of day', '+10 hours'), 120,
    '24 Jalan Damai, Kuala Lumpur', 'Post-surgery care', 'In progress', 9000),
  ('BK-5004', NULL, 'Marcus Lee', 'CG-1002', datetime('now', '-1 day', 'start of day', '+9 hours'), 90,
    'Subang Jaya, Selangor', 'Elderly care', 'Paid - Online', 8500),
  ('BK-5005', NULL, 'Priya Balan', 'CG-1011', datetime('now', '-2 day', 'start of day', '+16 hours'), 60,
    'Cheras, Kuala Lumpur', 'Post-surgery care', 'Missed', 7000);

INSERT INTO bookings (
  id, request_id, patient_name, caregiver_id, scheduled_at, duration_mins,
  location, service_type, status, rate_cents
) VALUES
  ('BK-5006', NULL, 'Amirah Zulkifli', 'CG-1001', datetime('now', '-4 day', 'start of day', '+9 hours'), 60,
    'Bangsar, Kuala Lumpur', 'Wound care', 'Service completed', 5500),
  ('BK-5007', NULL, 'Daniel Wong', 'CG-1002', datetime('now', '-5 day', 'start of day', '+13 hours'), 90,
    'Ampang, Kuala Lumpur', 'Dementia care', 'Service completed', 7500),
  ('BK-5008', NULL, 'Farah Nabila', 'CG-1006', datetime('now', '-2 day', 'start of day', '+8 hours'), 120,
    'Shah Alam, Selangor', 'Post-operative care', 'Service completed', 9500),
  ('BK-5009', NULL, 'Kevin Tan', 'CG-1008', datetime('now', '-6 day', 'start of day', '+15 hours'), 60,
    'Kepong, Kuala Lumpur', 'Palliative care', 'Service completed', 8000),
  ('BK-5010', NULL, 'Siti Rahayu', 'CG-1011', datetime('now', '-1 day', 'start of day', '+17 hours'), 60,
    'Setapak, Kuala Lumpur', 'Paediatric care', 'Service completed', 6500);

