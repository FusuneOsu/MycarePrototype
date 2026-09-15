-- mycarePrototypeRDBMS
-- Cloudflare D1 schema for the myCare admin prototype.
-- Run with: wrangler d1 execute mycarePrototypeRDBMS --file=./db/schema.sql

DROP TABLE IF EXISTS pto_requests;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS post_op_patients;
DROP TABLE IF EXISTS caregivers;

-- Caregivers -----------------------------------------------------------
CREATE TABLE caregivers (
  id            TEXT PRIMARY KEY,            -- e.g. 'CG-1001'
  name          TEXT NOT NULL,
  gender        TEXT NOT NULL,
  center        TEXT NOT NULL,               -- location / branch
  availability  TEXT NOT NULL DEFAULT 'Available',
    -- one of: Available, On Duty, Off Duty, On Leave
  phone         TEXT,
  email         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_caregivers_center ON caregivers (center);
CREATE INDEX idx_caregivers_availability ON caregivers (availability);

-- Post-operative care patients ------------------------------------------
CREATE TABLE post_op_patients (
  id              TEXT PRIMARY KEY,          -- e.g. 'PT-2001'
  name            TEXT NOT NULL,
  gender          TEXT NOT NULL,
  center          TEXT NOT NULL,
  surgery_type    TEXT,
  surgery_date    TEXT,
  recovery_status TEXT NOT NULL DEFAULT 'Stable',
    -- one of: Stable, Needs Attention, Critical, Discharged
  assigned_caregiver_id TEXT REFERENCES caregivers (id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_patients_caregiver ON post_op_patients (assigned_caregiver_id);

-- Appointments -----------------------------------------------------------
CREATE TABLE appointments (
  id              TEXT PRIMARY KEY,          -- e.g. 'AP-3001'
  patient_id      TEXT REFERENCES post_op_patients (id),
  caregiver_id    TEXT REFERENCES caregivers (id),
  scheduled_at    TEXT NOT NULL,             -- ISO datetime
  duration_mins   INTEGER NOT NULL DEFAULT 60,
  status          TEXT NOT NULL DEFAULT 'Scheduled',
    -- one of: Scheduled, Completed, Cancelled, No-Show
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_appointments_caregiver ON appointments (caregiver_id);
CREATE INDEX idx_appointments_patient ON appointments (patient_id);

-- PTO / leave requests -----------------------------------------------------
CREATE TABLE pto_requests (
  id              TEXT PRIMARY KEY,          -- e.g. 'PTO-4001'
  caregiver_id    TEXT NOT NULL REFERENCES caregivers (id),
  start_date      TEXT NOT NULL,
  end_date        TEXT NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'Pending',
    -- one of: Pending, Approved, Rejected
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pto_caregiver ON pto_requests (caregiver_id);
