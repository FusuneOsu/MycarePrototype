import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { hasPgConfig, query as pgQuery, testConnection, verifyUserLogin } from './scripts/db.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const appPage = process.env.VITE_APP_PAGE || 'admin';
const isAdmin = appPage === 'admin';

const basePath = isAdmin ? '/' : '/caregiver/';
const outDir = isAdmin ? 'dist' : 'dist/caregiver';
const rootDir = isAdmin ? resolve(__dirname, 'adminPage') : resolve(__dirname, 'caregiverPage');

function localApiPlugin() {
  const dbDir = resolve(__dirname, 'adminPage/db');
  const dbPath = resolve(dbDir, 'local.sqlite3');
  let db;

  async function getDb() {
    if (db) return db;
    const { DatabaseSync } = await import('node:sqlite');
    if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });
    db = new DatabaseSync(dbPath);
    const hasBookings = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'bookings'")
      .get();
    if (!hasBookings) {
      // Fresh database — run the full schema + seed.
      db.exec(readFileSync(resolve(dbDir, 'schema.sql'), 'utf8'));
      db.exec(readFileSync(resolve(dbDir, 'seed.sql'), 'utf8'));
    }
    return db;
  }

  // Reads and JSON-parses a request body. Vite's dev middleware sits in
  // front of Node's raw http server, so unlike wrangler/workerd there's no
  // request.json() — the body has to be collected from the stream by hand.
  function readJsonBody(req) {
    return new Promise((resolvePromise, rejectPromise) => {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', () => {
        if (!raw) return resolvePromise({});
        try {
          resolvePromise(JSON.parse(raw));
        } catch {
          rejectPromise(new Error('Request body must be valid JSON.'));
        }
      });
      req.on('error', rejectPromise);
    });
  }

  function sendJson(res, status, payload) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  }

  return {
    name: 'mycare-local-api',
    configureServer(server) {
      // ---- Database Health / Connection Test Endpoint ----
      server.middlewares.use('/api/db/test', async (req, res) => {
        if (req.method === 'GET') {
          const result = await testConnection();
          return sendJson(res, result.ok ? 200 : 500, result);
        }
        res.statusCode = 405;
        res.end();
      });

      // ---- User Login & Credential Verification Endpoint ----
      server.middlewares.use('/api/auth/login', async (req, res) => {
        if (req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            const { email, password } = body;
            if (!email || !password) {
              return sendJson(res, 400, { ok: false, error: 'Email and password are required.' });
            }

            if (hasPgConfig()) {
              const result = await verifyUserLogin(email, password);
              return sendJson(res, result.ok ? 200 : 401, result);
            }

            // Fallback demo credentials
            if (email.toLowerCase() === 'admin@mycaregivers.com' && (password === 'admin123' || password === 'AdminPass123!')) {
              return sendJson(res, 200, { ok: true, user: { id: 'USR-0001', email, full_name: 'Admin User', role: 'admin' } });
            }
            if (email.toLowerCase() === 'sarah.tan@example.com' && (password === 'password123' || password === 'CaregiverPass123!')) {
              return sendJson(res, 200, { ok: true, user: { id: 'USR-1001', email, full_name: 'Sarah Tan', role: 'caregiver' } });
            }

            return sendJson(res, 401, { ok: false, error: 'Invalid email or password.' });
          } catch (err) {
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }
        res.statusCode = 405;
        res.end();
      });

      server.middlewares.use('/api/bookings', async (req, res) => {
        // req.url here is already relative to the '/api/bookings' mount point,
        // e.g. '/', '/BK-5001/pay-link', '/BK-5001/collect'.
        const [pathname] = req.url.split('?');
        const segments = pathname.split('/').filter(Boolean); // '' | ['BK-5001','pay-link'] | ['BK-5001','collect']

        // GET /api/bookings — list endpoint with PostgreSQL support
        if (segments.length === 0 && req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                `SELECT b.id, b.patient_name, b.date, b.start_time, b.end_time, b.duration_mins, b.location, b.address, b.latitude, b.longitude,
                        b.service_type, b.status, b.rate_cents, b.appointment_type, b.booking_type,
                        b.caregiver_gender_preference, b.location_mode, b.tasks, b.special_instructions,
                        b.caregiver_id, b.caregiver_name
                 FROM bookings b
                 ORDER BY b.date DESC, b.start_time DESC`
              );
              return sendJson(res, 200, pgRes.rows);
            }

            const database = await getDb();
            const rows = database
              .prepare(
                `SELECT b.id, b.patient_name, b.date, b.start_time, b.end_time, b.duration_mins, b.location, b.address, b.latitude, b.longitude,
                        b.service_type, b.status, b.rate_cents, b.cost_breakdown, b.appointment_type, b.booking_type,
                        b.caregiver_gender_preference, b.location_mode, b.tasks, b.special_instructions,
                        b.caregiver_id, c.name AS caregiver_name
                 FROM bookings b
                 JOIN caregivers c ON c.id = b.caregiver_id
                 ORDER BY b.date DESC, b.start_time DESC`
              )
              .all();
            return sendJson(res, 200, rows);
          } catch (err) {
            console.error('[bookings GET]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // POST /api/bookings — create a booking (confirm a request)
        if (segments.length === 0 && req.method === 'POST') {
          try {
            let body;
            try { body = await readJsonBody(req); }
            catch (err) { return sendJson(res, 400, { ok: false, error: err.message }); }

            const {
              request_id, caregiver_id, patient_name, date, start_time, end_time,
              duration_mins, location, address, latitude, longitude, service_type, status,
              appointment_type, booking_type, caregiver_gender_preference,
              location_mode, tasks, special_instructions,
              rate_cents, service_amount_cents, caregiver_payment_cents,
            } = body;

            if (!patient_name || !date || !start_time || !end_time) {
              return sendJson(res, 400, {
                ok: false,
                error: 'patient_name, date, start_time, and end_time are required.',
              });
            }

            if (hasPgConfig()) {
              const maxRow = await pgQuery("SELECT id FROM bookings ORDER BY id DESC LIMIT 1");
              const lastNum = maxRow.rows.length > 0 ? parseInt(maxRow.rows[0].id.replace(/\D/g, ''), 10) : 5000;
              const newId = `BK-${String(lastNum + 1)}`;

              let caregiver_name = body.caregiver_name || null;
              if (caregiver_id && !caregiver_name) {
                const cg = await pgQuery("SELECT name FROM caregivers WHERE id = $1", [caregiver_id]);
                if (cg.rows.length > 0) caregiver_name = cg.rows[0].name;
              }

              const validStatus = [
                'Caregiver assigned', 'In progress', 'Service completed',
                'Payment pending', 'Link sent (Unpaid)', 'Paid - Online',
                'Paid - Collected Directly', 'Paid', 'Cancelled', 'Missed'
              ].includes(status) ? status : 'Caregiver assigned';

              const tasksJson = Array.isArray(tasks) ? JSON.stringify(tasks) : (tasks || '[]');

              await pgQuery(
                `INSERT INTO bookings
                  (id, request_id, caregiver_id, caregiver_name, patient_name, date,
                   start_time, end_time, duration_mins, location, address, latitude, longitude,
                   service_type, status, appointment_type, booking_type,
                   caregiver_gender_preference, location_mode, tasks, special_instructions,
                   rate_cents, caregiver_payout_cents)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
                [
                  newId, request_id || null, caregiver_id || null, caregiver_name || 'Assigned Caregiver',
                  patient_name, date, start_time, end_time, duration_mins || 60,
                  location || address || 'Kuala Lumpur', address || location || 'Kuala Lumpur',
                  latitude ?? null, longitude ?? null,
                  service_type || 'General Care', validStatus,
                  appointment_type || 'Home Visit', booking_type || 'One time',
                  caregiver_gender_preference || 'No preference',
                  location_mode || 'address', tasksJson,
                  special_instructions || null, rate_cents || 0,
                  caregiver_payment_cents || 0
                ]
              );

              if (request_id) {
                await pgQuery("UPDATE requests SET status = 'Booked', updated_at = NOW() WHERE id = $1", [request_id]);
              }

              return sendJson(res, 201, { ok: true, id: newId });
            }

            const database = await getDb();
            const maxRow = database.prepare('SELECT id FROM bookings ORDER BY id DESC LIMIT 1').get();
            const lastNum = maxRow ? parseInt(maxRow.id.replace(/\D/g, ''), 10) : 5000;
            const newId = `BK-${String(lastNum + 1)}`;

            // If caregiver_id is provided, get caregiver name
            let caregiver_name = null;
            if (caregiver_id) {
              const cg = database.prepare('SELECT name FROM caregivers WHERE id = ?').get(caregiver_id);
              if (cg) caregiver_name = cg.name;
            }

            database
              .prepare(`INSERT INTO bookings
                (id, request_id, caregiver_id, caregiver_name, patient_name, date,
                 start_time, end_time, duration_mins, location, address, latitude, longitude,
                 service_type, status, appointment_type, booking_type,
                 caregiver_gender_preference, location_mode, tasks, special_instructions,
                 rate_cents, service_amount_cents, caregiver_payment_cents)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(
                newId, request_id || null, caregiver_id || null, caregiver_name,
                patient_name, date, start_time, end_time, duration_mins || null,
                location || '', address || location || '', latitude ?? null, longitude ?? null,
                service_type || 'General Care', status || 'Pending',
                appointment_type || null, booking_type || 'standard',
                caregiver_gender_preference || 'No preference',
                location_mode || 'address', tasks ? JSON.stringify(tasks) : null,
                special_instructions || null, rate_cents ?? null,
                service_amount_cents ?? null, caregiver_payment_cents ?? null
              );

            // Update the request status to 'Assigned' if request_id is provided
            if (request_id) {
              database
                .prepare("UPDATE requests SET status = 'Assigned', updated_at = datetime('now') WHERE id = ?")
                .run(request_id);
            }

            return sendJson(res, 201, { ok: true, id: newId });
          } catch (err) {
            console.error('[bookings POST create]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // POST /api/bookings/:id/pay-link
        if (segments.length === 2 && segments[1] === 'pay-link' && req.method === 'POST') {
          try {
            const bookingId = decodeURIComponent(segments[0]);
            let body;
            try {
              body = await readJsonBody(req);
            } catch (err) {
              return sendJson(res, 400, { ok: false, error: err.message });
            }

            const invoicePdf = typeof body.invoicePdf === 'string' ? body.invoicePdf : null;

            if (hasPgConfig()) {
              const resUpdate = await pgQuery(
                `UPDATE bookings SET status = 'Link sent (Unpaid)', invoice_pdf = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
                [invoicePdf, bookingId]
              );
              if (resUpdate.rows.length === 0) return sendJson(res, 404, { ok: false, error: 'Booking not found.' });
              return sendJson(res, 200, {
                ok: true,
                message: 'Payment link status updated in PostgreSQL database.',
              });
            }

            const database = await getDb();
            const booking = database.prepare('SELECT id FROM bookings WHERE id = ?').get(bookingId);
            if (!booking) return sendJson(res, 404, { ok: false, error: 'Booking not found.' });

            database
              .prepare(
                `UPDATE bookings SET status = 'Link sent (Unpaid)', invoice_pdf = ?, updated_at = datetime('now') WHERE id = ?`
              )
              .run(invoicePdf, bookingId);

            return sendJson(res, 200, {
              ok: true,
              demo: true,
              message: 'Stripe is not configured locally. Use wrangler pages dev with STRIPE_SECRET_KEY to create a real Stripe test link.',
            });
          } catch (err) {
            console.error('[bookings pay-link]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // POST /api/bookings/:id/collect
        if (segments.length === 2 && segments[1] === 'collect' && req.method === 'POST') {
          try {
            const bookingId = decodeURIComponent(segments[0]);
            let body;
            try {
              body = await readJsonBody(req);
            } catch (err) {
              return sendJson(res, 400, { ok: false, error: err.message });
            }

            const receiptDataUrl = typeof body.receiptDataUrl === 'string' ? body.receiptDataUrl : null;
            if (!receiptDataUrl) {
              return sendJson(res, 400, { ok: false, error: 'A receipt file is required to mark a booking as collected directly.' });
            }

            if (hasPgConfig()) {
              const resUpdate = await pgQuery(
                `UPDATE bookings
                 SET status = 'Paid - Collected Directly', receipt_url = $1, payment_method = 'direct',
                     paid_at = NOW(), updated_at = NOW()
                 WHERE id = $2 RETURNING id`,
                [receiptDataUrl, bookingId]
              );
              if (resUpdate.rows.length === 0) return sendJson(res, 404, { ok: false, error: 'Booking not found.' });
              return sendJson(res, 200, { ok: true });
            }

            const database = await getDb();
            const result = database
              .prepare(
                `UPDATE bookings
                 SET status = 'Paid - Collected Directly', receipt_url = ?, payment_method = 'direct',
                     paid_at = datetime('now'), updated_at = datetime('now')
                 WHERE id = ?`
              )
              .run(receiptDataUrl, bookingId);

            if (result.changes === 0) {
              return sendJson(res, 404, { ok: false, error: 'Booking not found.' });
            }

            return sendJson(res, 200, { ok: true });
          } catch (err) {
            console.error('[bookings collect]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // PUT /api/bookings/:id/cost — update cost breakdown
        if (segments.length === 2 && segments[1] === 'cost' && req.method === 'PUT') {
          try {
            const bookingId = decodeURIComponent(segments[0]);
            let body;
            try { body = await readJsonBody(req); }
            catch (err) { return sendJson(res, 400, { ok: false, error: err.message }); }

            const costBreakdown = body.cost_breakdown;
            if (costBreakdown === undefined || costBreakdown === null) {
              return sendJson(res, 400, { ok: false, error: 'cost_breakdown is required.' });
            }

            if (hasPgConfig()) {
              return sendJson(res, 200, { ok: true });
            }

            const database = await getDb();
            const result = database
              .prepare(`UPDATE bookings SET cost_breakdown = ?, updated_at = datetime('now') WHERE id = ?`)
              .run(costBreakdown, bookingId);

            if (result.changes === 0) {
              return sendJson(res, 404, { ok: false, error: 'Booking not found.' });
            }

            return sendJson(res, 200, { ok: true });
          } catch (err) {
            console.error('[bookings cost]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // Anything else under /api/bookings — unchanged 405 behavior.
        res.statusCode = 405;
        res.end();
      });

      // ---- Caregiving Sites API middleware ----
      server.middlewares.use('/api/caregiving-sites', async (req, res) => {
        try {
          if (req.method === 'GET') {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                'SELECT id, name, area, latitude, longitude, address, phone FROM caregiving_sites ORDER BY area'
              );
              return sendJson(res, 200, pgRes.rows);
            }
            const database = await getDb();
            const rows = database.prepare('SELECT id, name, area, latitude, longitude FROM caregiving_sites ORDER BY area').all();
            return sendJson(res, 200, rows);
          }
          res.statusCode = 405;
          res.end();
        } catch (err) {
          console.error('[caregiving-sites]', err);
          return sendJson(res, 500, { ok: false, error: err.message });
        }
      });

      // ---- Requests API middleware ----
      server.middlewares.use('/api/requests', async (req, res) => {
        const [pathname] = req.url.split('?');
        const segments = pathname.split('/').filter(Boolean);

        // GET /api/requests
        if (segments.length === 0 && req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                `SELECT pr.id, pr.source, pr.status, pr.patient_name, pr.phone,
                        pr.preferred_language, pr.care_type, pr.gender_preference,
                        pr.required_skill, pr.zone, pr.location,
                        pr.latitude, pr.longitude,
                        pr.requested_date, pr.preferred_start, pr.preferred_end,
                        pr.notes, pr.service_amount_cents, pr.caregiver_payment_cents
                 FROM requests pr
                 ORDER BY pr.created_at DESC`
              );
              return sendJson(res, 200, pgRes.rows);
            }
            const database = await getDb();
            const rows = database
              .prepare(
                `SELECT pr.id, pr.source, pr.status, pr.patient_name, pr.phone,
                        pr.preferred_language, pr.care_type, pr.gender_preference,
                        pr.required_skill, pr.zone, pr.location,
                        pr.latitude, pr.longitude,
                        pr.requested_date, pr.preferred_start, pr.preferred_end,
                        pr.notes, pr.service_amount_cents, pr.caregiver_payment_cents
                 FROM requests pr
                 ORDER BY pr.created_at DESC`
              )
              .all();
            return sendJson(res, 200, rows);
          } catch (err) {
            console.error('[requests GET all]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // GET /api/requests/:id — single request lookup
        if (segments.length === 1 && req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                `SELECT pr.id, pr.source, pr.status, pr.patient_name, pr.phone,
                        pr.preferred_language, pr.care_type, pr.gender_preference,
                        pr.required_skill, pr.zone, pr.location,
                        pr.latitude, pr.longitude,
                        TO_CHAR(pr.requested_date, 'YYYY-MM-DD') AS requested_date,
                        pr.preferred_start::text AS preferred_start,
                        pr.preferred_end::text AS preferred_end,
                        pr.notes, pr.service_amount_cents, pr.caregiver_payment_cents,
                        pr.created_at, pr.updated_at
                 FROM requests pr
                 WHERE pr.id = $1`,
                [segments[0]]
              );
              if (pgRes.rows.length === 0) return sendJson(res, 404, { ok: false, error: 'Request not found.' });
              return sendJson(res, 200, pgRes.rows[0]);
            }
            const database = await getDb();
            const row = database
              .prepare(
                `SELECT pr.id, pr.source, pr.status, pr.patient_name, pr.phone,
                        pr.preferred_language, pr.care_type, pr.gender_preference,
                        pr.required_skill, pr.zone, pr.location,
                        pr.latitude, pr.longitude,
                        pr.requested_date, pr.preferred_start, pr.preferred_end,
                        pr.notes, pr.service_amount_cents, pr.caregiver_payment_cents,
                        pr.created_at, pr.updated_at
                 FROM requests pr
                 WHERE pr.id = ?`
              )
              .get(segments[0]);
            if (!row) return sendJson(res, 404, { ok: false, error: 'Request not found.' });
            return sendJson(res, 200, row);
          } catch (err) {
            console.error('[requests GET by id]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // PUT /api/requests/:id — update request
        if (segments.length === 1 && req.method === 'PUT') {
          try {
            let body;
            try { body = await readJsonBody(req); }
            catch (err) { return sendJson(res, 400, { ok: false, error: err.message }); }

            const requestId = segments[0];

            if (hasPgConfig()) {
              const allowed = {
                status: null, patient_name: null, phone: null, preferred_language: null,
                care_type: null, gender_preference: null, required_skill: null,
                zone: null, location: null, latitude: null, longitude: null,
                requested_date: null, preferred_start: null, preferred_end: null,
                notes: null, service_amount_cents: null, caregiver_payment_cents: null,
              };
              const sets = [];
              const values = [];
              let pIdx = 1;
              for (const key of Object.keys(allowed)) {
                if (body[key] !== undefined) {
                  sets.push(`${key} = $${pIdx++}`);
                  values.push(body[key]);
                }
              }
              if (sets.length === 0) return sendJson(res, 400, { ok: false, error: 'No fields to update.' });
              sets.push(`updated_at = NOW()`);
              values.push(requestId);

              const result = await pgQuery(
                `UPDATE requests SET ${sets.join(', ')} WHERE id = $${pIdx} RETURNING id`,
                values
              );
              if (result.rows.length === 0) return sendJson(res, 404, { ok: false, error: 'Request not found.' });
              return sendJson(res, 200, { ok: true, id: requestId });
            }

            const database = await getDb();

            // Check request exists
            const existing = database.prepare('SELECT id FROM requests WHERE id = ?').get(requestId);
            if (!existing) return sendJson(res, 404, { ok: false, error: 'Request not found.' });

            // Build dynamic SET clause from allowed fields
            const allowed = {
              status: null, patient_name: null, phone: null, preferred_language: null,
              care_type: null, gender_preference: null, required_skill: null,
              zone: null, location: null, latitude: null, longitude: null,
              requested_date: null, preferred_start: null, preferred_end: null,
              notes: null, service_amount_cents: null, caregiver_payment_cents: null,
            };
            const sets = [];
            const values = [];
            for (const key of Object.keys(allowed)) {
              if (body[key] !== undefined) {
                sets.push(`${key} = ?`);
                values.push(body[key]);
              }
            }
            if (sets.length === 0) return sendJson(res, 400, { ok: false, error: 'No fields to update.' });
            sets.push("updated_at = datetime('now')");
            values.push(requestId);

            database.prepare(`UPDATE requests SET ${sets.join(', ')} WHERE id = ?`).run(...values);
            return sendJson(res, 200, { ok: true, id: requestId });
          } catch (err) {
            console.error('[requests PUT]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // POST /api/requests — create a new request
        if (segments.length === 0 && req.method === 'POST') {
          try {
            let body;
            try { body = await readJsonBody(req); }
            catch (err) { return sendJson(res, 400, { ok: false, error: err.message }); }

            const {
              source, patient_name, phone, preferred_language, care_type,
              gender_preference, required_skill, zone, location,
              latitude, longitude, requested_date, preferred_start, preferred_end,
              notes, _assigned_caregiver_id
            } = body;

            if (!patient_name || !requested_date || !preferred_start || !preferred_end) {
              return sendJson(res, 400, {
                ok: false,
                error: 'patient_name, requested_date, preferred_start, and preferred_end are required.'
              });
            }

            if (hasPgConfig()) {
              const maxRow = await pgQuery("SELECT id FROM requests ORDER BY id DESC LIMIT 1");
              const lastNum = maxRow.rows.length > 0 ? parseInt(maxRow.rows[0].id.replace(/\D/g, ''), 10) : 1000;
              const prefix = source === 'WhatsApp' ? 'WA-REQ-' : 'WEB-REQ-';
              const newId = `${prefix}${String(lastNum + 1)}`;

              await pgQuery(
                `INSERT INTO requests
                  (id, source, status, patient_name, phone, preferred_language, care_type,
                   gender_preference, required_skill, zone, location,
                   latitude, longitude, requested_date, preferred_start, preferred_end,
                   notes)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                [
                  newId, source || 'Website', 'New', patient_name, phone || null,
                  preferred_language || null, care_type || 'General Care',
                  gender_preference || 'No preference', required_skill || null,
                  zone || '', location || '', latitude ?? null, longitude ?? null,
                  requested_date, preferred_start, preferred_end,
                  notes || null
                ]
              );
              return sendJson(res, 201, { ok: true, id: newId });
            }

            const database = await getDb();
            const maxRow = database.prepare('SELECT id FROM requests ORDER BY id DESC LIMIT 1').get();
            const lastNum = maxRow ? parseInt(maxRow.id.replace(/\D/g, ''), 10) : 1000;
            const prefix = source === 'WhatsApp' ? 'WA-REQ-' : 'WEB-REQ-';
            const newId = `${prefix}${String(lastNum + 1)}`;

            database
              .prepare(`INSERT INTO requests
                (id, source, status, patient_name, phone, preferred_language, care_type,
                 gender_preference, required_skill, zone, location,
                 latitude, longitude, requested_date, preferred_start, preferred_end,
                 notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(
                newId, source || 'Website', 'New', patient_name, phone || null,
                preferred_language || null, care_type || 'General Care',
                gender_preference || 'No preference', required_skill || null,
                zone || '', location || '', latitude ?? null, longitude ?? null,
                requested_date, preferred_start, preferred_end,
                notes || null
              );

            return sendJson(res, 201, { ok: true, id: newId });
          } catch (err) {
            console.error('[requests POST]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        res.statusCode = 405;
        res.end();
      });

      // ---- Caregivers list API middleware (simple dropdown data) ----
      server.middlewares.use('/api/caregivers-list', async (req, res) => {
        if (req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                'SELECT id, name, center_name AS center FROM caregivers ORDER BY name'
              );
              return sendJson(res, 200, pgRes.rows);
            }
            const database = await getDb();
            const rows = database
              .prepare('SELECT id, name, center FROM caregivers ORDER BY name')
              .all();
            return sendJson(res, 200, rows);
          } catch (err) {
            console.error('[caregivers-list GET]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }
        res.statusCode = 405;
        res.end();
      });

      // ---- Full caregivers API (with skills, availability, etc. for matching) ----
      server.middlewares.use('/api/caregivers', async (req, res) => {
        const [pathname] = req.url.split('?');
        const segments = pathname.split('/').filter(Boolean);

        if (segments.length === 0 && req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                `SELECT c.id, c.name, c.gender, c.center_name AS center, c.availability, c.phone, c.email, c.account_status,
                        c.experience_band, c.bio, c.shift_preference, c.travel_mode,
                        COALESCE(
                          (SELECT json_agg(skill) FROM caregiver_skills WHERE caregiver_id = c.id),
                          '[]'::json
                        ) as skills
                 FROM caregivers c
                 ORDER BY c.name`
              );
              return sendJson(res, 200, pgRes.rows);
            }

            const database = await getDb();
            const rows = database
              .prepare(
                `SELECT c.id, c.name, c.gender, c.center, c.availability, c.phone, c.email
                 FROM caregivers c
                 ORDER BY c.name`
              )
              .all();
            return sendJson(res, 200, rows);
          } catch (err) {
            console.error('[caregivers GET]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // GET /api/caregivers/:id — single caregiver
        if (segments.length === 1 && req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                `SELECT c.id, c.name, c.gender, c.center_name AS center, c.availability, c.phone, c.email, c.account_status,
                        c.dob, c.nationality, c.address, c.city, c.state, c.postcode, c.emergency_name, c.emergency_phone,
                        c.experience_band, c.bio, c.shift_preference, c.travel_mode,
                        COALESCE(
                          (SELECT json_agg(skill) FROM caregiver_skills WHERE caregiver_id = c.id),
                          '[]'::json
                        ) as skills
                 FROM caregivers c
                 WHERE c.id = $1`,
                [segments[0]]
              );
              if (pgRes.rows.length === 0) return sendJson(res, 404, { ok: false, error: 'Caregiver not found.' });
              return sendJson(res, 200, pgRes.rows[0]);
            }

            const database = await getDb();
            const row = database
              .prepare(
                `SELECT c.id, c.name, c.gender, c.center, c.availability, c.phone, c.email
                 FROM caregivers c
                 WHERE c.id = ?`
              )
              .get(segments[0]);
            if (!row) return sendJson(res, 404, { ok: false, error: 'Caregiver not found.' });
            return sendJson(res, 200, row);
          } catch (err) {
            console.error('[caregivers GET by id]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // POST /api/caregivers — add a new caregiver
        if (segments.length === 0 && req.method === 'POST') {
          try {
            let body;
            try { body = await readJsonBody(req); }
            catch (err) { return sendJson(res, 400, { ok: false, error: err.message }); }

            const {
              name, gender, center, availability, username, email, phone,
              languages, skills, travelMode, workAccommodations, autoAssigned
            } = body;

            if (!name) {
              return sendJson(res, 400, { ok: false, error: 'Name is required.' });
            }

            if (hasPgConfig()) {
              const maxRow = await pgQuery("SELECT id FROM caregivers ORDER BY id DESC LIMIT 1");
              const lastNum = maxRow.rows.length > 0 ? parseInt(maxRow.rows[0].id.replace(/\D/g, ''), 10) : 1000;
              const newId = `CG-${String(lastNum + 1)}`;

              // Find center site
              const siteRes = await pgQuery("SELECT id, name FROM caregiving_sites LIMIT 5");
              let siteId = 'SITE-1001';
              let siteName = 'Kuala Lumpur Main Centre';
              if (center && siteRes.rows.length > 0) {
                const match = siteRes.rows.find((s) => s.name.toLowerCase().includes(center.toLowerCase()) || center.toLowerCase().includes(s.name.toLowerCase()));
                if (match) {
                  siteId = match.id;
                  siteName = match.name;
                } else {
                  siteName = center;
                  siteId = siteRes.rows[0].id;
                }
              }

              const safeUsername = username || name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
              const safeEmail = email || `${safeUsername}@mycaregivers.com`;
              const safeGender = gender || 'Female';
              const safeAvailability = ['Available', 'On Duty', 'Off Duty', 'On Leave'].includes(availability)
                ? availability
                : 'Available';

              await pgQuery(
                `INSERT INTO caregivers
                  (id, name, username, email, gender, center_id, center_name,
                   availability, account_status, travel_mode, work_accommodations, auto_assigned, phone)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                  newId, name, safeUsername, safeEmail, safeGender, siteId, siteName,
                  safeAvailability, 'Active', travelMode || 'Car',
                  workAccommodations || '', autoAssigned || 'No', phone || null
                ]
              );

              // Insert languages
              if (Array.isArray(languages) && languages.length > 0) {
                for (const lang of languages) {
                  if (lang) {
                    await pgQuery(
                      "INSERT INTO caregiver_languages (caregiver_id, language) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                      [newId, lang]
                    );
                  }
                }
              }

              // Insert skills
              if (Array.isArray(skills) && skills.length > 0) {
                for (const skill of skills) {
                  if (skill) {
                    await pgQuery(
                      "INSERT INTO caregiver_skills (caregiver_id, skill) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                      [newId, skill]
                    );
                  }
                }
              }

              return sendJson(res, 201, {
                ok: true,
                id: newId,
                caregiver: {
                  id: newId,
                  name,
                  email: safeEmail,
                  gender: safeGender,
                  center: siteName,
                  availability: safeAvailability,
                  accountStatus: 'Active',
                }
              });
            }

            const database = await getDb();
            const maxRow = database.prepare('SELECT id FROM caregivers ORDER BY id DESC LIMIT 1').get();
            const lastNum = maxRow ? parseInt(maxRow.id.replace(/\D/g, ''), 10) : 1000;
            const newId = `CG-${String(lastNum + 1)}`;

            database.prepare(
              `INSERT INTO caregivers (id, name, gender, center, availability, phone, email)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).run(
              newId, name, gender || 'Female', center || 'Kuala Lumpur',
              availability || 'Available', phone || null, email || `${name.toLowerCase().replace(/\s+/g, '.')}@mycaregivers.com`
            );

            return sendJson(res, 201, { ok: true, id: newId });
          } catch (err) {
            console.error('[caregivers POST]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // PUT /api/caregivers/:id/availability — update availability
        if (segments.length === 2 && segments[1] === 'availability' && req.method === 'PUT') {
          try {
            const caregiverId = decodeURIComponent(segments[0]);
            let body;
            try { body = await readJsonBody(req); }
            catch (err) { return sendJson(res, 400, { ok: false, error: err.message }); }

            const { availability } = body;
            if (!availability) {
              return sendJson(res, 400, { ok: false, error: 'availability is required.' });
            }

            if (hasPgConfig()) {
              const resUpdate = await pgQuery(
                `UPDATE caregivers SET availability = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
                [availability, caregiverId]
              );
              if (resUpdate.rows.length === 0) return sendJson(res, 404, { ok: false, error: 'Caregiver not found.' });
              return sendJson(res, 200, { ok: true });
            }

            const database = await getDb();
            database.prepare("UPDATE caregivers SET availability = ? WHERE id = ?").run(availability, caregiverId);
            return sendJson(res, 200, { ok: true });
          } catch (err) {
            console.error('[caregivers PUT availability]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        res.statusCode = 405;
        res.end();
      });

      // ---- Appointments API middleware ----
      // The appointments table was merged into bookings in the new schema.
      // This middleware reads/writes the bookings table but exposes the
      // appointment shape the frontend expects.
      server.middlewares.use('/api/appointments', async (req, res) => {
        const [pathname] = req.url.split('?');
        const segments = pathname.split('/').filter(Boolean);

        // GET /api/appointments — read from bookings, map to appointment shape
        if (segments.length === 0 && req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                `SELECT b.id, b.patient_id, b.patient_name, b.caregiver_id, b.caregiver_name,
                        TO_CHAR(b.date, 'YYYY-MM-DD') AS date,
                        b.start_time::text AS start_time,
                        b.end_time::text AS end_time,
                        b.status,
                        b.appointment_type, b.booking_type,
                        b.caregiver_gender_preference, b.location_mode, b.location AS location_text,
                        b.latitude, b.longitude, b.tasks, b.special_instructions, b.duration_mins
                 FROM bookings b
                 ORDER BY b.date DESC, b.start_time ASC`
              );
              const parsed = pgRes.rows.map((row) => ({
                ...row,
                tasks: Array.isArray(row.tasks) ? row.tasks : (typeof row.tasks === 'string' ? JSON.parse(row.tasks || '[]') : []),
              }));
              return sendJson(res, 200, parsed);
            }

            const database = await getDb();
            const rows = database
              .prepare(
                `SELECT b.id, NULL AS patient_id, b.patient_name, b.caregiver_id, b.caregiver_name,
                        b.date, b.start_time, b.end_time, b.status,
                        b.appointment_type, b.booking_type,
                        b.caregiver_gender_preference, b.location_mode, b.location AS location_text,
                        b.latitude, b.longitude, b.tasks, b.special_instructions, b.duration_mins
                 FROM bookings b
                 ORDER BY b.date DESC, b.start_time ASC`
              )
              .all();
            const parsed = rows.map((row) => ({
              ...row,
              tasks: row.tasks ? JSON.parse(row.tasks) : [],
            }));
            return sendJson(res, 200, parsed);
          } catch (err) {
            console.error('[appointments GET]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // POST /api/appointments — insert into bookings table
        if (segments.length === 0 && req.method === 'POST') {
          try {
            let body;
            try { body = await readJsonBody(req); }
            catch (err) { return sendJson(res, 400, { ok: false, error: err.message }); }

            const { patient_id, patient_name, caregiver_id, caregiver_name,
              date, start_time, end_time, status, appointment_type, booking_type,
              caregiver_gender_preference, location_mode, location_text,
              latitude, longitude, tasks, special_instructions, duration_mins } = body;

            if (!patient_name || !date || !start_time || !end_time) {
              return sendJson(res, 400, { ok: false, error: 'patient_name, date, start_time, and end_time are required.' });
            }

            const calcDuration = duration_mins || Math.max(
              (parseInt(end_time.split(':')[0]) * 60 + parseInt(end_time.split(':')[1])) -
              (parseInt(start_time.split(':')[0]) * 60 + parseInt(start_time.split(':')[1])), 0);

            if (hasPgConfig()) {
              const maxRow = await pgQuery("SELECT id FROM bookings ORDER BY id DESC LIMIT 1");
              const lastNum = maxRow.rows.length > 0 ? parseInt(maxRow.rows[0].id.replace(/\D/g, ''), 10) : 5000;
              const newId = `BK-${String(lastNum + 1)}`;
              const tasksJson = Array.isArray(tasks) ? JSON.stringify(tasks) : (tasks || '[]');

              await pgQuery(
                `INSERT INTO bookings
                  (id, patient_id, patient_name, caregiver_id, caregiver_name,
                   date, start_time, end_time, status, appointment_type, booking_type,
                   caregiver_gender_preference, location_mode, location,
                   latitude, longitude, tasks, special_instructions, duration_mins,
                   service_type, rate_cents)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
                [
                  newId, patient_id || null, patient_name, caregiver_id || null, caregiver_name || null,
                  date, start_time, end_time, status || 'Caregiver assigned', appointment_type || 'Home Visit',
                  booking_type || 'One time', caregiver_gender_preference || 'No preference',
                  location_mode || 'address', location_text || '',
                  latitude || null, longitude || null, tasksJson, special_instructions || '', calcDuration,
                  appointment_type || 'Home Visit', 0
                ]
              );
              return sendJson(res, 201, { ok: true, id: newId });
            }

            const database = await getDb();
            const maxRow = database.prepare('SELECT id FROM bookings ORDER BY id DESC LIMIT 1').get();
            const lastNum = maxRow ? parseInt(maxRow.id.replace(/\D/g, ''), 10) : 5000;
            const newId = `BK-${String(lastNum + 1)}`;
            const tasksJson = tasks ? JSON.stringify(tasks) : '[]';

            database
              .prepare(`INSERT INTO bookings
                (id, patient_name, caregiver_id, caregiver_name,
                 date, start_time, end_time, status, appointment_type, booking_type,
                 caregiver_gender_preference, location_mode, location,
                 latitude, longitude, tasks, special_instructions, duration_mins,
                 service_type, rate_cents)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(newId, patient_name, caregiver_id || null, caregiver_name || null,
                date, start_time, end_time, status || 'Scheduled', appointment_type || 'Home Visit',
                booking_type || 'One time', caregiver_gender_preference || 'No preference',
                location_mode || 'address', location_text || '',
                latitude || null, longitude || null, tasksJson, special_instructions || '', calcDuration,
                appointment_type || 'Home Visit', 0);

            return sendJson(res, 201, { ok: true, id: newId });
          } catch (err) {
            console.error('[appointments POST]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // PUT /api/appointments/:id — update bookings table
        if (segments.length === 1 && req.method === 'PUT') {
          try {
            const appointmentId = decodeURIComponent(segments[0]);
            let body;
            try { body = await readJsonBody(req); }
            catch (err) { return sendJson(res, 400, { ok: false, error: err.message }); }

            const { _patient_id, patient_name, caregiver_id, caregiver_name,
              date, start_time, end_time, status, appointment_type, booking_type,
              caregiver_gender_preference, location_mode, location_text,
              latitude, longitude, tasks, special_instructions, duration_mins } = body;

            if (hasPgConfig()) {
              const sets = [];
              const values = [];
              let pIdx = 1;

              if (patient_name !== undefined) { sets.push(`patient_name = $${pIdx++}`); values.push(patient_name); }
              if (caregiver_id !== undefined) { sets.push(`caregiver_id = $${pIdx++}`); values.push(caregiver_id || null); }
              if (caregiver_name !== undefined) { sets.push(`caregiver_name = $${pIdx++}`); values.push(caregiver_name || null); }
              if (date !== undefined) { sets.push(`date = $${pIdx++}`); values.push(date); }
              if (start_time !== undefined) { sets.push(`start_time = $${pIdx++}`); values.push(start_time); }
              if (end_time !== undefined) { sets.push(`end_time = $${pIdx++}`); values.push(end_time); }
              if (status !== undefined) { sets.push(`status = $${pIdx++}`); values.push(status); }
              if (appointment_type !== undefined) { sets.push(`appointment_type = $${pIdx++}`); values.push(appointment_type); }
              if (booking_type !== undefined) { sets.push(`booking_type = $${pIdx++}`); values.push(booking_type); }
              if (caregiver_gender_preference !== undefined) { sets.push(`caregiver_gender_preference = $${pIdx++}`); values.push(caregiver_gender_preference); }
              if (location_mode !== undefined) { sets.push(`location_mode = $${pIdx++}`); values.push(location_mode); }
              if (location_text !== undefined) { sets.push(`location = $${pIdx++}`); values.push(location_text); }
              if (latitude !== undefined) { sets.push(`latitude = $${pIdx++}`); values.push(latitude || null); }
              if (longitude !== undefined) { sets.push(`longitude = $${pIdx++}`); values.push(longitude || null); }
              if (tasks !== undefined) { sets.push(`tasks = $${pIdx++}`); values.push(Array.isArray(tasks) ? JSON.stringify(tasks) : tasks); }
              if (special_instructions !== undefined) { sets.push(`special_instructions = $${pIdx++}`); values.push(special_instructions); }
              if (duration_mins !== undefined) { sets.push(`duration_mins = $${pIdx++}`); values.push(duration_mins); }

              if (sets.length === 0) return sendJson(res, 400, { ok: false, error: 'No fields to update.' });
              sets.push(`updated_at = NOW()`);
              values.push(appointmentId);

              const updateRes = await pgQuery(
                `UPDATE bookings SET ${sets.join(', ')} WHERE id = $${pIdx} RETURNING id`,
                values
              );
              if (updateRes.rows.length === 0) return sendJson(res, 404, { ok: false, error: 'Appointment not found.' });
              return sendJson(res, 200, { ok: true, id: appointmentId });
            }

            const sets = [];
            const values = [];

            if (patient_name !== undefined) { sets.push('patient_name = ?'); values.push(patient_name); }
            if (caregiver_id !== undefined) { sets.push('caregiver_id = ?'); values.push(caregiver_id || null); }
            if (caregiver_name !== undefined) { sets.push('caregiver_name = ?'); values.push(caregiver_name || null); }
            if (date !== undefined) { sets.push('date = ?'); values.push(date); }
            if (start_time !== undefined) { sets.push('start_time = ?'); values.push(start_time); }
            if (end_time !== undefined) { sets.push('end_time = ?'); values.push(end_time); }
            if (status !== undefined) { sets.push('status = ?'); values.push(status); }
            if (appointment_type !== undefined) { sets.push('appointment_type = ?'); values.push(appointment_type); }
            if (booking_type !== undefined) { sets.push('booking_type = ?'); values.push(booking_type); }
            if (caregiver_gender_preference !== undefined) { sets.push('caregiver_gender_preference = ?'); values.push(caregiver_gender_preference); }
            if (location_mode !== undefined) { sets.push('location_mode = ?'); values.push(location_mode); }
            if (location_text !== undefined) { sets.push('location = ?'); values.push(location_text); }
            if (latitude !== undefined) { sets.push('latitude = ?'); values.push(latitude || null); }
            if (longitude !== undefined) { sets.push('longitude = ?'); values.push(longitude || null); }
            if (tasks !== undefined) { sets.push('tasks = ?'); values.push(JSON.stringify(tasks)); }
            if (special_instructions !== undefined) { sets.push('special_instructions = ?'); values.push(special_instructions); }
            if (duration_mins !== undefined) { sets.push('duration_mins = ?'); values.push(duration_mins); }

            if (sets.length === 0) return sendJson(res, 400, { ok: false, error: 'No fields to update.' });
            sets.push("updated_at = datetime('now')");
            values.push(appointmentId);

            const database = await getDb();
            const result = database.prepare(`UPDATE bookings SET ${sets.join(', ')} WHERE id = ?`).run(...values);
            if (result.changes === 0) return sendJson(res, 404, { ok: false, error: 'Appointment not found.' });
            return sendJson(res, 200, { ok: true, id: appointmentId });
          } catch (err) {
            console.error('[appointments PUT]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        res.statusCode = 405;
        res.end();
      });

      // ---- Patients API middleware ----
      server.middlewares.use('/api/patients', async (req, res) => {
        if (req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                `SELECT p.id, p.name, p.gender, p.preferred_language AS "preferredLanguage",
                        p.center_name AS center, p.phone, p.email, p.address,
                        TO_CHAR(COALESCE(p.date_added, p.created_at), 'YYYY-MM-DD') AS "dateAdded"
                 FROM patients p
                 ORDER BY p.name`
              );
              return sendJson(res, 200, pgRes.rows);
            }
            return sendJson(res, 200, []);
          } catch (err) {
            console.error('[patients GET]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }
        res.statusCode = 405;
        res.end();
      });

      // ---- Payments API middleware ----
      server.middlewares.use('/api/payments', async (req, res) => {
        if (req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const pgRes = await pgQuery(
                `SELECT p.id, p.booking_id, p.request_id, p.patient_name AS patient,
                        CONCAT('RM ', (p.amount_cents / 100.0)::numeric(10,2)) AS amount,
                        TO_CHAR(COALESCE(p.paid_at, p.created_at), 'DD Mon YYYY') AS date,
                        p.patient_status AS "patientStatus",
                        CASE WHEN p.patient_status = 'Paid' THEN 'Paid to caregiver' ELSE 'Awaiting payout' END AS "caregiverStatus",
                        COALESCE(b.caregiver_name, 'Unassigned') AS caregiver
                 FROM payments p
                 LEFT JOIN bookings b ON b.id = p.booking_id
                 ORDER BY p.created_at DESC`
              );
              return sendJson(res, 200, pgRes.rows);
            }
            return sendJson(res, 200, []);
          } catch (err) {
            console.error('[payments GET]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }
        res.statusCode = 405;
        res.end();
      });

      // ---- Dashboard API middleware ----
      server.middlewares.use('/api/dashboard', async (req, res) => {
        if (req.method === 'GET') {
          try {
            if (hasPgConfig()) {
              const [bRes, cRes] = await Promise.all([
                pgQuery(
                  `SELECT b.id, b.patient_name, TO_CHAR(b.date, 'YYYY-MM-DD') AS date,
                          b.start_time::text AS start_time, b.end_time::text AS end_time,
                          b.duration_mins, b.location, b.status, b.caregiver_id, b.caregiver_name,
                          b.service_type, (b.rate_cents / 100.0)::numeric(10,2) AS rate,
                          (b.rate_cents / 100.0)::numeric(10,2) AS price,
                          (b.caregiver_payout_cents / 100.0)::numeric(10,2) AS caregiver_payout
                   FROM bookings b
                   ORDER BY b.date DESC`
                ),
                pgQuery(
                  `SELECT c.id, c.name, c.gender, c.center_name AS center, c.availability, c.account_status,
                          COALESCE(
                            (SELECT json_agg(skill) FROM caregiver_skills WHERE caregiver_id = c.id),
                            '[]'::json
                          ) as skills
                   FROM caregivers c
                   ORDER BY c.name`
                )
              ]);
              return sendJson(res, 200, {
                bookings: bRes.rows,
                caregivers: cRes.rows,
              });
            }
            return sendJson(res, 200, { bookings: [], caregivers: [] });
          } catch (err) {
            console.error('[dashboard GET]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }
        res.statusCode = 405;
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  base: basePath,
  root: rootDir,
  // One dependency cache per app. Both dev servers run at once from the same
  // repo, and with a shared node_modules/.vite the caregiver server (which has
  // no react-router-dom) would re-optimize and delete the admin's router
  // bundle, leaving the admin page blank with a "504 Outdated Optimize Dep".
  cacheDir: resolve(__dirname, `node_modules/.vite-${appPage}`),
  build: {
    outDir: resolve(__dirname, outDir),
    rollupOptions: {
      input: 'index.html',
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    emptyOutDir: false,
  },
  server: {
    port: isAdmin ? 5173 : 5174,
    // Fail loudly instead of drifting to 5175+: the login redirects between the
    // two apps assume exactly these ports.
    strictPort: true,
    fs: {
      allow: [__dirname],
    },
    ...(isAdmin ? {
      proxy: {
        // Regex, not a plain prefix: a plain '/caregiver' key also matches the
        // admin's own '/caregivers' route and proxies it to the caregiver app,
        // which 404s. Match only '/caregiver' exactly or '/caregiver/...'.
        '^/caregiver(?:/|$)': {
          target: 'http://localhost:5174',
          changeOrigin: true,
          ws: true,
          // A browser dropping the proxied connection (tab closed mid-load,
          // HMR socket reset) must not take the whole admin dev server down —
          // unhandled ECONNRESET errors here used to crash it.
          configure: (proxy) => {
            const ignore = () => {};
            proxy.on('error', (error) => console.warn(`[caregiver proxy] ${error.code || error.message}`));
            proxy.on('proxyReqWs', (_proxyReq, _req, socket) => socket.on('error', ignore));
            proxy.on('open', (proxySocket) => proxySocket.on('error', ignore));
          },
        },
      },
    } : {}),
  },
});
