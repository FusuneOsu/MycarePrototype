import {
  BRANCH_DELETE_BLOCKING_STATUSES, BRANCH_FIELDS, branchResponse,
  makeBranchAudit, normalizeBranchInput, validateBranch,
} from '../functions/_shared/branchUtils.js';

const branchSelectSql = (pg) => `
  SELECT b.*,
         (SELECT COUNT(*)${pg ? '::int' : ''} FROM caregivers c WHERE c.branch_id = b.id) AS caregiver_count,
         (SELECT COUNT(*)${pg ? '::int' : ''} FROM bookings a WHERE a.branch_id = b.id AND ${pg ? 'a.status::text' : 'a.status'} = 'In progress') AS ongoing_appointment_count
  FROM branches b`;

const BLOCKING_STATUS_SQL = BRANCH_DELETE_BLOCKING_STATUSES.map((_, index) => `$${index + 1}`).join(', ');

const branchValues = (branch) => BRANCH_FIELDS.map((field) => (
  field === 'operating_hours' ? JSON.stringify(branch[field]) : (branch[field] ?? null)
));

function fieldsOnly(branch) {
  return Object.fromEntries(BRANCH_FIELDS.map((field) => [field, branch[field] ?? null]));
}

function pgAuditValues(audit) {
  return [
    audit.id, audit.at, audit.action, audit.recordId, audit.summary,
    JSON.stringify(audit.changes), audit.previousHash, audit.hash,
  ];
}

async function makeAudit(client, event) {
  const previous = await client.query('SELECT hash FROM audit_logs ORDER BY at DESC, id DESC LIMIT 1');
  return makeBranchAudit({ ...event, previousHash: previous.rows[0]?.hash || null });
}

async function insertPgAudit(client, audit) {
  await client.query(
    `INSERT INTO audit_logs
       (id, at, actor_name, actor_role, action, record_type, record_id, summary, changes, previous_hash, hash)
     VALUES ($1, $2, 'System', 'system', $3, 'Branch', $4, $5, $6::jsonb, $7, $8)`,
    pgAuditValues(audit)
  );
}

async function previousSqliteHash(database) {
  return database.prepare('SELECT hash FROM audit_logs ORDER BY at DESC, id DESC LIMIT 1').get()?.hash || null;
}

function insertSqliteAudit(database, audit) {
  database.prepare(
    `INSERT INTO audit_logs
       (id, at, actor_name, actor_role, action, record_type, record_id, summary, changes, previous_hash, hash)
     VALUES (?, ?, 'System', 'system', ?, 'Branch', ?, ?, ?, ?, ?)`
  ).run(
    audit.id, audit.at, audit.action, audit.recordId, audit.summary,
    JSON.stringify(audit.changes), audit.previousHash, audit.hash
  );
}

function sendError(sendJson, res, message, status, fields) {
  return sendJson(res, status, { ok: false, error: message, ...(fields ? { fields } : {}) });
}

async function getPgBranch(client, id) {
  const result = await client.query(`${branchSelectSql(true)} WHERE b.id = $1`, [id]);
  return result.rows[0] || null;
}

async function getPgBlockers(client, id) {
  const result = await client.query(
    `SELECT id, patient_name AS patient, TO_CHAR(date, 'YYYY-MM-DD') AS date
     FROM bookings WHERE branch_id = $1 AND status::text IN (${BLOCKING_STATUS_SQL})
     ORDER BY date ASC, start_time ASC`,
    [id, ...BRANCH_DELETE_BLOCKING_STATUSES]
  );
  return result.rows;
}

async function getSqliteBlockers(database, id) {
  const placeholders = BRANCH_DELETE_BLOCKING_STATUSES.map(() => '?').join(', ');
  return database.prepare(
    `SELECT id, patient_name AS patient, date FROM bookings
     WHERE branch_id = ? AND status IN (${placeholders}) ORDER BY date ASC, start_time ASC`
  ).all(id, ...BRANCH_DELETE_BLOCKING_STATUSES);
}

