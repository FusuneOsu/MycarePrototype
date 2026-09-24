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
          const database = await getDb();
          const rows = database
            .prepare(
              `SELECT b.id, b.patient_name, b.scheduled_at, b.duration_mins, b.location,
                      b.service_type, b.status, b.rate_cents, c.name AS caregiver_name
               FROM bookings b
               JOIN caregivers c ON c.id = b.caregiver_id
               ORDER BY b.scheduled_at DESC`
            )
            .all();
          return sendJson(res, 200, rows);
        }

        // POST /api/bookings/:id/pay-link — demo mode only, matches the
        // Cloudflare Function's no-STRIPE_SECRET_KEY branch: records the
        // invoice and moves status to "Link sent (Unpaid)" without hitting
        // Stripe, so the UI flow can be exercised without wrangler running.
        if (segments.length === 2 && segments[1] === 'pay-link' && req.method === 'POST') {
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
        }

        // POST /api/bookings/:id/collect — mirrors the Cloudflare Function
        // exactly; no Stripe involved here even in production.
        // POST /api/bookings/:id/collect — mirrors the Cloudflare Function
        // exactly; no Stripe involved here even in production.
        if (segments.length === 2 && segments[1] === 'collect' && req.method === 'POST') {
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
        }

        // Anything else under /api/bookings — unchanged 405 behavior.
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
