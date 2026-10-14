import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const appPage = process.env.VITE_APP_PAGE || 'admin';
const isAdmin = appPage === 'admin';
const isCaregiver = appPage === 'caregiver';

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
      server.middlewares.use('/api/bookings', async (req, res) => {
        // req.url here is already relative to the '/api/bookings' mount point,
        // e.g. '/', '/BK-5001/pay-link', '/BK-5001/collect'.
        const [pathname] = req.url.split('?');
        const segments = pathname.split('/').filter(Boolean); // '' | ['BK-5001','pay-link'] | ['BK-5001','collect']

        // GET /api/bookings — existing list endpoint, unchanged.
        if (segments.length === 0 && req.method === 'GET') {
          try {
            const database = await getDb();
            const rows = database
              .prepare(
                `SELECT b.id, b.patient_name, b.date, b.start_time, b.end_time, b.duration_mins, b.location, b.latitude, b.longitude,
                        b.service_type, b.status, b.rate_cents, b.appointment_type, b.booking_type,
                        b.caregiver_gender_preference, b.location_mode, b.tasks, b.special_instructions,
                        c.name AS caregiver_name
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
              duration_mins, location, latitude, longitude, service_type, status,
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
                 start_time, end_time, duration_mins, location, latitude, longitude,
                 service_type, status, appointment_type, booking_type,
                 caregiver_gender_preference, location_mode, tasks, special_instructions,
                 rate_cents, service_amount_cents, caregiver_payment_cents)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(
                newId, request_id || null, caregiver_id || null, caregiver_name,
                patient_name, date, start_time, end_time, duration_mins || null,
                location || '', latitude ?? null, longitude ?? null,
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

        // POST /api/bookings/:id/pay-link — demo mode only, matches the
        // Cloudflare Function's no-STRIPE_SECRET_KEY branch: records the
        // invoice and moves status to "Link sent (Unpaid)" without hitting
        // Stripe, so the UI flow can be exercised without wrangler running.
        if (segments.length === 2 && segments[1] === 'pay-link' && req.method === 'POST') {
          try {
            const bookingId = decodeURIComponent(segments[0]);
            let body;
            try {
              body = await readJsonBody(req);
            } catch (err) {
              return sendJson(res, 400, { ok: false, error: err.message });
            }

            const database = await getDb();
            const booking = database.prepare('SELECT id FROM bookings WHERE id = ?').get(bookingId);
            if (!booking) return sendJson(res, 404, { ok: false, error: 'Booking not found.' });

            const invoicePdf = typeof body.invoicePdf === 'string' ? body.invoicePdf : null;
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

        // POST /api/bookings/:id/collect — mirrors the Cloudflare Function
        // exactly; no Stripe involved here even in production.
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

        // Anything else under /api/bookings — unchanged 405 behavior.
        res.statusCode = 405;
        res.end();
      });

      // ---- Caregiving Sites API middleware ----
      server.middlewares.use('/api/caregiving-sites', async (req, res) => {
        try {
          if (req.method === 'GET') {
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
              notes, assigned_caregiver_id
            } = body;

            if (!patient_name || !requested_date || !preferred_start || !preferred_end) {
              return sendJson(res, 400, {
                ok: false,
                error: 'patient_name, requested_date, preferred_start, and preferred_end are required.'
              });
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
            const database = await getDb();
            const rows = database
              .prepare(
                `SELECT c.id, c.name, c.phone, c.email, c.gender, c.zone, c.center,
                        c.latitude, c.longitude, c.rating, c.status, c.profile_photo,
                        c.availability, c.care_types, c.skills, c.languages,
                        c.experience_years, c.max_distance_km,
                        c.service_amount_cents, c.caregiver_payment_cents
                 FROM caregivers c
                 ORDER BY c.name`
              )
              .all();
            // Parse JSON fields for convenience
            const parsed = rows.map(r => ({
              ...r,
              availability: r.availability ? (typeof r.availability === 'string' ? JSON.parse(r.availability) : r.availability) : [],
              skills: r.skills ? (typeof r.skills === 'string' ? JSON.parse(r.skills) : r.skills) : [],
              care_types: r.care_types ? (typeof r.care_types === 'string' ? JSON.parse(r.care_types) : r.care_types) : [],
              languages: r.languages ? (typeof r.languages === 'string' ? JSON.parse(r.languages) : r.languages) : [],
            }));
            return sendJson(res, 200, parsed);
          } catch (err) {
            console.error('[caregivers GET]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // GET /api/caregivers/:id — single caregiver
        if (segments.length === 1 && req.method === 'GET') {
          try {
            const database = await getDb();
            const row = database
              .prepare(
                `SELECT c.id, c.name, c.phone, c.email, c.gender, c.zone, c.center,
                        c.latitude, c.longitude, c.rating, c.status, c.profile_photo,
                        c.availability, c.care_types, c.skills, c.languages,
                        c.experience_years, c.max_distance_km,
                        c.service_amount_cents, c.caregiver_payment_cents
                 FROM caregivers c
                 WHERE c.id = ?`
              )
              .get(segments[0]);
            if (!row) return sendJson(res, 404, { ok: false, error: 'Caregiver not found.' });
            // Parse JSON fields
            if (row.availability && typeof row.availability === 'string') row.availability = JSON.parse(row.availability);
            if (row.skills && typeof row.skills === 'string') row.skills = JSON.parse(row.skills);
            if (row.care_types && typeof row.care_types === 'string') row.care_types = JSON.parse(row.care_types);
            if (row.languages && typeof row.languages === 'string') row.languages = JSON.parse(row.languages);
            return sendJson(res, 200, row);
          } catch (err) {
            console.error('[caregivers GET by id]', err);
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

            const database = await getDb();
            const maxRow = database.prepare('SELECT id FROM bookings ORDER BY id DESC LIMIT 1').get();
            const lastNum = maxRow ? parseInt(maxRow.id.replace(/\D/g, ''), 10) : 5000;
            const newId = `BK-${String(lastNum + 1)}`;
            const tasksJson = tasks ? JSON.stringify(tasks) : '[]';
            const calcDuration = duration_mins || Math.max(
              (parseInt(end_time.split(':')[0]) * 60 + parseInt(end_time.split(':')[1])) -
              (parseInt(start_time.split(':')[0]) * 60 + parseInt(start_time.split(':')[1])), 0);

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

            const { patient_id, patient_name, caregiver_id, caregiver_name,
              date, start_time, end_time, status, appointment_type, booking_type,
              caregiver_gender_preference, location_mode, location_text,
              latitude, longitude, tasks, special_instructions, duration_mins } = body;

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
    },
  };
}

export default defineConfig({
  plugins: [react(), ...(isAdmin ? [localApiPlugin()] : [])],
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
