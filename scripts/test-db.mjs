import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

// Parse .env manually if needed
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
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
    console.error('Could not read .env file:', err.message);
  }
}

if (!databaseUrl) {
  console.error('Error: DATABASE_URL not found in .env');
  process.exit(1);
}

console.log('Connecting to PostgreSQL database...');
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }, // for Neon SSL
});

try {
  const client = await pool.connect();
  console.log('Successfully connected to PostgreSQL database!');

  // Check database time and version
  const timeRes = await client.query('SELECT NOW() as current_time, version();');
  console.log('Server Time:', timeRes.rows[0].current_time);
  console.log('Version:', timeRes.rows[0].version.split(',')[0]);

  // Check what tables exist
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('\nFound Tables:');
  if (tablesRes.rows.length === 0) {
    console.log('  (No tables found in public schema)');
  } else {
    for (const r of tablesRes.rows) {
      console.log(`  - ${r.table_name}`);
    }
  }

  // If tables exist, let's sample users, caregivers, caregiving_sites, requests, bookings
  const tables = tablesRes.rows.map(r => r.table_name);

  if (tables.includes('users')) {
    const users = await client.query('SELECT id, email, full_name, role FROM users LIMIT 5');
    console.log('\n--- 1. Users & Authentication Test ---');
    console.log('Sample Users in Database:', users.rows);

    // Test verifying password for Admin
    const adminCheck = await client.query(
      'SELECT id, email, full_name, role FROM users WHERE email = $1 AND password_hash = crypt($2, password_hash)',
      ['admin@mycaregivers.com', 'AdminPass123!']
    );
    console.log('Admin Login Verification (admin@mycaregivers.com / AdminPass123!):', adminCheck.rows.length > 0 ? 'SUCCESS -> ' + JSON.stringify(adminCheck.rows[0]) : 'FAILED');

    // Test verifying password for Caregiver
    const cgCheck = await client.query(
      'SELECT id, email, full_name, role FROM users WHERE email = $1 AND password_hash = crypt($2, password_hash)',
      ['sarah.tan@example.com', 'CaregiverPass123!']
    );
    console.log('Caregiver Login Verification (sarah.tan@example.com / CaregiverPass123!):', cgCheck.rows.length > 0 ? 'SUCCESS -> ' + JSON.stringify(cgCheck.rows[0]) : 'FAILED');
  }

  if (tables.includes('caregivers')) {
    const caregivers = await client.query('SELECT id, name, center_name, availability, account_status FROM caregivers LIMIT 5');
    console.log('\nSample Caregivers:', caregivers.rows);
  }

  if (tables.includes('caregiving_sites')) {
    const sites = await client.query('SELECT id, name, area FROM caregiving_sites LIMIT 5');
    console.log('\nSample Sites:', sites.rows);
  }

  if (tables.includes('bookings')) {
    const bookings = await client.query('SELECT id, patient_name, caregiver_name, date, status FROM bookings LIMIT 5');
    console.log('\nSample Bookings:', bookings.rows);
  }

  client.release();
  await pool.end();
  console.log('\nConnection test completed successfully.');
} catch (err) {
  console.error('\nDatabase Connection Error:', err.message);
  if (err.stack) console.error(err.stack);
  await pool.end();
  process.exit(1);
}
