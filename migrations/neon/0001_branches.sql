-- Neon/PostgreSQL migration: make branches the canonical location table.
-- Run once against a backup of the Neon database. This migration preserves
-- existing SITE-* IDs and caregiver/patient FK values. Existing bookings are
-- intentionally left unchanged; their new branch_id/branch_name stay NULL.
-- For rollback, restore the pre-migration Neon backup before accepting new
-- branch writes. Do not run the destructive full-reset schema.md on live data.

BEGIN;

ALTER TYPE booking_status_enum ADD VALUE IF NOT EXISTS 'No caregiver assigned';

DO $$
BEGIN
  IF to_regclass('public.branches') IS NULL AND to_regclass('public.caregiving_sites') IS NOT NULL THEN
    ALTER TABLE caregiving_sites RENAME TO branches;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'branches' AND column_name = 'area'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'branches' AND column_name = 'service_area'
  ) THEN
    ALTER TABLE branches RENAME COLUMN area TO service_area;
  END IF;
END $$;

ALTER TABLE branches ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS postcode VARCHAR(20);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS operating_hours JSONB NOT NULL DEFAULT '{"open":"07:00","close":"23:00"}'::jsonb;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 350 CHECK (capacity >= 0);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE branches ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS facility_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (facility_fee_cents >= 0);

UPDATE branches SET
  city = COALESCE(city, service_area),
  state = COALESCE(state, CASE id
    WHEN 'SITE-001' THEN 'Selangor'
    WHEN 'SITE-002' THEN 'Selangor'
    WHEN 'SITE-003' THEN 'Kuala Lumpur'
    WHEN 'SITE-004' THEN 'Selangor'
    WHEN 'SITE-005' THEN 'Kuala Lumpur'
    WHEN 'SITE-006' THEN 'Selangor'
    ELSE NULL
  END),
  postcode = COALESCE(postcode, CASE id
    WHEN 'SITE-001' THEN '47400'
    WHEN 'SITE-002' THEN '47620'
    WHEN 'SITE-003' THEN '56100'
    WHEN 'SITE-004' THEN '68000'
    WHEN 'SITE-005' THEN '54200'
    WHEN 'SITE-006' THEN '40000'
    ELSE NULL
  END),
  address = COALESCE(address, CASE id
    WHEN 'SITE-001' THEN '12 Jalan SS 21/1, Damansara Utama, 47400 Petaling Jaya'
    WHEN 'SITE-002' THEN '8 Jalan USJ 10/1, Taipan, 47620 Subang Jaya'
    WHEN 'SITE-003' THEN '22 Jalan Ceria 2, Taman Ceria, 56100 Cheras'
    WHEN 'SITE-004' THEN '5 Jalan Ampang Indah, Taman Ampang Indah, 68000 Ampang'
    WHEN 'SITE-005' THEN '3 Jalan Setiawangsa 11, Taman Setiawangsa, 54200 Kuala Lumpur'
    WHEN 'SITE-006' THEN '15 Jalan SA 2, Seksyen 2, 40000 Shah Alam'
    ELSE NULL
  END),
  facility_fee_cents = CASE id
    WHEN 'SITE-001' THEN GREATEST(facility_fee_cents, 1000)
    WHEN 'SITE-002' THEN GREATEST(facility_fee_cents, 800)
    WHEN 'SITE-003' THEN GREATEST(facility_fee_cents, 800)
    WHEN 'SITE-004' THEN GREATEST(facility_fee_cents, 1000)
    WHEN 'SITE-005' THEN GREATEST(facility_fee_cents, 700)
    WHEN 'SITE-006' THEN GREATEST(facility_fee_cents, 600)
    ELSE facility_fee_cents
  END;

INSERT INTO branches (
  id, name, service_area, address, city, state, postcode, latitude, longitude, facility_fee_cents
) VALUES
  ('SITE-001', 'Caregiver Center 1', 'Petaling Jaya', '12 Jalan SS 21/1, Damansara Utama, 47400 Petaling Jaya', 'Petaling Jaya', 'Selangor', '47400', 3.1073, 101.6064, 1000),
  ('SITE-002', 'Caregiver Center 2', 'Subang Jaya', '8 Jalan USJ 10/1, Taipan, 47620 Subang Jaya', 'Subang Jaya', 'Selangor', '47620', 3.0568, 101.5852, 800),
  ('SITE-003', 'Caregiver Center 3', 'Cheras', '22 Jalan Ceria 2, Taman Ceria, 56100 Cheras', 'Cheras', 'Kuala Lumpur', '56100', 3.1008, 101.7242, 800),
  ('SITE-004', 'Caregiver Center 4', 'Ampang', '5 Jalan Ampang Indah, Taman Ampang Indah, 68000 Ampang', 'Ampang', 'Selangor', '68000', 3.1480, 101.7595, 1000),
  ('SITE-005', 'Caregiver Center 5', 'Setiawangsa', '3 Jalan Setiawangsa 11, Taman Setiawangsa, 54200 Kuala Lumpur', 'Kuala Lumpur', 'Kuala Lumpur', '54200', 3.1905, 101.7380, 700),
  ('SITE-006', 'Caregiver Center 6', 'Shah Alam', '15 Jalan SA 2, Seksyen 2, 40000 Shah Alam', 'Shah Alam', 'Selangor', '40000', 3.0733, 101.5185, 600)
ON CONFLICT (id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_name_unique ON branches (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_branches_service_area ON branches (service_area);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches (status);

ALTER TABLE caregivers DROP CONSTRAINT IF EXISTS caregivers_center_id_fkey;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'caregivers' AND column_name = 'center_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'caregivers' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE caregivers RENAME COLUMN center_id TO branch_id;
  END IF;
END $$;
ALTER TABLE caregivers ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE caregivers ADD CONSTRAINT caregivers_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_caregivers_branch ON caregivers (branch_id);

ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_center_id_fkey;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'center_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'patients' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE patients RENAME COLUMN center_id TO branch_id;
  END IF;
END $$;
ALTER TABLE patients ADD CONSTRAINT patients_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

ALTER TABLE requests ADD COLUMN IF NOT EXISTS branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id VARCHAR(50) REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_name VARCHAR(150);
CREATE INDEX IF NOT EXISTS idx_requests_branch ON requests (branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_branch ON bookings (branch_id);

DROP TRIGGER IF EXISTS trg_sites_updated_at ON branches;
DROP TRIGGER IF EXISTS trg_branches_updated_at ON branches;
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
