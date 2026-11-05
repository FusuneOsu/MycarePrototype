-- Branches module migration for existing SQLite/D1 databases.
-- Existing booking rows are intentionally not backfilled; branch_id and
-- branch_name remain NULL for bookings that predate this migration.

ALTER TABLE caregiving_sites RENAME TO branches;
ALTER TABLE branches RENAME COLUMN area TO service_area;

ALTER TABLE branches ADD COLUMN city TEXT NOT NULL DEFAULT '';
ALTER TABLE branches ADD COLUMN state TEXT NOT NULL DEFAULT '';
ALTER TABLE branches ADD COLUMN postcode TEXT NOT NULL DEFAULT '';
ALTER TABLE branches ADD COLUMN email TEXT;
ALTER TABLE branches ADD COLUMN capacity INTEGER NOT NULL DEFAULT 350 CHECK (capacity >= 0);
ALTER TABLE branches ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE branches ADD COLUMN notes TEXT;
ALTER TABLE branches ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE branches ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE branches ADD COLUMN facility_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (facility_fee_cents >= 0);
ALTER TABLE branches ADD COLUMN updated_at TEXT;

UPDATE branches SET city = service_area;
UPDATE branches SET state = CASE id
  WHEN 'SITE-001' THEN 'Selangor'
  WHEN 'SITE-002' THEN 'Selangor'
  WHEN 'SITE-003' THEN 'Kuala Lumpur'
  WHEN 'SITE-004' THEN 'Selangor'
  WHEN 'SITE-005' THEN 'Kuala Lumpur'
  WHEN 'SITE-006' THEN 'Selangor'
  ELSE state
END;
UPDATE branches SET postcode = CASE id
  WHEN 'SITE-001' THEN '47400'
  WHEN 'SITE-002' THEN '47620'
  WHEN 'SITE-003' THEN '56100'
  WHEN 'SITE-004' THEN '68000'
  WHEN 'SITE-005' THEN '54200'
  WHEN 'SITE-006' THEN '40000'
  ELSE postcode
END;
UPDATE branches SET address = CASE id
  WHEN 'SITE-001' THEN COALESCE(address, '12 Jalan SS 21/1, Damansara Utama, 47400 Petaling Jaya')
  WHEN 'SITE-002' THEN COALESCE(address, '8 Jalan USJ 10/1, Taipan, 47620 Subang Jaya')
  WHEN 'SITE-003' THEN COALESCE(address, '22 Jalan Ceria 2, Taman Ceria, 56100 Cheras')
  WHEN 'SITE-004' THEN COALESCE(address, '5 Jalan Ampang Indah, Taman Ampang Indah, 68000 Ampang')
  WHEN 'SITE-005' THEN COALESCE(address, '3 Jalan Setiawangsa 11, Taman Setiawangsa, 54200 Kuala Lumpur')
  WHEN 'SITE-006' THEN COALESCE(address, '15 Jalan SA 2, Seksyen 2, 40000 Shah Alam')
  ELSE address
END;
UPDATE branches SET operating_hours = '{"open":"07:00","close":"23:00"}'
WHERE operating_hours IS NULL OR operating_hours = '';
UPDATE branches SET updated_at = datetime('now') WHERE updated_at IS NULL;
UPDATE branches SET facility_fee_cents = facility_fee * 100
WHERE facility_fee_cents = 0 AND facility_fee > 0;
UPDATE branches SET phone = NULL WHERE phone LIKE '%X%';

INSERT INTO branches (
  id, name, address, city, state, postcode, service_area, latitude, longitude, facility_fee_cents
) VALUES
  ('SITE-001', 'Caregiver Center 1', '12 Jalan SS 21/1, Damansara Utama, 47400 Petaling Jaya', 'Petaling Jaya', 'Selangor', '47400', 'Petaling Jaya', 3.1073, 101.6064, 1000),
  ('SITE-002', 'Caregiver Center 2', '8 Jalan USJ 10/1, Taipan, 47620 Subang Jaya', 'Subang Jaya', 'Selangor', '47620', 'Subang Jaya', 3.0568, 101.5852, 800),
  ('SITE-003', 'Caregiver Center 3', '22 Jalan Ceria 2, Taman Ceria, 56100 Cheras', 'Cheras', 'Kuala Lumpur', '56100', 'Cheras', 3.1008, 101.7242, 800),
  ('SITE-004', 'Caregiver Center 4', '5 Jalan Ampang Indah, Taman Ampang Indah, 68000 Ampang', 'Ampang', 'Selangor', '68000', 'Ampang', 3.1480, 101.7595, 1000),
  ('SITE-005', 'Caregiver Center 5', '3 Jalan Setiawangsa 11, Taman Setiawangsa, 54200 Kuala Lumpur', 'Kuala Lumpur', 'Kuala Lumpur', '54200', 'Setiawangsa', 3.1905, 101.7380, 700),
  ('SITE-006', 'Caregiver Center 6', '15 Jalan SA 2, Seksyen 2, 40000 Shah Alam', 'Shah Alam', 'Selangor', '40000', 'Shah Alam', 3.0733, 101.5185, 600)
ON CONFLICT(id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_name_unique ON branches (name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_branches_service_area ON branches (service_area);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches (status);

ALTER TABLE caregivers ADD COLUMN branch_id TEXT REFERENCES branches (id) ON DELETE SET NULL;
UPDATE caregivers
SET branch_id = COALESCE(
  base_site_id,
  (SELECT id FROM branches WHERE service_area = caregivers.center COLLATE NOCASE LIMIT 1)
)
WHERE branch_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_caregivers_branch ON caregivers (branch_id);

ALTER TABLE requests ADD COLUMN branch_id TEXT REFERENCES branches (id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN branch_id TEXT REFERENCES branches (id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN branch_name TEXT;
CREATE INDEX IF NOT EXISTS idx_requests_branch ON requests (branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_branch ON bookings (branch_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id              TEXT PRIMARY KEY,
  at              TEXT NOT NULL DEFAULT (datetime('now')),
  actor_id        TEXT,
  actor_name      TEXT NOT NULL DEFAULT 'System',
  actor_email     TEXT,
  actor_role      TEXT NOT NULL DEFAULT 'system',
  action          TEXT NOT NULL,
  record_type     TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  summary         TEXT NOT NULL,
  changes         TEXT,
  previous_hash   TEXT,
  hash            TEXT NOT NULL,
  ip_address      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS trg_no_update_or_delete_audit
BEFORE UPDATE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Audit trail is append-only.');
END;

CREATE TRIGGER IF NOT EXISTS trg_no_delete_audit
BEFORE DELETE ON audit_logs
BEGIN
  SELECT RAISE(ABORT, 'Audit trail is append-only.');
END;
