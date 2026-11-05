import { makeBranchAudit } from '../../../_shared/branchUtils.js';
import { calculatePriceSlate, priceSlateResponse } from '../../../_shared/priceSlateUtils.js';

function errorResponse(message, status, fields) {
  return Response.json({ ok: false, error: message, ...(fields ? { fields } : {}) }, { status });
}

async function getBooking(db, id) {
  return db.prepare(
    `SELECT b.id, b.rate_cents, b.duration_mins, b.branch_id,
            COALESCE(br.facility_fee_cents, 0) AS branch_facility_fee_cents
     FROM bookings b LEFT JOIN branches br ON br.id = b.branch_id
     WHERE b.id = ?`
  ).bind(id).first();
}

async function getSlate(db, id) {
  return db.prepare(
    `SELECT booking_id, items, total_cents, created_at, updated_at
     FROM booking_price_slates WHERE booking_id = ?`
  ).bind(id).first();
}

async function makeAudit(db, bookingId, before, after) {
  const previous = await db.prepare('SELECT hash FROM audit_logs ORDER BY at DESC, id DESC LIMIT 1').first();
  return makeBranchAudit({
    action: 'booking.price_slate.saved',
    recordId: bookingId,
    summary: `Saved patient price slate for booking ${bookingId}`,
    changes: [{ field: 'price_slate', before, after }],
    previousHash: previous?.hash || null,
  });
}

function auditStatement(db, audit) {
  return db.prepare(
    `INSERT INTO audit_logs
       (id, at, actor_name, actor_role, action, record_type, record_id, summary, changes, previous_hash, hash)
     VALUES (?, ?, 'System', 'system', ?, 'Booking Price Slate', ?, ?, ?, ?, ?)`
  ).bind(
    audit.id, audit.at, audit.action, audit.recordId, audit.summary,
    JSON.stringify(audit.changes), audit.previousHash, audit.hash
  );
}

export async function onRequestGet({ env, params }) {
  try {
    const booking = await getBooking(env.DB, params.id);
    if (!booking) return errorResponse('Booking not found.', 404);
    const row = await getSlate(env.DB, params.id);
    return Response.json({ ok: true, slate: row ? priceSlateResponse(row) : null });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

export async function onRequestPut({ request, env, params }) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Request body must be valid JSON.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.items)) {
    return errorResponse('items must be an array.', 400, { items: 'Items must be an array.' });
  }

  const db = env.DB;
  try {
    const booking = await getBooking(db, params.id);
    if (!booking) return errorResponse('Booking not found.', 404);

    const result = calculatePriceSlate(body.items, booking);
    if (!result.ok) return errorResponse(result.error, 400, result.fields);

    const previousRow = await getSlate(db, params.id);
    const before = previousRow ? priceSlateResponse(previousRow) : null;
    const after = {
      booking_id: params.id,
      items: result.items,
      total_cents: result.total_cents,
      total: result.total,
    };
    const audit = await makeAudit(db, params.id, before, after);
    const snapshot = JSON.stringify({
      version: 'slate-v1',
      total: result.total,
      total_cents: result.total_cents,
      items: result.items,
    });

    await db.batch([
      db.prepare(
        `INSERT INTO booking_price_slates (booking_id, items, total_cents)
         VALUES (?, ?, ?)
         ON CONFLICT(booking_id) DO UPDATE SET
           items = excluded.items,
           total_cents = excluded.total_cents,
           updated_at = datetime('now')`
      ).bind(params.id, JSON.stringify(result.items), result.total_cents),
      db.prepare(`UPDATE bookings SET cost_breakdown = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snapshot, params.id),
      auditStatement(db, audit),
    ]);

    const saved = await getSlate(db, params.id);
    return Response.json({ ok: true, slate: priceSlateResponse(saved) });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
