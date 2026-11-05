import { makeBranchAudit } from '../_shared/branchUtils.js';
import { normalizePriceTemplateItems, parsePriceSlateItems } from '../_shared/priceSlateUtils.js';

function errorResponse(message, status, fields) {
  return Response.json({ ok: false, error: message, ...(fields ? { fields } : {}) }, { status });
}

function responseFor(row) {
  return row ? {
    id: row.id,
    name: row.name,
    items: parsePriceSlateItems(row.items),
    created_at: row.created_at,
    updated_at: row.updated_at,
  } : null;
}

async function makeAudit(db, action, id, summary, changes) {
  const previous = await db.prepare('SELECT hash FROM audit_logs ORDER BY at DESC, id DESC LIMIT 1').first();
  return makeBranchAudit({ action, recordId: id, summary, changes, previousHash: previous?.hash || null });
}

function auditStatement(db, audit) {
  return db.prepare(
    `INSERT INTO audit_logs
       (id, at, actor_name, actor_role, action, record_type, record_id, summary, changes, previous_hash, hash)
     VALUES (?, ?, 'System', 'system', ?, 'Price Slate Template', ?, ?, ?, ?, ?)`
  ).bind(
    audit.id, audit.at, audit.action, audit.recordId, audit.summary,
    JSON.stringify(audit.changes), audit.previousHash, audit.hash
  );
}

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, name, items, created_at, updated_at FROM price_slate_templates ORDER BY name COLLATE NOCASE'
    ).all();
    return Response.json(results.map(responseFor));
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return errorResponse('Request body must be valid JSON.', 400); }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const fields = {};
  if (!name) fields.name = 'Template name is required.';
  else if (name.length > 120) fields.name = 'Template name must be 120 characters or fewer.';
  const normalized = normalizePriceTemplateItems(body?.items);
  if (!normalized.ok) Object.assign(fields, normalized.fields);
  if (Object.keys(fields).length) return errorResponse('Validation failed.', 400, fields);

  const db = env.DB;
  const id = `PST-${crypto.randomUUID()}`;
  const template = { id, name, items: normalized.items };
  try {
    const duplicate = await db.prepare('SELECT id FROM price_slate_templates WHERE LOWER(name) = LOWER(?)').bind(name).first();
    if (duplicate) return errorResponse('A template with this name already exists.', 409, { name: 'Template name must be unique.' });

    const audit = await makeAudit(db, 'price_template.created', id, `Created price template ${name}`, [
      { field: 'template', before: null, after: template },
    ]);
    await db.batch([
      db.prepare('INSERT INTO price_slate_templates (id, name, items) VALUES (?, ?, ?)')
        .bind(id, name, JSON.stringify(normalized.items)),
      auditStatement(db, audit),
    ]);
    return Response.json({ ok: true, template }, { status: 201 });
  } catch (err) {
    if (/unique/i.test(err.message)) return errorResponse('A template with this name already exists.', 409, { name: 'Template name must be unique.' });
    return errorResponse(err.message, 500);
  }
}
