-- ============================================================================
-- MyCare Platform - Clean PostgreSQL Database Schema (Short, Clean IDs)
-- ============================================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_chats CASCADE;
DROP TABLE IF EXISTS caregiver_payouts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS visit_reports CASCADE;
DROP TABLE IF EXISTS booking_history CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS patient_languages CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS caregiver_profile_changes CASCADE;
DROP TABLE IF EXISTS caregiver_holds CASCADE;
DROP TABLE IF EXISTS pto_requests CASCADE;
DROP TABLE IF EXISTS caregiver_documents CASCADE;
DROP TABLE IF EXISTS caregiver_coverage_areas CASCADE;
DROP TABLE IF EXISTS caregiver_languages CASCADE;
DROP TABLE IF EXISTS caregiver_skills CASCADE;
DROP TABLE IF EXISTS caregivers CASCADE;
DROP TABLE IF EXISTS caregiver_applications CASCADE;
DROP TABLE IF EXISTS caregiving_sites CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS caregiver_availability_enum CASCADE;
DROP TYPE IF EXISTS account_status_enum CASCADE;
DROP TYPE IF EXISTS application_status_enum CASCADE;
DROP TYPE IF EXISTS request_status_enum CASCADE;
DROP TYPE IF EXISTS booking_status_enum CASCADE;
DROP TYPE IF EXISTS payout_status_enum CASCADE;

