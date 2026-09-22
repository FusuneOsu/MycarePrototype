-- mycarePrototypeRDBMS
-- Cloudflare D1 schema for the myCare admin prototype.
-- Run with: wrangler d1 execute mycarePrototypeRDBMS --file=./db/schema.sql

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS pto_requests;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS post_op_patients;
DROP TABLE IF EXISTS patient_requests;
DROP TABLE IF EXISTS caregiver_skills;
DROP TABLE IF EXISTS caregivers;

-- Caregivers -----------------------------------------------------------
CREATE TABLE caregivers (
  id            TEXT PRIMARY KEY,            -- e.g. 'CG-1001'
  name          TEXT NOT NULL,
  gender        TEXT NOT NULL,
  center        TEXT NOT NULL,               -- location / branch, also used as the matching zone
  availability  TEXT NOT NULL DEFAULT 'Available',
    -- one of: Available, On Duty, Off Duty, On Leave
  phone         TEXT,
  email         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_caregivers_center ON caregivers (center);
CREATE INDEX idx_caregivers_availability ON caregivers (availability);

-- Caregiver skills / specializations (many-to-many) ----------------------
CREATE TABLE caregiver_skills (
  caregiver_id  TEXT NOT NULL REFERENCES caregivers (id),
  skill         TEXT NOT NULL,
    -- e.g. Elderly care, Post-surgery care, Pediatric care, Physiotherapy support
  PRIMARY KEY (caregiver_id, skill)
);

CREATE INDEX idx_caregiver_skills_skill ON caregiver_skills (skill);


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

-- Patient requests (WhatsApp / website intake) ----------------------------
CREATE TABLE patient_requests (
  id                      TEXT PRIMARY KEY,        -- e.g. 'WA-REQ-1001'
  source                  TEXT NOT NULL,           -- WhatsApp, Website
  status                  TEXT NOT NULL DEFAULT 'New',
    -- one of: New, In Review, Booked, Rejected
  patient_id              TEXT REFERENCES post_op_patients (id),
  patient_name            TEXT NOT NULL,
  phone                   TEXT,
  preferred_language      TEXT,
  care_type               TEXT NOT NULL,
  gender_preference       TEXT NOT NULL DEFAULT 'No preference',
  required_skill          TEXT,                    -- e.g. Post-surgery care, Elderly care
  zone                    TEXT NOT NULL,            -- area/zone used to match nearest caregivers
  location                TEXT NOT NULL,
  requested_date          TEXT NOT NULL,            -- ISO date (YYYY-MM-DD)
  preferred_start         TEXT NOT NULL,             -- HH:MM
  preferred_end           TEXT NOT NULL,             -- HH:MM
  notes                   TEXT,
  service_amount_cents    INTEGER NOT NULL DEFAULT 0,
  caregiver_payment_cents INTEGER NOT NULL DEFAULT 0,
  assignment_status       TEXT NOT NULL DEFAULT 'Pending assignment',
  receipt_status          TEXT NOT NULL DEFAULT 'Receipt pending',
  payout_status           TEXT NOT NULL DEFAULT 'Awaiting payment',
  assigned_caregiver_id   TEXT REFERENCES caregivers (id),
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_requests_status ON patient_requests (status);
CREATE INDEX idx_requests_zone ON patient_requests (zone);
CREATE INDEX idx_requests_caregiver ON patient_requests (assigned_caregiver_id);

-- Booking records (requests once a caregiver has been assigned) ---------
-- A request moves out of the Requests queue and into here the moment it's
-- assigned; status then progresses independently of patient_requests.status.
CREATE TABLE bookings (
  id                TEXT PRIMARY KEY,          -- e.g. 'BK-5001'
  request_id        TEXT REFERENCES patient_requests (id),
  patient_name      TEXT NOT NULL,
  caregiver_id      TEXT NOT NULL REFERENCES caregivers (id),
  scheduled_at      TEXT NOT NULL,             -- ISO datetime (date + start time)
  duration_mins     INTEGER NOT NULL DEFAULT 60,
  location          TEXT NOT NULL,
  service_type      TEXT NOT NULL,             -- e.g. Post-surgery care, Elderly care
  status            TEXT NOT NULL DEFAULT 'Caregiver assigned',
    -- one of: Caregiver assigned, In progress, Service completed, Missed,
    -- Cancelled, Link sent (Unpaid), Paid - Online, Paid - Collected Directly
  rate_cents        INTEGER NOT NULL DEFAULT 0,
  invoice_pdf         TEXT,     -- data: URL of the generated invoice PDF (base64)
  stripe_session_id   TEXT,     -- Stripe Checkout Session id for the payment link
  stripe_checkout_url TEXT,     -- Stripe Checkout Session url (re-openable)
  receipt_url         TEXT,     -- Stripe hosted receipt URL, or an admin-uploaded data: URL
  payment_method      TEXT,     -- 'stripe' | 'direct'
  paid_at             TEXT,     -- ISO datetime the booking was marked paid
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_bookings_caregiver ON bookings (caregiver_id);
CREATE INDEX idx_bookings_status ON bookings (status);

