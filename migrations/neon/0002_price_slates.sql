-- Neon/PostgreSQL migration for admin-authored patient price slates.
-- Apply after 0001_branches.sql. This is additive and does not backfill or
-- modify existing booking prices.

BEGIN;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cost_breakdown JSONB;

CREATE TABLE IF NOT EXISTS booking_price_slates (
  booking_id  VARCHAR(50) PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  items       JSONB NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_slate_templates (
  id         VARCHAR(100) PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  items      JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_slate_templates_name_unique
  ON price_slate_templates (LOWER(name));

COMMIT;
