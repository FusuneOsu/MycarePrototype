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
    } else {
      // Existing database — apply any missing migrations.
      // Migration 1: add patient_name column to appointments (added after initial schema).
      try {
        db.prepare("SELECT patient_name FROM appointments LIMIT 0").get();
      } catch {
        try { db.exec("ALTER TABLE appointments ADD COLUMN patient_name TEXT NOT NULL DEFAULT ''"); } catch { /* already added */ }
      }
      try {
        db.prepare("SELECT caregiver_name FROM appointments LIMIT 0").get();
      } catch {
        try { db.exec("ALTER TABLE appointments ADD COLUMN caregiver_name TEXT"); } catch { /* already added */ }
      }
      // Migration: create caregiving_sites table if not present.
      try {
        db.prepare("SELECT id FROM caregiving_sites LIMIT 0").get();
      } catch {
        try {
          db.exec(`CREATE TABLE IF NOT EXISTS caregiving_sites (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, area TEXT NOT NULL,
            latitude REAL NOT NULL, longitude REAL NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`);
          db.exec(`INSERT OR IGNORE INTO caregiving_sites (id, name, area, latitude, longitude) VALUES
            ('SITE-001', 'Caregiver Center 1', 'Petaling Jaya', 3.1073, 101.6064),
            ('SITE-002', 'Caregiver Center 2', 'Subang Jaya', 3.0568, 101.5852),
            ('SITE-003', 'Caregiver Center 3', 'Cheras', 3.1008, 101.7242),
            ('SITE-004', 'Caregiver Center 4', 'Ampang', 3.1480, 101.7595),
            ('SITE-005', 'Caregiver Center 5', 'Setiawangsa', 3.1905, 101.7380),
            ('SITE-006', 'Caregiver Center 6', 'Shah Alam', 3.0733, 101.5185)`);
        } catch { /* already exists */ }
      }
      // Migration: add latitude/longitude to patient_requests.
      try {
        db.prepare("SELECT latitude FROM patient_requests LIMIT 0").get();
      } catch {
        try { db.exec("ALTER TABLE patient_requests ADD COLUMN latitude REAL"); } catch { /* already added */ }
        try { db.exec("ALTER TABLE patient_requests ADD COLUMN longitude REAL"); } catch { /* already added */ }
      }
      // Migration: add latitude/longitude to bookings.
      try {
        db.prepare("SELECT latitude FROM bookings LIMIT 0").get();
      } catch {
        try { db.exec("ALTER TABLE bookings ADD COLUMN latitude REAL"); } catch { /* already added */ }
        try { db.exec("ALTER TABLE bookings ADD COLUMN longitude REAL"); } catch { /* already added */ }
      }
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
                `SELECT b.id, b.patient_name, b.scheduled_at, b.duration_mins, b.location, b.latitude, b.longitude,
                        b.service_type, b.status, b.rate_cents, c.name AS caregiver_name
                 FROM bookings b
                 JOIN caregivers c ON c.id = b.caregiver_id
                 ORDER BY b.scheduled_at DESC`
              )
              .all();
            return sendJson(res, 200, rows);
          } catch (err) {
            console.error('[bookings GET]', err);
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

      // ---- Appointments API middleware ----
      server.middlewares.use('/api/appointments', async (req, res) => {
        const [pathname] = req.url.split('?');
        const segments = pathname.split('/').filter(Boolean);

        // GET /api/appointments
        if (segments.length === 0 && req.method === 'GET') {
          try {
            const database = await getDb();
            const rows = database
              .prepare(
                `SELECT a.id, a.patient_id, a.patient_name, a.caregiver_id, a.caregiver_name,
                        a.date, a.start_time, a.end_time, a.status,
                        a.appointment_type, a.booking_type,
                        a.caregiver_gender_preference, a.location_mode, a.location_text,
                        a.latitude, a.longitude, a.tasks, a.special_instructions, a.duration_mins
                 FROM appointments a
                 ORDER BY a.date DESC, a.start_time ASC`
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

        // POST /api/appointments
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
            const maxRow = database.prepare('SELECT id FROM appointments ORDER BY id DESC LIMIT 1').get();
            const lastNum = maxRow ? parseInt(maxRow.id.replace(/\D/g, ''), 10) : 3000;
            const newId = `AP-${String(lastNum + 1)}`;
            const tasksJson = tasks ? JSON.stringify(tasks) : '[]';
            const calcDuration = duration_mins || Math.max(
              (parseInt(end_time.split(':')[0]) * 60 + parseInt(end_time.split(':')[1])) -
              (parseInt(start_time.split(':')[0]) * 60 + parseInt(start_time.split(':')[1])), 0);

            database
              .prepare(`INSERT INTO appointments (id, patient_id, patient_name, caregiver_id, caregiver_name,
                date, start_time, end_time, status, appointment_type, booking_type,
                caregiver_gender_preference, location_mode, location_text,
                latitude, longitude, tasks, special_instructions, duration_mins)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(newId, patient_id || null, patient_name, caregiver_id || null, caregiver_name || null,
                date, start_time, end_time, status || 'Scheduled', appointment_type || 'Home Visit',
                booking_type || 'One time', caregiver_gender_preference || 'No preference',
                location_mode || 'address', location_text || '',
                latitude || null, longitude || null, tasksJson, special_instructions || '', calcDuration);

            return sendJson(res, 201, { ok: true, id: newId });
          } catch (err) {
            console.error('[appointments POST]', err);
            return sendJson(res, 500, { ok: false, error: err.message });
          }
        }

        // PUT /api/appointments/:id
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

            if (patient_id !== undefined) { sets.push('patient_id = ?'); values.push(patient_id || null); }
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
            if (location_text !== undefined) { sets.push('location_text = ?'); values.push(location_text); }
            if (latitude !== undefined) { sets.push('latitude = ?'); values.push(latitude || null); }
            if (longitude !== undefined) { sets.push('longitude = ?'); values.push(longitude || null); }
            if (tasks !== undefined) { sets.push('tasks = ?'); values.push(JSON.stringify(tasks)); }
            if (special_instructions !== undefined) { sets.push('special_instructions = ?'); values.push(special_instructions); }
            if (duration_mins !== undefined) { sets.push('duration_mins = ?'); values.push(duration_mins); }

            if (sets.length === 0) return sendJson(res, 400, { ok: false, error: 'No fields to update.' });
            sets.push("updated_at = datetime('now')");
            values.push(appointmentId);

            const database = await getDb();
            const result = database.prepare(`UPDATE appointments SET ${sets.join(', ')} WHERE id = ?`).run(...values);
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
