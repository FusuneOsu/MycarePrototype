import {
  branchResponse, makeBranchAudit, normalizeBranchInput, validateBranch,
} from '../_shared/branchUtils.js';

const BRANCH_SELECT = `
  SELECT b.*,
         (SELECT COUNT(*) FROM caregivers c WHERE c.branch_id = b.id) AS caregiver_count,
         (SELECT COUNT(*) FROM bookings a WHERE a.branch_id = b.id AND a.status = 'In progress') AS ongoing_appointment_count
  FROM branches b`;

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

function errorResponse(message, status, fields) {
  return Response.json({ ok: false, error: message, ...(fields ? { fields } : {}) }, { status });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const search = String(url.searchParams.get('search') || '').trim();
  const status = String(url.searchParams.get('status') || '').trim().toLowerCase();
  const clauses = [];
  const values = [];
  if (search) {
    clauses.push('LOWER(b.name) LIKE LOWER(?)');
    values.push(`%${search}%`);
  }
  if (status && status !== 'all') {
    if (!['active', 'inactive'].includes(status)) return errorResponse('status must be active or inactive.', 400);
    clauses.push('b.status = ?');
    values.push(status);
  }

  try {
    const query = `${BRANCH_SELECT} ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY b.name COLLATE NOCASE`;
    const { results } = await env.DB.prepare(query).bind(...values).all();
    return Response.json(results.map(branchResponse));
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Request body must be valid JSON.', 400); }

  const branch = normalizeBranchInput(body);
  const errors = validateBranch(branch);
  if (Object.keys(errors).length) return errorResponse('Validation failed.', 400, errors);

  try {
    const duplicate = await env.DB.prepare('SELECT id FROM branches WHERE LOWER(name) = LOWER(?)').bind(branch.name).first();
    if (duplicate) return errorResponse('A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });

    const id = `BR-${crypto.randomUUID()}`;
    const operatingHours = JSON.stringify(branch.operating_hours);
    const result = await env.DB.prepare(
      `INSERT INTO branches
        (id, name, address, city, state, postcode, service_area, latitude, longitude,
         phone, email, operating_hours, capacity, status, notes,
         emergency_contact_name, emergency_contact_phone, facility_fee_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, branch.name, branch.address, branch.city, branch.state, branch.postcode,
      branch.service_area, branch.latitude, branch.longitude, branch.phone || null,
      branch.email || null, operatingHours, branch.capacity, branch.status,
      branch.notes || null, branch.emergency_contact_name || null,
      branch.emergency_contact_phone || null, branch.facility_fee_cents
    ).run();

    if (!result.meta || result.meta.changes === 0) return errorResponse('Branch could not be created.', 500);
    await writeAudit(env.DB, {
      action: 'branch.created', recordId: id, summary: `Created branch ${branch.name}`,
      changes: [{ field: 'record', before: null, after: branch }],
    });
    return Response.json({ ok: true, branch: { id, ...branch } }, { status: 201 });
  } catch (err) {
    if (/unique/i.test(err.message)) return errorResponse('A branch with this name already exists.', 409, { name: 'Branch name must be unique.' });
    return errorResponse(err.message, 500);
  }
}
