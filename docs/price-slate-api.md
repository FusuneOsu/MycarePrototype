# Session 1 of 2: Patient Price Slate API

Backend and storage handoff for the admin-authored patient price calculation. This is separate from caregiver payout calculations. The frontend is a later session.

## Data and calculations

- One `booking_price_slates` row per booking, containing ordered JSON line items and the final integer `total_cents`.
- `price_slate_templates` stores named, reusable item layouts/formulas. Applying a template copies its items into a booking slate; the booking-specific formulas are recalculated on save.
- Each line item is `{ "id", "label", "note", "expression" }`. On a saved slate, the server also returns its calculated `amount_cents` and `amount`.
- Each expression is evaluated by a small allowlisted arithmetic parser. It supports decimal numbers, parentheses, unary `+`/`-`, and `+`, `-`, `*`, `/`. It does not use JavaScript `eval` and rejects functions, property access, unknown names, non-finite results, and division by zero.
- Supported variables: `rate` (RM per hour), `duration_mins`, `duration_hrs`, `branch_facility_fee` (RM), and `subtotal` (sum of prior rows, in RM). Row results round to the nearest sen; negative rows are allowed for discounts, but the final total cannot be negative.
- Maximum 100 rows; labels up to 120 characters; notes up to 500; expressions up to 256 characters.

When a slate is saved, its total and line items are also snapshotted in `bookings.cost_breakdown` as:

```json
{
  "version": "slate-v1",
  "total": 92,
  "total_cents": 9200,
  "items": [
    { "id": "service", "label": "Service", "note": "Two hours", "expression": "rate * duration_hrs", "amount_cents": 8000, "amount": 80 }
  ]
}
```

The snapshot preserves compatibility with dashboard revenue aggregation. Stripe Checkout uses `booking_price_slates.total_cents` when present and keeps `rate_cents` as the fallback for bookings without a slate. No existing booking is backfilled or repriced.

## Endpoints

### `GET /api/bookings/:id/price-slate`

Returns `{ "ok": true, "slate": null }` if the booking exists but has no slate; returns 404 for a missing booking.

```json
{
  "ok": true,
  "slate": {
    "booking_id": "BK-5001",
    "items": [
      { "id": "service", "label": "Service", "note": "", "expression": "rate * duration_hrs", "amount_cents": 8000, "amount": 80 }
    ],
    "total_cents": 8000,
    "total": 80,
    "created_at": "2026-11-05 10:00:00",
    "updated_at": "2026-11-05 10:00:00"
  }
}
```

### `PUT /api/bookings/:id/price-slate`

Replaces the booking's current rows, recalculates every formula server-side, stores the slate and booking snapshot, and appends an audit record. The request's `amount` fields, if any, are ignored; only `expression` is authoritative.

```json
{
  "items": [
    { "id": "service", "label": "Service", "note": "Two hours", "expression": "rate * duration_hrs" },
    { "id": "facility", "label": "Facility fee", "note": "", "expression": "branch_facility_fee" },
    { "id": "admin", "label": "Admin fee", "note": "", "expression": "subtotal * 0.05" }
  ]
}
```

Returns `{ "ok": true, "slate": { ... } }`. Validation errors return `400` and identify rows by index:

```json
{
  "ok": false,
  "error": "One or more formulas could not be calculated.",
  "fields": { "items.2.expression": "Cannot divide by zero." }
}
```

### `GET /api/price-templates`

Returns a name-sorted array of `{ id, name, items, created_at, updated_at }`.

### `POST /api/price-templates`

Creates a reusable template. Template formulas are syntax-validated and evaluated only when applied to a booking.

```json
{
  "name": "Standard care center visit",
  "items": [
    { "label": "Service", "note": "", "expression": "rate * duration_hrs" },
    { "label": "Facility fee", "note": "", "expression": "branch_facility_fee" }
  ]
}
```

Returns `201 { "ok": true, "template": { ... } }`. Template names are unique case-insensitively; duplicates return `409`.

### `DELETE /api/price-templates/:id`

Deletes a template and returns `{ "ok": true, "id": "PST-..." }`. It does not delete slates previously created from that template.

Copying another booking's slate uses its GET endpoint; no special copy endpoint is needed.

## Audit trail

Every price-slate save and template create/delete appends a hash-chained record to `audit_logs`, with before/after content for edits. The existing prototype API records the actor as `System`, consistent with the Branches API; administrator authentication/identity attribution is not yet implemented.

## Database migration handoff

- D1/SQLite fresh schema: `adminPage/db/schema.sql`. Existing D1/SQLite database migration: `adminPage/db/migrations/0002_price_slates.sql`.
- Apply the D1 migration locally with `npm run admin:db:migrate:price-slates:local`; remote command is `npm run admin:db:migrate:price-slates:remote` and should only be run when approved.
- Existing local SQLite dev databases apply `0002_price_slates.sql` automatically on next startup.
- Neon/Postgres: apply `migrations/neon/0002_price_slates.sql` after `0001_branches.sql` and after taking a backup. The migration adds `bookings.cost_breakdown JSONB` plus both tables. No SQL was added to `schema.md`, which is maintained by the teammate.
- Existing rows keep their old `rate_cents` and have no slate until an admin saves one.
- `npm run test:price-slates` checks the formula evaluator and both fresh SQLite schema and additive migration.
