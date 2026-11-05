import { makeBranchAudit } from '../../_shared/branchUtils.js';
import { parsePriceSlateItems } from '../../_shared/priceSlateUtils.js';

function errorResponse(message, status) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function onRequestDelete({ env, params }) {
  const db = env.DB;
  try {
    const before = await db.prepare(
      'SELECT id, name, items, created_at, updated_at FROM price_slate_templates WHERE id = ?'
    ).bind(params.id).first();
    if (!before) return errorResponse('Price template not found.', 404);

    const previous = await db.prepare('SELECT hash FROM audit_logs ORDER BY at DESC, id DESC LIMIT 1').first();
    const audit = await makeBranchAudit({
      action: 'price_template.deleted',
      recordId: params.id,
      summary: `Deleted price template ${before.name}`,
      changes: [{
        field: 'template',
        before: { ...before, items: parsePriceSlateItems(before.items) },
        after: null,
      }],
      previousHash: previous?.hash || null,
    });

    await db.batch([
      db.prepare('DELETE FROM price_slate_templates WHERE id = ?').bind(params.id),
      db.prepare(
        `INSERT INTO audit_logs
           (id, at, actor_name, actor_role, action, record_type, record_id, summary, changes, previous_hash, hash)
         VALUES (?, ?, 'System', 'system', ?, 'Price Slate Template', ?, ?, ?, ?, ?)`
      ).bind(
        audit.id, audit.at, audit.action, audit.recordId, audit.summary,
        JSON.stringify(audit.changes), audit.previousHash, audit.hash
      ),
    ]);
    return Response.json({ ok: true, id: params.id });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
