import { makeBranchAudit } from '../functions/_shared/branchUtils.js';
import {
  calculatePriceSlate, normalizePriceTemplateItems, parsePriceSlateItems, priceSlateResponse,
} from '../functions/_shared/priceSlateUtils.js';

const fail = (sendJson, res, message, status, fields) => sendJson(res, status, {
  ok: false, error: message, ...(fields ? { fields } : {}),
});

async function getBooking(database, id, pg) {
  const sql = `SELECT b.id, b.rate_cents, b.duration_mins, b.branch_id,
                      COALESCE(br.facility_fee_cents, 0) AS branch_facility_fee_cents
               FROM bookings b LEFT JOIN branches br ON br.id = b.branch_id
               WHERE b.id = ${pg ? '$1' : '?'}`;
  if (pg) return (await database.query(sql, [id])).rows[0] || null;
  return database.prepare(sql).get(id) || null;
}

async function getSlate(database, id, pg) {
  const sql = `SELECT booking_id, items, total_cents, created_at, updated_at
               FROM booking_price_slates WHERE booking_id = ${pg ? '$1' : '?'}`;
  if (pg) return (await database.query(sql, [id])).rows[0] || null;
  return database.prepare(sql).get(id) || null;
}

async function getPreviousHash(database, pg) {
  if (pg) return (await database.query('SELECT hash FROM audit_logs ORDER BY at DESC, id DESC LIMIT 1')).rows[0]?.hash || null;
  return database.prepare('SELECT hash FROM audit_logs ORDER BY at DESC, id DESC LIMIT 1').get()?.hash || null;
}

async function createAudit(database, pg, event) {
  const previousHash = await getPreviousHash(database, pg);
  return makeBranchAudit({ ...event, previousHash });
}