-- Enums
CREATE TYPE user_role_enum AS ENUM ('admin', 'caregiver');
CREATE TYPE caregiver_availability_enum AS ENUM ('Available', 'On Duty', 'Off Duty', 'On Leave');
CREATE TYPE account_status_enum AS ENUM ('Draft', 'Pending approval', 'Not approved', 'Active', 'Suspended', 'Deactivated', 'Rejected');
CREATE TYPE application_status_enum AS ENUM ('Draft', 'Submitted', 'Under review', 'More info needed', 'Approved', 'Rejected');
CREATE TYPE request_status_enum AS ENUM ('New', 'In Review', 'Booked', 'Rejected');
CREATE TYPE booking_status_enum AS ENUM ('Caregiver assigned', 'In progress', 'Service completed', 'Payment pending', 'Link sent (Unpaid)', 'Paid - Online', 'Paid - Collected Directly', 'Paid', 'Cancelled', 'Missed');
CREATE TYPE payout_status_enum AS ENUM ('Awaiting payout', 'Ready to pay', 'Paid to caregiver');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. USERS (Clean ID: e.g. 'USR-0001', 'USR-1001')
CREATE TABLE users (
    id              VARCHAR(50) PRIMARY KEY, -- e.g. 'USR-0001'
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    role            user_role_enum NOT NULL DEFAULT 'caregiver',
    phone           VARCHAR(50),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE password_resets (
    id              SERIAL PRIMARY KEY,
    user_id         VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    token           VARCHAR(128) UNIQUE NOT NULL,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ
);

-- 2. SITES
CREATE TABLE caregiving_sites (
    id              VARCHAR(50) PRIMARY KEY, -- 'SITE-001'
    name            VARCHAR(150) NOT NULL,
    area            VARCHAR(100) NOT NULL,   -- 'Petaling Jaya'
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    address         TEXT,
    phone           VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. APPLICATIONS
CREATE TABLE caregiver_applications (
    id                  VARCHAR(50) PRIMARY KEY, -- 'APP-5001'
    user_id             VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    status              application_status_enum NOT NULL DEFAULT 'Draft',
    step                INTEGER NOT NULL DEFAULT 1,
    full_name           VARCHAR(150) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    phone               VARCHAR(50),
    gender              VARCHAR(20),
    id_number           VARCHAR(50),
    experience_band     VARCHAR(50),
    previous_employer   TEXT,
    bio                 TEXT,
    preferred_center    VARCHAR(100),
    shift               VARCHAR(100),
    travel_mode         VARCHAR(50),
    start_date          DATE,
    specialisations     JSONB DEFAULT '[]'::jsonb,
    languages           JSONB DEFAULT '[]'::jsonb,
    coverage_areas      JSONB DEFAULT '[]'::jsonb,
    working_days        JSONB DEFAULT '[]'::jsonb,
    documents_payload   JSONB DEFAULT '{}'::jsonb,
    review_note         TEXT,
    previous_note       TEXT,
    submitted_at        TIMESTAMPTZ,
    resubmitted_at      TIMESTAMPTZ,
    approved_at         TIMESTAMPTZ,
    returned_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. CAREGIVERS
CREATE TABLE caregivers (
    id                      VARCHAR(50) PRIMARY KEY, -- 'CG-1001'
    user_id                 VARCHAR(50) UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    application_id          VARCHAR(50) UNIQUE REFERENCES caregiver_applications(id) ON DELETE SET NULL,
    name                    VARCHAR(150) NOT NULL,
    username                VARCHAR(100) UNIQUE,
    email                   VARCHAR(255) UNIQUE NOT NULL,
    phone                   VARCHAR(50),
    gender                  VARCHAR(20) NOT NULL,
    center_id               VARCHAR(50) NOT NULL REFERENCES caregiving_sites(id) ON DELETE RESTRICT,
    center_name             VARCHAR(100) NOT NULL,
    availability            caregiver_availability_enum NOT NULL DEFAULT 'Available',
    account_status          account_status_enum NOT NULL DEFAULT 'Active',
    id_number               VARCHAR(50),
    dob                     DATE,
    nationality             VARCHAR(100) DEFAULT 'Malaysian',
    address                 TEXT,
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    postcode                VARCHAR(20),
    emergency_name          VARCHAR(150),
    emergency_relationship  VARCHAR(50),
    emergency_phone         VARCHAR(50),
    experience_band         VARCHAR(50),
    previous_employer       TEXT,
    bio                     TEXT,
    shift_preference        VARCHAR(100),
    travel_mode             VARCHAR(50),
    work_accommodations     TEXT,
    auto_assigned           VARCHAR(10) DEFAULT 'No',
    joined_on               DATE DEFAULT CURRENT_DATE,
    start_date              DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE caregiver_skills (
    caregiver_id    VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    skill           VARCHAR(100) NOT NULL,
    PRIMARY KEY (caregiver_id, skill)
);

CREATE TABLE caregiver_languages (
    caregiver_id    VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    language        VARCHAR(50) NOT NULL,
    PRIMARY KEY (caregiver_id, language)
);

CREATE TABLE caregiver_coverage_areas (
    caregiver_id    VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    area_name       VARCHAR(100) NOT NULL,
    PRIMARY KEY (caregiver_id, area_name)
);

CREATE TABLE caregiver_documents (
    id                  VARCHAR(50) PRIMARY KEY, -- 'DOC-1001'
    caregiver_id        VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    document_type       VARCHAR(50) NOT NULL,
    document_label      VARCHAR(150) NOT NULL,
    file_name           VARCHAR(255) NOT NULL,
    file_url            TEXT,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
    expiry_date         DATE,
    verified_at         TIMESTAMPTZ,
    verified_by         VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pto_requests (
    id              VARCHAR(50) PRIMARY KEY, -- 'PTO-4001'
    caregiver_id    VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    reason          TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'Pending',
    reviewed_by     VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE caregiver_holds (
    id              VARCHAR(50) PRIMARY KEY, -- 'HOLD-001'
    caregiver_id    VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    hold_state      VARCHAR(50) NOT NULL,
    reason          TEXT NOT NULL,
    applied_by      VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    since           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cleared_at      TIMESTAMPTZ
);

CREATE TABLE caregiver_profile_changes (
    id                  VARCHAR(50) PRIMARY KEY, -- 'CHG-1001'
    caregiver_id        VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    email               VARCHAR(255) NOT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'Pending approval',
    changes             JSONB NOT NULL,
    before_state        JSONB NOT NULL,
    review_note         TEXT,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at         TIMESTAMPTZ,
    reviewed_by         VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. PATIENTS
CREATE TABLE patients (
    id                  VARCHAR(50) PRIMARY KEY, -- 'PT-1001'
    name                VARCHAR(150) NOT NULL,
    gender              VARCHAR(20) NOT NULL,
    phone               VARCHAR(50),
    email               VARCHAR(255),
    preferred_language  VARCHAR(50) DEFAULT 'Malay',
    center_id           VARCHAR(50) REFERENCES caregiving_sites(id) ON DELETE SET NULL,
    center_name         VARCHAR(100),
    address             TEXT,
    date_added          DATE DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patient_languages (
    patient_id          VARCHAR(50) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    language            VARCHAR(50) NOT NULL,
    PRIMARY KEY (patient_id, language)
);

-- 6. WHATSAPP
CREATE TABLE whatsapp_chats (
    jid                 VARCHAR(100) PRIMARY KEY,
    contact_name        VARCHAR(150),
    contact_phone       VARCHAR(50),
    bot_state           VARCHAR(50) DEFAULT 'ACTIVE',
    last_message_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE whatsapp_messages (
    id                  VARCHAR(100) PRIMARY KEY,
    chat_jid            VARCHAR(100) NOT NULL REFERENCES whatsapp_chats(jid) ON DELETE CASCADE,
    from_me             BOOLEAN NOT NULL DEFAULT FALSE,
    sender_jid          VARCHAR(100) NOT NULL,
    message_text        TEXT,
    location_lat        DOUBLE PRECISION,
    location_lng        DOUBLE PRECISION,
    location_address    TEXT,
    raw_payload         JSONB,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. REQUESTS
CREATE TABLE requests (
    id                      VARCHAR(50) PRIMARY KEY, -- 'WA-REQ-1001'
    source                  VARCHAR(50) NOT NULL,
    status                  request_status_enum NOT NULL DEFAULT 'New',
    patient_id              VARCHAR(50) REFERENCES patients(id) ON DELETE SET NULL,
    whatsapp_chat_jid       VARCHAR(100) REFERENCES whatsapp_chats(jid) ON DELETE SET NULL,
    patient_name            VARCHAR(150) NOT NULL,
    phone                   VARCHAR(50),
    preferred_language      VARCHAR(50),
    care_type               VARCHAR(150) NOT NULL,
    gender_preference       VARCHAR(50) NOT NULL DEFAULT 'No preference',
    required_skill          VARCHAR(100),
    zone                    VARCHAR(100) NOT NULL,
    location                TEXT NOT NULL,
    latitude                DOUBLE PRECISION,
    longitude               DOUBLE PRECISION,
    requested_date          DATE NOT NULL,
    preferred_start         TIME NOT NULL,
    preferred_end           TIME NOT NULL,
    notes                   TEXT,
    service_amount_cents    INTEGER NOT NULL DEFAULT 0,
    caregiver_payment_cents INTEGER NOT NULL DEFAULT 0,
    reviewed_by             VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason        TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. BOOKINGS
CREATE TABLE bookings (
    id                          VARCHAR(50) PRIMARY KEY, -- 'BK-5001'
    request_id                  VARCHAR(50) UNIQUE REFERENCES requests(id) ON DELETE SET NULL,
    patient_id                  VARCHAR(50) REFERENCES patients(id) ON DELETE SET NULL,
    patient_name                VARCHAR(150) NOT NULL,
    patient_phone               VARCHAR(50),
    caregiver_id                VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE RESTRICT,
    caregiver_name              VARCHAR(150) NOT NULL,
    date                        DATE NOT NULL,
    start_time                  TIME NOT NULL,
    end_time                    TIME NOT NULL,
    duration_mins               INTEGER NOT NULL DEFAULT 60,
    location                    TEXT NOT NULL,
    address                     TEXT,
    latitude                    DOUBLE PRECISION,
    longitude                   DOUBLE PRECISION,
    location_mode               VARCHAR(50) NOT NULL DEFAULT 'address',
    service_type                VARCHAR(150) NOT NULL,
    status                      booking_status_enum NOT NULL DEFAULT 'Caregiver assigned',
    appointment_type            VARCHAR(50) NOT NULL DEFAULT 'Home Visit',
    booking_type                VARCHAR(50) NOT NULL DEFAULT 'One time',
    caregiver_gender_preference VARCHAR(50) NOT NULL DEFAULT 'No preference',
    tasks                       JSONB DEFAULT '[]'::jsonb,
    special_instructions        TEXT DEFAULT '',
    rate_cents                  INTEGER NOT NULL DEFAULT 0,
    caregiver_payout_cents      INTEGER NOT NULL DEFAULT 0,
    invoice_pdf                 TEXT,
    stripe_session_id           VARCHAR(255),
    stripe_checkout_url         TEXT,
    receipt_url                 TEXT,
    payment_method              VARCHAR(50),
    paid_at                     TIMESTAMPTZ,
    cancellation_reason         TEXT,
    cancelled_by                VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    completed_at                TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_history (
    id              SERIAL PRIMARY KEY,
    booking_id      VARCHAR(50) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    action          VARCHAR(100) NOT NULL,
    reason          TEXT,
    from_date       DATE,
    from_start_time TIME,
    to_date         DATE,
    to_start_time   TIME,
    changed_by      VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visit_reports (
    id                  VARCHAR(50) PRIMARY KEY, -- 'REP-5001'
    booking_id          VARCHAR(50) UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    caregiver_id        VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    patient_id          VARCHAR(50) REFERENCES patients(id) ON DELETE SET NULL,
    visit_notes         TEXT NOT NULL,
    tasks_completed     JSONB DEFAULT '[]'::jsonb,
    vitals              JSONB DEFAULT '{}'::jsonb,
    wound_photo_urls    JSONB DEFAULT '[]'::jsonb,
    adherence_rate      INTEGER DEFAULT 100,
    follow_up_needed    BOOLEAN DEFAULT FALSE,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. PAYMENTS & PAYOUTS
CREATE TABLE payments (
    id                      VARCHAR(50) PRIMARY KEY, -- 'PAY-1001'
    booking_id              VARCHAR(50) REFERENCES bookings(id) ON DELETE SET NULL,
    request_id              VARCHAR(50) REFERENCES requests(id) ON DELETE SET NULL,
    patient_name            VARCHAR(150) NOT NULL,
    amount_cents            INTEGER NOT NULL,
    currency                VARCHAR(10) NOT NULL DEFAULT 'myr',
    patient_status          VARCHAR(50) NOT NULL DEFAULT 'Payment link sent', 
    payment_method          VARCHAR(50) DEFAULT 'stripe',
    stripe_session_id       VARCHAR(255),
    stripe_payment_intent   VARCHAR(255),
    receipt_url             TEXT,
    paid_at                 TIMESTAMPTZ,
    verified_by             VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE caregiver_payouts (
    id                      VARCHAR(50) PRIMARY KEY, -- 'PO-1001'
    booking_id              VARCHAR(50) UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_id              VARCHAR(50) REFERENCES payments(id) ON DELETE SET NULL,
    caregiver_id            VARCHAR(50) NOT NULL REFERENCES caregivers(id) ON DELETE RESTRICT,
    amount_cents            INTEGER NOT NULL,
    payout_status           payout_status_enum NOT NULL DEFAULT 'Awaiting payout',
    released_by             VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    released_at             TIMESTAMPTZ,
    bank_reference          VARCHAR(100),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. AUDIT TRAIL & NOTIFICATIONS
CREATE TABLE audit_logs (
    id              VARCHAR(50) PRIMARY KEY, -- 'AUD-000001'
    at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_id        VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    actor_name      VARCHAR(150) NOT NULL DEFAULT 'System',
    actor_email     VARCHAR(255),
    actor_role      VARCHAR(50) NOT NULL DEFAULT 'admin',
    action          VARCHAR(100) NOT NULL,
    record_type     VARCHAR(50) NOT NULL,
    record_id       VARCHAR(100) NOT NULL,
    summary         TEXT NOT NULL,
    changes         JSONB,
    previous_hash   VARCHAR(64),
    hash            VARCHAR(64) NOT NULL,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Prevent audit log tampering
CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit trail is append-only.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_update_or_delete_audit
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();

CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    user_id         VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(50) NOT NULL,
    reference_id    VARCHAR(50),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update timestamps triggers
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sites_updated_at BEFORE UPDATE ON caregiving_sites FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_caregivers_updated_at BEFORE UPDATE ON caregivers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON caregiver_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_requests_updated_at BEFORE UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- SEED DATA WITH CLEAN IDs
-- ============================================================================

-- Sites
INSERT INTO caregiving_sites (id, name, area, latitude, longitude) VALUES
  ('SITE-001', 'Caregiver Center 1', 'Petaling Jaya', 3.1073, 101.6064),
  ('SITE-002', 'Caregiver Center 2', 'Subang Jaya',    3.0568, 101.5852),
  ('SITE-003', 'Caregiver Center 3', 'Cheras',         3.1008, 101.7242);

-- Users: Clean, short IDs
INSERT INTO users (id, email, password_hash, full_name, role) VALUES
  ('USR-0001', 'admin@mycaregivers.com', crypt('AdminPass123!', gen_salt('bf')), 'Admin User', 'admin'),
  ('USR-1001', 'sarah.tan@example.com', crypt('CaregiverPass123!', gen_salt('bf')), 'Sarah Tan', 'caregiver'),
  ('USR-5001', 'john.doe@example.com', crypt('ApplicantPass123!', gen_salt('bf')), 'John Doe', 'caregiver');

-- Application (Applicant)
INSERT INTO caregiver_applications (
  id, user_id, status, step, full_name, email, phone, gender, id_number, preferred_center, shift, travel_mode
) VALUES
  ('APP-5001', 'USR-5001', 'Under review', 3, 'John Doe', 'john.doe@example.com', '+60 12-999 8877', 'Male', '920101-14-5566', 'Petaling Jaya', 'Morning (7am - 3pm)', 'Car');

-- Active Caregivers
INSERT INTO caregivers (
  id, user_id, name, username, email, phone, gender, center_id, center_name, availability, account_status
) VALUES
  ('CG-1001', NULL, 'Adam Tan', 'adam.tan', 'adam.tan@example.com', '+60 12-345 6701', 'Male', 'SITE-001', 'Petaling Jaya', 'Available', 'Active'),
  ('CG-1013', 'USR-1001', 'Sarah Tan', 'sarah.tan', 'sarah.tan@example.com', '+60 12-345 6789', 'Female', 'SITE-001', 'Petaling Jaya', 'Available', 'Active');

-- Skills
INSERT INTO caregiver_skills (caregiver_id, skill) VALUES
  ('CG-1001', 'Elderly care'),
  ('CG-1013', 'Elderly care'),
  ('CG-1013', 'Medication management');

-- Patients
INSERT INTO patients (id, name, gender, phone, preferred_language, center_id, center_name, address) VALUES
  ('PT-1001', 'Nur Aisyah Rahman', 'Female', '+60 12-345 6789', 'Malay', 'SITE-001', 'Petaling Jaya', '24 Jalan Damai, Kuala Lumpur');

-- WhatsApp Chat
INSERT INTO whatsapp_chats (jid, contact_name, contact_phone) VALUES
  ('60123456789@s.whatsapp.net', 'Nur Aisyah Rahman', '+60 12-345 6789');

-- Request
INSERT INTO requests (
  id, source, status, patient_id, whatsapp_chat_jid, patient_name, phone, preferred_language, care_type,
  zone, location, requested_date, preferred_start, preferred_end, service_amount_cents, caregiver_payment_cents
) VALUES
  ('WA-REQ-1001', 'WhatsApp', 'Booked', 'PT-1001', '60123456789@s.whatsapp.net', 'Nur Aisyah Rahman', '+60 12-345 6789', 'Malay',
   'Elderly care', 'Petaling Jaya', '24 Jalan Damai, Kuala Lumpur', CURRENT_DATE, '10:00', '12:00', 12000, 9000);

-- Booking
INSERT INTO bookings (
  id, request_id, patient_id, patient_name, caregiver_id, caregiver_name,
  date, start_time, end_time, duration_mins, location, address,
  service_type, status, rate_cents, caregiver_payout_cents
) VALUES
  ('BK-5001', 'WA-REQ-1001', 'PT-1001', 'Nur Aisyah Rahman', 'CG-1013', 'Sarah Tan',
   CURRENT_DATE, '10:00', '12:00', 120, '24 Jalan Damai, Kuala Lumpur', '24 Jalan Damai, Kuala Lumpur',
   'Elderly care', 'Service completed', 12000, 9000);

-- Visit Report
INSERT INTO visit_reports (id, booking_id, caregiver_id, patient_id, visit_notes) VALUES
  ('REP-5001', 'BK-5001', 'CG-1013', 'PT-1001', 'Patient was well rested. Vitals normal.');

-- Payment
INSERT INTO payments (id, booking_id, request_id, patient_name, amount_cents, patient_status, paid_at) VALUES
  ('PAY-1001', 'BK-5001', 'WA-REQ-1001', 'Nur Aisyah Rahman', 12000, 'Paid', CURRENT_TIMESTAMP);

-- Caregiver Payout
INSERT INTO caregiver_payouts (id, booking_id, payment_id, caregiver_id, amount_cents, payout_status) VALUES
  ('PO-1001', 'BK-5001', 'PAY-1001', 'CG-1013', 9000, 'Ready to pay');

-- Audit Log
INSERT INTO audit_logs (id, actor_name, actor_role, action, record_type, record_id, summary, hash) VALUES
  ('AUD-000001', 'System', 'admin', 'system.initialised', 'Database', 'GLOBAL', 'Database initialized with clean IDs',
   encode(digest('AUD-000001||system.initialised||GENESIS', 'sha256'), 'hex'));
