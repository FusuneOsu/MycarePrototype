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

// Serves /api/bookings (and friends) during `vite dev` from a real SQLite
// database seeded with adminPage/db/schema.sql + seed.sql, so `npm run dev`
// works without needing wrangler/D1 running alongside it.
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

  return {
    name: 'mycare-local-api',
    configureServer(server) {
      server.middlewares.use('/api/bookings', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end();
          return;
        }
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
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(rows));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ...(isAdmin ? [localApiPlugin()] : [])],
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