async function insertAudit(database, pg, audit, recordType) {
  if (pg) {
    await database.query(
      `INSERT INTO audit_logs
         (id, at, actor_name, actor_role, action, record_type, record_id, summary, changes, previous_hash, hash)
       VALUES ($1, $2, 'System', 'system', $3, $4, $5, $6, $7::jsonb, $8, $9)`,
      [audit.id, audit.at, audit.action, recordType, audit.recordId, audit.summary,
        JSON.stringify(audit.changes), audit.previousHash, audit.hash]
    );
    return;
  }
  database.prepare(
    `INSERT INTO audit_logs
       (id, at, actor_name, actor_role, action, record_type, record_id, summary, changes, previous_hash, hash)
     VALUES (?, ?, 'System', 'system', ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    audit.id, audit.at, audit.action, recordType, audit.recordId, audit.summary,
    JSON.stringify(audit.changes), audit.previousHash, audit.hash
  );
}

function templateResponse(row) {
  return {
    id: row.id,
    name: row.name,
    items: parsePriceSlateItems(row.items),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function handleSlate(req, res, segments, services) {
  const { getDb, hasPgConfig, getPool, readJsonBody, sendJson } = services;
  const bookingId = segments[0];
  const pg = hasPgConfig();

  if (req.method !== 'GET' && req.method !== 'PUT') return false;
  try {
    if (req.method === 'GET') {
      const database = pg ? getPool() : await getDb();
      const booking = await getBooking(database, bookingId, pg);
      if (!booking) return fail(sendJson, res, 'Booking not found.', 404);
      const row = await getSlate(database, bookingId, pg);
      return sendJson(res, 200, { ok: true, slate: row ? priceSlateResponse(row) : null });
    }

    let body;
    try { body = await readJsonBody(req); }
    catch (err) { return fail(sendJson, res, err.message, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.items)) {
      return fail(sendJson, res, 'items must be an array.', 400, { items: 'Items must be an array.' });
    }

    if (pg) {
      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        const booking = await getBooking(client, bookingId, true);
        if (!booking) {
          await client.query('ROLLBACK');
          return fail(sendJson, res, 'Booking not found.', 404);
        }
        const calculation = calculatePriceSlate(body.items, booking);
        if (!calculation.ok) {
          await client.query('ROLLBACK');
          return fail(sendJson, res, calculation.error, 400, calculation.fields);
        }

        const previous = await getSlate(client, bookingId, true);
        const before = previous ? priceSlateResponse(previous) : null;
        const after = {
          booking_id: bookingId, items: calculation.items,
          total_cents: calculation.total_cents, total: calculation.total,
        };
        const audit = await createAudit(client, true, {
          action: 'booking.price_slate.saved', recordId: bookingId,
          summary: `Saved patient price slate for booking ${bookingId}`,
          changes: [{ field: 'price_slate', before, after }],
        });
        const snapshot = JSON.stringify({
          version: 'slate-v1', total: calculation.total,
          total_cents: calculation.total_cents, items: calculation.items,
        });

        await client.query(
          `INSERT INTO booking_price_slates (booking_id, items, total_cents)
           VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (booking_id) DO UPDATE SET
             items = EXCLUDED.items, total_cents = EXCLUDED.total_cents, updated_at = NOW()`,
          [bookingId, JSON.stringify(calculation.items), calculation.total_cents]
        );
        await client.query('UPDATE bookings SET cost_breakdown = $1::jsonb, updated_at = NOW() WHERE id = $2', [snapshot, bookingId]);
        await insertAudit(client, true, audit, 'Booking Price Slate');
        await client.query('COMMIT');
        const saved = await getSlate(client, bookingId, true);
        return sendJson(res, 200, { ok: true, slate: priceSlateResponse(saved) });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const database = await getDb();
    database.exec('BEGIN IMMEDIATE');
    try {
      const booking = await getBooking(database, bookingId, false);
      if (!booking) {
        database.exec('ROLLBACK');
        return fail(sendJson, res, 'Booking not found.', 404);
      }
      const calculation = calculatePriceSlate(body.items, booking);
      if (!calculation.ok) {
        database.exec('ROLLBACK');
        return fail(sendJson, res, calculation.error, 400, calculation.fields);
      }
      const previous = await getSlate(database, bookingId, false);
      const before = previous ? priceSlateResponse(previous) : null;
      const after = {
        booking_id: bookingId, items: calculation.items,
        total_cents: calculation.total_cents, total: calculation.total,
      };
      const audit = await createAudit(database, false, {
        action: 'booking.price_slate.saved', recordId: bookingId,
        summary: `Saved patient price slate for booking ${bookingId}`,
        changes: [{ field: 'price_slate', before, after }],
      });
      const snapshot = JSON.stringify({
        version: 'slate-v1', total: calculation.total,
        total_cents: calculation.total_cents, items: calculation.items,
      });

      database.prepare(
        `INSERT INTO booking_price_slates (booking_id, items, total_cents)
         VALUES (?, ?, ?)
         ON CONFLICT(booking_id) DO UPDATE SET
           items = excluded.items, total_cents = excluded.total_cents, updated_at = datetime('now')`
      ).run(bookingId, JSON.stringify(calculation.items), calculation.total_cents);
      database.prepare(`UPDATE bookings SET cost_breakdown = ?, updated_at = datetime('now') WHERE id = ?`).run(snapshot, bookingId);
      await insertAudit(database, false, audit, 'Booking Price Slate');
      database.exec('COMMIT');
      const saved = await getSlate(database, bookingId, false);
      return sendJson(res, 200, { ok: true, slate: priceSlateResponse(saved) });
    } catch (err) {
      database.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('[price slate]', err);
    return fail(sendJson, res, err.message, 500);
  }
}

async function handleTemplates(req, res, segments, services) {
  const { getDb, hasPgConfig, getPool, readJsonBody, sendJson } = services;
  const pg = hasPgConfig();
  const database = pg ? getPool() : await getDb();

  if (segments.length === 0 && req.method === 'GET') {
    try {
      const rows = pg
        ? (await database.query('SELECT id, name, items, created_at, updated_at FROM price_slate_templates ORDER BY LOWER(name)')).rows
        : database.prepare('SELECT id, name, items, created_at, updated_at FROM price_slate_templates ORDER BY name COLLATE NOCASE').all();
      return sendJson(res, 200, rows.map(templateResponse));
    } catch (err) {
      return fail(sendJson, res, err.message, 500);
    }
  }

  if (segments.length === 0 && req.method === 'POST') {
    let body;
    try { body = await readJsonBody(req); }
    catch (err) { return fail(sendJson, res, err.message, 400); }
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const fields = {};
    if (!name) fields.name = 'Template name is required.';
    else if (name.length > 120) fields.name = 'Template name must be 120 characters or fewer.';
    const normalized = normalizePriceTemplateItems(body?.items);
    if (!normalized.ok) Object.assign(fields, normalized.fields);
    if (Object.keys(fields).length) return fail(sendJson, res, 'Validation failed.', 400, fields);

    const id = `PST-${crypto.randomUUID()}`;
    const template = { id, name, items: normalized.items };
    try {
      if (pg) {
        const client = await getPool().connect();
        try {
          await client.query('BEGIN');
          const exists = await client.query('SELECT id FROM price_slate_templates WHERE LOWER(name) = LOWER($1)', [name]);
          if (exists.rows.length) {
            await client.query('ROLLBACK');
            return fail(sendJson, res, 'A template with this name already exists.', 409, { name: 'Template name must be unique.' });
          }
          const audit = await createAudit(client, true, {
            action: 'price_template.created', recordId: id, summary: `Created price template ${name}`,
            changes: [{ field: 'template', before: null, after: template }],
          });
          await client.query('INSERT INTO price_slate_templates (id, name, items) VALUES ($1, $2, $3::jsonb)', [id, name, JSON.stringify(normalized.items)]);
          await insertAudit(client, true, audit, 'Price Slate Template');
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          if (/unique/i.test(err.message)) return fail(sendJson, res, 'A template with this name already exists.', 409, { name: 'Template name must be unique.' });
          throw err;
        } finally { client.release(); }
      } else {
        const exists = database.prepare('SELECT id FROM price_slate_templates WHERE LOWER(name) = LOWER(?)').get(name);
        if (exists) return fail(sendJson, res, 'A template with this name already exists.', 409, { name: 'Template name must be unique.' });
        database.exec('BEGIN IMMEDIATE');
        try {
          const audit = await createAudit(database, false, {
            action: 'price_template.created', recordId: id, summary: `Created price template ${name}`,
            changes: [{ field: 'template', before: null, after: template }],
          });
          database.prepare('INSERT INTO price_slate_templates (id, name, items) VALUES (?, ?, ?)').run(id, name, JSON.stringify(normalized.items));
          await insertAudit(database, false, audit, 'Price Slate Template');
          database.exec('COMMIT');
        } catch (err) {
          database.exec('ROLLBACK');
          if (/unique/i.test(err.message)) return fail(sendJson, res, 'A template with this name already exists.', 409, { name: 'Template name must be unique.' });
          throw err;
        }
      }
      return sendJson(res, 201, { ok: true, template });
    } catch (err) {
      return fail(sendJson, res, err.message, 500);
    }
  }

  if (segments.length === 1 && req.method === 'DELETE') {
    const id = segments[0];
    try {
      if (pg) {
        const client = await getPool().connect();
        try {
          await client.query('BEGIN');
          const result = await client.query('SELECT id, name, items, created_at, updated_at FROM price_slate_templates WHERE id = $1 FOR UPDATE', [id]);
          const before = result.rows[0];
          if (!before) {
            await client.query('ROLLBACK');
            return fail(sendJson, res, 'Price template not found.', 404);
          }
          const audit = await createAudit(client, true, {
            action: 'price_template.deleted', recordId: id, summary: `Deleted price template ${before.name}`,
            changes: [{ field: 'template', before: templateResponse(before), after: null }],
          });
          await client.query('DELETE FROM price_slate_templates WHERE id = $1', [id]);
          await insertAudit(client, true, audit, 'Price Slate Template');
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally { client.release(); }
      } else {
        database.exec('BEGIN IMMEDIATE');
        try {
          const before = database.prepare('SELECT id, name, items, created_at, updated_at FROM price_slate_templates WHERE id = ?').get(id);
          if (!before) {
            database.exec('ROLLBACK');
            return fail(sendJson, res, 'Price template not found.', 404);
          }
          const audit = await createAudit(database, false, {
            action: 'price_template.deleted', recordId: id, summary: `Deleted price template ${before.name}`,
            changes: [{ field: 'template', before: templateResponse(before), after: null }],
          });
          database.prepare('DELETE FROM price_slate_templates WHERE id = ?').run(id);
          await insertAudit(database, false, audit, 'Price Slate Template');
          database.exec('COMMIT');
        } catch (err) {
          database.exec('ROLLBACK');
          throw err;
        }
      }
      return sendJson(res, 200, { ok: true, id });
    } catch (err) {
      return fail(sendJson, res, err.message, 500);
    }
  }
  return false;
}

export function registerPriceSlateApi(server, services) {
  server.middlewares.use('/api/bookings', async (req, res, next) => {
    const [pathname] = req.url.split('?');
    const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (segments.length === 2 && segments[1] === 'price-slate') {
      return handleSlate(req, res, segments, services);
    }
    return next();
  });

  server.middlewares.use('/api/price-templates', async (req, res, next) => {
    const [pathname] = req.url.split('?');
    const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const handled = await handleTemplates(req, res, segments, services);
    if (handled === false) return next();
    return handled;
  });
}
