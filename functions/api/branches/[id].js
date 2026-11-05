import {
  BRANCH_DELETE_BLOCKING_STATUSES, BRANCH_FIELDS, branchResponse,
  makeBranchAudit, normalizeBranchInput, validateBranch,
} from '../../_shared/branchUtils.js';

const BRANCH_SELECT = `
  SELECT b.*,
         (SELECT COUNT(*) FROM caregivers c WHERE c.branch_id = b.id) AS caregiver_count,
         (SELECT COUNT(*) FROM bookings a WHERE a.branch_id = b.id AND a.status = 'In progress') AS ongoing_appointment_count
  FROM branches b`;

const BLOCKING_SQL = `status IN (${BRANCH_DELETE_BLOCKING_STATUSES.map(() => '?').join(', ')})`;

function errorResponse(message, status, fields) {
  return Response.json({ ok: false, error: message, ...(fields ? { fields } : {}) }, { status });
}

async function getBranch(db, id) {
  return db.prepare(`${BRANCH_SELECT} WHERE b.id = ?`).bind(id).first();
}

async function getBlockingAppointments(db, id) {
  const { results } = await db.prepare(
    `SELECT id, patient_name AS patient, date
     FROM bookings WHERE branch_id = ? AND ${BLOCKING_SQL}
     ORDER BY date ASC, start_time ASC`
  ).bind(id, ...BRANCH_DELETE_BLOCKING_STATUSES).all();
  return results;
}

async function writeAudit(db, event) {
  const previous = await db.prepare('SELECT hash FROM audit_logs ORDER BY at DESC, id DESC LIMIT 1').first();
  const record = await makeBranchAudit({ ...event, previousHash: previous?.hash || null });
  await db.prepare(
    `INSERT INTO audit_logs
       (id, at, actor_name, actor_role, action, record_type, record_id, summary, changes, previous_hash, hash)
     VALUES (?, ?, 'System', 'system', ?, 'Branch', ?, ?, ?, ?, ?)`
  ).bind(
    record.id, record.at, record.action, record.recordId, record.summary,
    JSON.stringify(record.changes), record.previousHash, record.hash
  ).run();
}

