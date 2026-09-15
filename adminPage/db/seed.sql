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
