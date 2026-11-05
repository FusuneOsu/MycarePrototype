-- Admin-authored patient pricing slates. Existing bookings remain without a
-- slate until an admin creates one; their current rate and payment history
-- are not backfilled or changed.

CREATE TABLE IF NOT EXISTS booking_price_slates (
  booking_id  TEXT PRIMARY KEY REFERENCES bookings (id) ON DELETE CASCADE,
  items       TEXT NOT NULL CHECK (json_valid(items)),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_slate_templates (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  items      TEXT NOT NULL CHECK (json_valid(items)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_slate_templates_name_unique
  ON price_slate_templates (name COLLATE NOCASE);
