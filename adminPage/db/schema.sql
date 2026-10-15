-- mycarePrototypeRDBMS
-- Cloudflare D1 schema for the myCare admin prototype.
-- Two-table design: requests (intake) → bookings (confirmed service + payment).
-- The standalone appointments table has been merged into bookings.
-- Run with: wrangler d1 execute mycarePrototypeRDBMS --file=./db/schema.sql

-- Disable FK enforcement during DROP so tables can be dropped in any order.
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS pto_requests;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS post_op_patients;
DROP TABLE IF EXISTS caregiver_skills;
DROP TABLE IF EXISTS caregivers;
DROP TABLE IF EXISTS caregiving_sites;

-- Re-enable FK enforcement for the CREATE statements and future operations.
PRAGMA foreign_keys = ON;

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

-- Caregiving sites (locations with GPS coordinates for OpenStreetMap) ------
CREATE TABLE caregiving_sites (
  id            TEXT PRIMARY KEY,            -- e.g. 'SITE-001'
  name          TEXT NOT NULL,               -- e.g. 'Caregiver Center 1'
  area          TEXT NOT NULL,               -- e.g. 'Petaling Jaya'
  latitude      REAL NOT NULL,
  longitude     REAL NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_caregiving_sites_area ON caregiving_sites (area);

-- Requests (WhatsApp / website intake) ------------------------------------
-- The intake table: every incoming request lands here. Once a caregiver is
-- assigned and the booking is confirmed, a bookings record is created and
-- this request's status moves to 'Booked'.
CREATE TABLE requests (
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
  latitude                REAL,
  longitude               REAL,
  requested_date          TEXT NOT NULL,            -- ISO date (YYYY-MM-DD)
  preferred_start         TEXT NOT NULL,             -- HH:MM
  preferred_end           TEXT NOT NULL,             -- HH:MM
  notes                   TEXT,
  service_amount_cents    INTEGER NOT NULL DEFAULT 0,
  caregiver_payment_cents INTEGER NOT NULL DEFAULT 0,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_requests_status ON requests (status);
CREATE INDEX idx_requests_zone ON requests (zone);

-- Booking records (confirmed appointments + payment) --------------------
-- Created when a request is assigned a caregiver. This single table handles
-- the entire lifecycle: from assignment through service completion to payment.
-- Appointment-specific fields (tasks, instructions, location mode) live here
-- so there is no separate appointments table to keep in sync.
CREATE TABLE bookings (
  id                TEXT PRIMARY KEY,          -- e.g. 'BK-5001'
  request_id        TEXT REFERENCES requests (id),
  patient_name      TEXT NOT NULL,
  caregiver_id      TEXT NOT NULL REFERENCES caregivers (id),
  caregiver_name    TEXT,
  date              TEXT NOT NULL,             -- YYYY-MM-DD
  start_time        TEXT NOT NULL,             -- HH:MM
  end_time          TEXT NOT NULL,             -- HH:MM
  duration_mins     INTEGER NOT NULL DEFAULT 60,
  location          TEXT NOT NULL,
  address           TEXT,
  latitude          REAL,
  longitude         REAL,
  service_type      TEXT NOT NULL,             -- e.g. Post-surgery care, Elderly care
  status            TEXT NOT NULL DEFAULT 'Caregiver assigned',
    -- Unified linear flow:
    --   Caregiver assigned → In progress → Service completed → Payment pending → Paid
    --                                                          ↘ Missed / Cancelled
    -- Payment sub-statuses:
    --   Link sent (Unpaid), Paid - Online, Paid - Collected Directly
  appointment_type  TEXT NOT NULL DEFAULT 'Home Visit',
    -- Home Visit, Care Center
  booking_type      TEXT NOT NULL DEFAULT 'One time',
    -- One time, Recurring
  caregiver_gender_preference TEXT NOT NULL DEFAULT 'No preference',
  location_mode     TEXT NOT NULL DEFAULT 'address',
    -- address, pinpoint, center
  tasks             TEXT,                     -- JSON array of task strings
  special_instructions TEXT DEFAULT '',
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
CREATE INDEX idx_bookings_date ON bookings (date);