function branchListSql(search, status, pg) {
  const clauses = [];
  const values = [];
  if (search) {
    clauses.push(pg ? 'LOWER(b.name) LIKE LOWER($1)' : 'LOWER(b.name) LIKE LOWER(?)');
    values.push(`%${search}%`);
  }
  if (status && status !== 'all') {
    if (!['active', 'inactive'].includes(status)) return { error: 'status must be active or inactive.' };
    clauses.push(pg ? `b.status = $${values.length + 1}` : 'b.status = ?');
    values.push(status);
  }
  const sql = `${branchSelectSql(pg)} ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY LOWER(b.name)`;
  return { sql, values };
}

export function registerBranchesApi(server, { getDb, hasPgConfig, getPool, readJsonBody, sendJson }) {
  server.middlewares.use('/api/branches', async (req, res) => {
    const [pathname] = req.url.split('?');
    const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const url = new URL(req.url, 'http://localhost');
    const search = String(url.searchParams.get('search') || '').trim();
    const status = String(url.searchParams.get('status') || '').trim().toLowerCase();

    try {
      if (req.method === 'GET' && segments.length === 0) {
        const isPg = hasPgConfig();
        const query = branchListSql(search, status, isPg);
        if (query.error) return sendError(sendJson, res, query.error, 400);
        if (isPg) {
          const result = await getPool().query(query.sql, query.values);
          return sendJson(res, 200, result.rows.map(branchResponse));
        }
        const rows = await getDb();
        const result = rows.prepare(query.sql).all(...query.values);
        return sendJson(res, 200, result.map(branchResponse));
      }

      if (req.method === 'GET' && segments.length === 1) {
        if (hasPgConfig()) {
          const result = await getPool().query(`${branchSelectSql(true)} WHERE b.id = $1`, [segments[0]]);
          if (!result.rows[0]) return sendError(sendJson, res, 'Branch not found.', 404);
          return sendJson(res, 200, branchResponse(result.rows[0]));
        }
        const database = await getDb();
        const row = database.prepare(`${branchSelectSql(false)} WHERE b.id = ?`).get(segments[0]);
        if (!row) return sendError(sendJson, res, 'Branch not found.', 404);
        return sendJson(res, 200, branchResponse(row));
      }

      if (req.method === 'POST' && segments.length === 0) {
        let body;
        try { body = await readJsonBody(req); }
        catch (err) { return sendError(sendJson, res, err.message, 400); }
        const branch = normalizeBranchInput(body);
        const errors = validateBranch(branch);
        if (Object.keys(errors).length) return sendError(sendJson, res, 'Validation failed.', 400, errors);
        const data = fieldsOnly(branch);

        if (hasPgConfig()) {
          const client = await getPool().connect();
          try {
            await client.query('BEGIN');
            const duplicate = await client.query('SELECT id FROM branches WHERE LOWER(name) = LOWER($1)', [branch.name]);
            if (duplicate.rows.length) {
              await client.query('ROLLBACK');
              return sendError(sendJson, res, 'A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });
            }
            const id = `BR-${crypto.randomUUID()}`;
            const placeholders = BRANCH_FIELDS.map((_, index) => `$${index + 2}`).join(', ');
            await client.query(
              `INSERT INTO branches (id, ${BRANCH_FIELDS.join(', ')}) VALUES ($1, ${placeholders})`,
              [id, ...branchValues(branch)]
            );
            const audit = await makeAudit(client, {
              action: 'branch.created', recordId: id, summary: `Created branch ${branch.name}`,
              changes: [{ field: 'record', before: null, after: data }],
            });
            await insertPgAudit(client, audit);
            await client.query('COMMIT');
            return sendJson(res, 201, { ok: true, branch: { id, ...branch } });
          } catch (err) {
            await client.query('ROLLBACK');
            if (/unique/i.test(err.message)) return sendError(sendJson, res, 'A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });
            throw err;
          } finally {
            client.release();
          }
        }

        const database = await getDb();
        const duplicate = database.prepare('SELECT id FROM branches WHERE LOWER(name) = LOWER(?)').get(branch.name);
        if (duplicate) return sendError(sendJson, res, 'A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });
        const id = `BR-${crypto.randomUUID()}`;
        const previousHash = await previousSqliteHash(database);
        const audit = await makeBranchAudit({
          action: 'branch.created', recordId: id, summary: `Created branch ${branch.name}`,
          changes: [{ field: 'record', before: null, after: data }], previousHash,
        });
        database.exec('BEGIN IMMEDIATE');
        try {
          database.prepare(
            `INSERT INTO branches (id, ${BRANCH_FIELDS.join(', ')}) VALUES (${Array(BRANCH_FIELDS.length + 1).fill('?').join(', ')})`
          ).run(id, ...branchValues(branch));
          insertSqliteAudit(database, audit);
          database.exec('COMMIT');
        } catch (err) {
          database.exec('ROLLBACK');
          if (/unique/i.test(err.message)) return sendError(sendJson, res, 'A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });
          throw err;
        }
        return sendJson(res, 201, { ok: true, branch: { id, ...branch } });
      }

      if (req.method === 'PUT' && segments.length === 1) {
        let body;
        try { body = await readJsonBody(req); }
        catch (err) { return sendError(sendJson, res, err.message, 400); }
        if (!body || typeof body !== 'object' || Array.isArray(body) || !BRANCH_FIELDS.some((field) => Object.hasOwn(body, field))) {
          return sendError(sendJson, res, 'At least one branch field is required.', 400);
        }

        const id = segments[0];
        if (hasPgConfig()) {
          const client = await getPool().connect();
          try {
            await client.query('BEGIN');
            const existing = await getPgBranch(client, id);
            if (!existing) {
              await client.query('ROLLBACK');
              return sendError(sendJson, res, 'Branch not found.', 404);
            }
            const before = fieldsOnly(branchResponse(existing));
            const branch = normalizeBranchInput(body, existing);
            const errors = validateBranch(branch);
            if (Object.keys(errors).length) {
              await client.query('ROLLBACK');
              return sendError(sendJson, res, 'Validation failed.', 400, errors);
            }
            const duplicate = await client.query('SELECT id FROM branches WHERE LOWER(name) = LOWER($1) AND id <> $2', [branch.name, id]);
            if (duplicate.rows.length) {
              await client.query('ROLLBACK');
              return sendError(sendJson, res, 'A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });
            }
            const values = branchValues(branch);
            const sets = BRANCH_FIELDS.map((field, index) => `${field} = $${index + 1}`);
            await client.query(`UPDATE branches SET ${sets.join(', ')} WHERE id = $${values.length + 1}`, [...values, id]);
            const audit = await makeAudit(client, {
              action: 'branch.updated', recordId: id, summary: `Updated branch ${branch.name}`,
              changes: [{ field: 'record', before, after: fieldsOnly(branch) }],
            });
            await insertPgAudit(client, audit);
            await client.query('COMMIT');
            return sendJson(res, 200, { ok: true, branch: { id, ...branch } });
          } catch (err) {
            await client.query('ROLLBACK');
            if (/unique/i.test(err.message)) return sendError(sendJson, res, 'A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });
            throw err;
          } finally {
            client.release();
          }
        }

        const database = await getDb();
        const existing = database.prepare(`${branchSelectSql(false)} WHERE b.id = ?`).get(id);
        if (!existing) return sendError(sendJson, res, 'Branch not found.', 404);
        const before = fieldsOnly(branchResponse(existing));
        const branch = normalizeBranchInput(body, existing);
        const errors = validateBranch(branch);
        if (Object.keys(errors).length) return sendError(sendJson, res, 'Validation failed.', 400, errors);
        const duplicate = database.prepare('SELECT id FROM branches WHERE LOWER(name) = LOWER(?) AND id <> ?').get(branch.name, id);
        if (duplicate) return sendError(sendJson, res, 'A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });
        const previousHash = await previousSqliteHash(database);
        const audit = await makeBranchAudit({
          action: 'branch.updated', recordId: id, summary: `Updated branch ${branch.name}`,
          changes: [{ field: 'record', before, after: fieldsOnly(branch) }], previousHash,
        });
        const values = branchValues(branch);
        const sets = BRANCH_FIELDS.map((field) => `${field} = ?`);
        database.exec('BEGIN IMMEDIATE');
        try {
          const result = database.prepare(`UPDATE branches SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
          if (!result.changes) {
            database.exec('ROLLBACK');
            return sendError(sendJson, res, 'Branch not found.', 404);
          }
          insertSqliteAudit(database, audit);
          database.exec('COMMIT');
        } catch (err) {
          database.exec('ROLLBACK');
          throw err;
        }
        return sendJson(res, 200, { ok: true, branch: { id, ...branch } });
      }

      if (req.method === 'DELETE' && segments.length === 1) {
        const id = segments[0];
        if (hasPgConfig()) {
          const client = await getPool().connect();
          try {
            await client.query('BEGIN');
            const existing = await client.query(`${branchSelectSql(true)} WHERE b.id = $1 FOR UPDATE`, [id]);
            if (!existing.rows[0]) {
              await client.query('ROLLBACK');
              return sendError(sendJson, res, 'Branch not found.', 404);
            }
            const before = fieldsOnly(branchResponse(existing.rows[0]));
            const blockingAppointments = await getPgBlockers(client, id);
            if (blockingAppointments.length) {
              await client.query('ROLLBACK');
              return sendJson(res, 409, {
                ok: false,
                error: 'Branch has appointments that must be served or reassigned before deletion.',
                blockingAppointments,
                totalCount: blockingAppointments.length,
              });
            }
            await client.query('UPDATE bookings SET branch_name = COALESCE(branch_name, $1) WHERE branch_id = $2', [before.name, id]);
            await client.query('DELETE FROM branches WHERE id = $1', [id]);
            const audit = await makeAudit(client, {
              action: 'branch.deleted', recordId: id, summary: `Deleted branch ${before.name}`,
              changes: [{ field: 'record', before, after: null }],
            });
            await insertPgAudit(client, audit);
            await client.query('COMMIT');
            return sendJson(res, 200, { ok: true, id });
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
          const existing = database.prepare(`${branchSelectSql(false)} WHERE b.id = ?`).get(id);
          if (!existing) {
            database.exec('ROLLBACK');
            return sendError(sendJson, res, 'Branch not found.', 404);
          }
          const before = fieldsOnly(branchResponse(existing));
          const blockingAppointments = await getSqliteBlockers(database, id);
          if (blockingAppointments.length) {
            database.exec('ROLLBACK');
            return sendJson(res, 409, {
              ok: false,
              error: 'Branch has appointments that must be served or reassigned before deletion.',
              blockingAppointments,
              totalCount: blockingAppointments.length,
            });
          }
          const previousHash = await previousSqliteHash(database);
          const audit = await makeBranchAudit({
            action: 'branch.deleted', recordId: id, summary: `Deleted branch ${before.name}`,
            changes: [{ field: 'record', before, after: null }], previousHash,
          });
          database.prepare('UPDATE bookings SET branch_name = COALESCE(branch_name, ?) WHERE branch_id = ?').run(before.name, id);
          const legacyColumns = database.prepare('PRAGMA table_info(caregivers)').all();
          if (legacyColumns.some((column) => column.name === 'base_site_id')) {
            database.prepare('UPDATE caregivers SET base_site_id = NULL WHERE base_site_id = ?').run(id);
          }
          const result = database.prepare('DELETE FROM branches WHERE id = ?').run(id);
          if (!result.changes) {
            database.exec('ROLLBACK');
            return sendError(sendJson, res, 'Branch could not be deleted. Please retry.', 409);
          }
          insertSqliteAudit(database, audit);
          database.exec('COMMIT');
          return sendJson(res, 200, { ok: true, id });
        } catch (err) {
          database.exec('ROLLBACK');
          throw err;
        }
      }

      return sendError(sendJson, res, 'Method not allowed.', 405);
    } catch (err) {
      console.error('[branches API]', err);
      return sendError(sendJson, res, err.message, 500);
    }
  });

  // Compatibility endpoint for the existing Requests site selector. New code
  // should use GET /api/branches?status=active.
  server.middlewares.use('/api/caregiving-sites', async (req, res) => {
    if (req.method !== 'GET') return sendError(sendJson, res, 'Method not allowed.', 405);
    try {
      if (hasPgConfig()) {
        const result = await getPool().query(
          `SELECT id, name, service_area AS area, latitude, longitude, address, phone
           FROM branches WHERE status = 'active' ORDER BY service_area`
        );
        return sendJson(res, 200, result.rows);
      }
      const database = await getDb();
      const rows = database.prepare(
        `SELECT id, name, service_area AS area, latitude, longitude, address, phone
         FROM branches WHERE status = 'active' ORDER BY service_area`
      ).all();
      return sendJson(res, 200, rows);
    } catch (err) {
      console.error('[caregiving-sites alias]', err);
      return sendError(sendJson, res, err.message, 500);
    }
  });
}
