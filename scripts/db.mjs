import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && existsSync(envPath)) {
  try {
    const envContent = readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        databaseUrl = trimmed.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
        break;
      }
    }
  } catch (err) {
    console.error('[db] Error reading .env:', err.message);
  }
}

let pool = null;

export function getPool() {
  if (!pool && databaseUrl) {
    pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]', err);
    });
  }
  return pool;
}

export function hasPgConfig() {
  return Boolean(databaseUrl);
}

export async function query(sql, params = []) {
  const p = getPool();
  if (!p) throw new Error('No PostgreSQL DATABASE_URL configured.');
  return p.query(sql, params);
}

/**
 * Checks connection health and returns system summary.
 */
export async function testConnection() {
  if (!hasPgConfig()) {
    return { ok: false, error: 'DATABASE_URL is not defined in .env' };
  }

  const p = getPool();
  try {
    const client = await p.connect();
    try {
      const timeRes = await client.query('SELECT NOW() as current_time, version();');
      const tableCount = await client.query(`
        SELECT COUNT(*)::int as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      const userCount = await client.query('SELECT COUNT(*)::int as count FROM users;');
      const cgCount = await client.query('SELECT COUNT(*)::int as count FROM caregivers;');
      const siteCount = await client.query('SELECT COUNT(*)::int as count FROM caregiving_sites;');
      const bkCount = await client.query('SELECT COUNT(*)::int as count FROM bookings;');
      const reqCount = await client.query('SELECT COUNT(*)::int as count FROM requests;');

      return {
        ok: true,
        database: 'PostgreSQL (Neon)',
        connectedAt: timeRes.rows[0].current_time,
        version: timeRes.rows[0].version.split(',')[0],
        counts: {
          tables: tableCount.rows[0].count,
          users: userCount.rows[0].count,
          caregivers: cgCount.rows[0].count,
          caregivingSites: siteCount.rows[0].count,
          bookings: bkCount.rows[0].count,
          requests: reqCount.rows[0].count,
        },
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Verifies credentials against users table in PostgreSQL.
 */
export async function verifyUserLogin(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  
  // 1. First attempt crypt check via PostgreSQL
  const cryptRes = await query(
    `SELECT id, email, full_name, role, is_active 
     FROM users 
     WHERE LOWER(email) = $1 
       AND (password_hash = crypt($2, password_hash) OR password_hash = $2)`,
    [cleanEmail, password]
  );

  if (cryptRes.rows.length > 0) {
    return { ok: true, user: cryptRes.rows[0] };
  }

  // 2. Check if user exists to provide helpful error
  const userExists = await query('SELECT id, email FROM users WHERE LOWER(email) = $1', [cleanEmail]);
  if (userExists.rows.length === 0) {
    return { ok: false, error: 'User does not exist in PostgreSQL database.' };
  }

  return { ok: false, error: 'Invalid password.' };
}