export async function onRequestGet({ env, params }) {
  try {
    const row = await getBranch(env.DB, params.id);
    if (!row) return errorResponse('Branch not found.', 404);
    return Response.json(branchResponse(row));
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

export async function onRequestPut({ request, env, params }) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Request body must be valid JSON.', 400); }

  if (!body || typeof body !== 'object' || Array.isArray(body) || !BRANCH_FIELDS.some((field) => Object.hasOwn(body, field))) {
    return errorResponse('At least one branch field is required.', 400);
  }

  try {
    const existing = await getBranch(env.DB, params.id);
    if (!existing) return errorResponse('Branch not found.', 404);
    const before = branchResponse(existing);
    const branch = normalizeBranchInput(body, before);
    const errors = validateBranch(branch);
    if (Object.keys(errors).length) return errorResponse('Validation failed.', 400, errors);

    const duplicate = await env.DB.prepare(
      'SELECT id FROM branches WHERE LOWER(name) = LOWER(?) AND id <> ?'
    ).bind(branch.name, params.id).first();
    if (duplicate) return errorResponse('A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });

    const result = await env.DB.prepare(
      `UPDATE branches SET
         name = ?, address = ?, city = ?, state = ?, postcode = ?, service_area = ?,
         latitude = ?, longitude = ?, phone = ?, email = ?, operating_hours = ?,
         capacity = ?, status = ?, notes = ?, emergency_contact_name = ?,
         emergency_contact_phone = ?, facility_fee_cents = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      branch.name, branch.address, branch.city, branch.state, branch.postcode,
      branch.service_area, branch.latitude, branch.longitude, branch.phone || null,
      branch.email || null, JSON.stringify(branch.operating_hours), branch.capacity,
      branch.status, branch.notes || null, branch.emergency_contact_name || null,
      branch.emergency_contact_phone || null, branch.facility_fee_cents, params.id
    ).run();
    if (!result.meta || result.meta.changes === 0) return errorResponse('Branch not found.', 404);

    await writeAudit(env.DB, {
      action: 'branch.updated', recordId: params.id, summary: `Updated branch ${branch.name}`,
      changes: [{ field: 'record', before, after: branch }],
    });
    return Response.json({ ok: true, branch: { id: params.id, ...branch } });
  } catch (err) {
    if (/unique/i.test(err.message)) return errorResponse('A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });
    return errorResponse(err.message, 500);
  }
}

export async function onRequestDelete({ env, params }) {
  const db = env.DB;
  try {
    const existing = await getBranch(db, params.id);
    if (!existing) return errorResponse('Branch not found.', 404);

    const before = branchResponse(existing);
    const previous = await db.prepare('SELECT hash FROM audit_logs ORDER BY at DESC, id DESC LIMIT 1').first();
    const audit = await makeBranchAudit({
      action: 'branch.deleted', recordId: params.id, summary: `Deleted branch ${before.name}`,
      changes: [{ field: 'record', before, after: null }], previousHash: previous?.hash || null,
    });

    const tableInfo = await db.prepare('PRAGMA table_info(caregivers)').all();
    const hasLegacyBaseSiteId = tableInfo.results.some((column) => column.name === 'base_site_id');
    const statements = [
      db.prepare(
        `UPDATE bookings SET branch_name = ?
         WHERE branch_id = ? AND branch_name IS NULL
           AND NOT EXISTS (SELECT 1 FROM bookings WHERE branch_id = ? AND ${BLOCKING_SQL})`
      ).bind(before.name, params.id, params.id, ...BRANCH_DELETE_BLOCKING_STATUSES),
    ];
    if (hasLegacyBaseSiteId) {
      statements.push(db.prepare(
        `UPDATE caregivers SET base_site_id = NULL
         WHERE base_site_id = ?
           AND NOT EXISTS (SELECT 1 FROM bookings WHERE branch_id = ? AND ${BLOCKING_SQL})`
      ).bind(params.id, params.id, ...BRANCH_DELETE_BLOCKING_STATUSES));
    }
    statements.push(db.prepare(
      `INSERT INTO audit_logs
         (id, at, actor_name, actor_role, action, record_type, record_id, summary, changes, previous_hash, hash)
       SELECT ?, ?, 'System', 'system', ?, 'Branch', ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM branches WHERE id = ?)
         AND NOT EXISTS (SELECT 1 FROM bookings WHERE branch_id = ? AND ${BLOCKING_SQL})`
    ).bind(
      audit.id, audit.at, audit.action, audit.recordId, audit.summary,
      JSON.stringify(audit.changes), audit.previousHash, audit.hash,
      params.id, params.id, ...BRANCH_DELETE_BLOCKING_STATUSES
    ));
    statements.push(db.prepare(
      `DELETE FROM branches WHERE id = ?
       AND NOT EXISTS (SELECT 1 FROM bookings WHERE branch_id = ? AND ${BLOCKING_SQL})`
    ).bind(params.id, params.id, ...BRANCH_DELETE_BLOCKING_STATUSES));

    const results = await db.batch(statements);
    const deleted = results[results.length - 1]?.meta?.changes || 0;
    if (!deleted) {
      const stillExists = await db.prepare('SELECT id FROM branches WHERE id = ?').bind(params.id).first();
      if (!stillExists) return errorResponse('Branch not found.', 404);
      const blockingAppointments = await getBlockingAppointments(db, params.id);
      if (blockingAppointments.length) {
        return Response.json({
          ok: false,
          error: 'Branch has appointments that must be served or reassigned before deletion.',
          blockingAppointments,
          totalCount: blockingAppointments.length,
        }, { status: 409 });
      }
      return errorResponse('Branch could not be deleted. Please retry.', 409);
    }
    return Response.json({ ok: true, id: params.id });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
