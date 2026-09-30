// Module 4 — audit trail, shared by both apps.
//
// An append-only log of who did what: every key action on requests, bookings,
// caregivers and payments writes one entry here. There is deliberately no
// update or delete — entries are read-only once written.
//
// Tamper-evidence: each entry stores the hash of the entry before it and a hash
// of its own contents, so changing or removing any entry breaks the chain from
// that point on, and verifyAuditLog() reports where. Like the other stores this
// sits on localStorage for the prototype; in production the same chain belongs
// server-side (D1, with SHA-256 and no UPDATE/DELETE grants) so a browser can
// never rewrite it.

export const AUDIT_KEY = 'mycare.auditLog';

/** Action types, grouped by what they touch. `label` is what the log shows. */
export const AUDIT_ACTIONS = {
  'request.received': { label: 'Request received', record: 'Request' },
  'request.modified': { label: 'Request modified', record: 'Request' },
  'request.status': { label: 'Request status changed', record: 'Request' },
  'booking.created': { label: 'Booking created', record: 'Booking' },
  'booking.modified': { label: 'Booking modified', record: 'Booking' },
  'booking.cancelled': { label: 'Booking cancelled', record: 'Booking' },
  'booking.completed': { label: 'Booking completed', record: 'Booking' },
  'caregiver.onboarded': { label: 'Caregiver onboarded', record: 'Caregiver' },
  'caregiver.approved': { label: 'Caregiver approved', record: 'Caregiver' },
  'caregiver.rejected': { label: 'Caregiver returned / rejected', record: 'Caregiver' },
  'caregiver.deactivated': { label: 'Caregiver deactivated / suspended', record: 'Caregiver' },
  'caregiver.reactivated': { label: 'Caregiver reactivated', record: 'Caregiver' },
  'caregiver.profile': { label: 'Caregiver profile change reviewed', record: 'Caregiver' },
  'caregiver.availability': { label: 'Caregiver availability changed', record: 'Caregiver' },
  'payment.status': { label: 'Payment status changed', record: 'Booking' },
  'data.exported': { label: 'Data exported', record: 'Report' },
};

export const actionLabel = (action) => AUDIT_ACTIONS[action]?.label || action;

const FIELD_LABELS = {
  status: 'Status', statusReason: 'Status reason', startTime: 'Start time', endTime: 'End time', durationMins: 'Duration (mins)',
  price: 'Price (RM)', caregiverName: 'Caregiver', date: 'Date', area: 'Area', location: 'Location', preferredDate: 'Preferred date',
  preferredStart: 'Preferred start', preferredEnd: 'Preferred end', receiptStatus: 'Receipt', payoutStatus: 'Caregiver payout',
  reviewNote: 'Review note', careType: 'Care type', patientName: 'Patient', preferredGender: 'Preferred gender', notes: 'Notes', phone: 'Phone',
};

/** A stored field key as a readable label: known names mapped, the rest split from camelCase. */
export const fieldName = (field) => FIELD_LABELS[field] || String(field).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

const SYSTEM_ACTOR = { name: 'System', email: '', role: 'System' };
let currentActor = SYSTEM_ACTOR;
let muted = 0;

/** Who the entries written from this tab are attributed to (set on sign-in). */
export function setAuditActor(actor) {
  currentActor = actor ? { name: actor.name || 'Unknown', email: actor.email || '', role: actor.role || '' } : SYSTEM_ACTOR;
}

export const getAuditActor = () => currentActor;

/**
 * Runs `fn` without logging. Only for demo seeding, which replays store calls
 * to build sample data — those are not real actions by anyone.
 */
export function withoutAudit(fn) {
  muted += 1;
  try { return fn(); } finally { muted -= 1; }
}

/* Hashing ------------------------------------------------------------------ */

// cyrb53: a fast, synchronous 53-bit hash. Enough to make casual edits to the
// stored log detectable in the prototype; the server-side version uses SHA-256.
function hash(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

const GENESIS = '0'.repeat(14);

// Everything except the hash itself, in a fixed key order.
const contentOf = (entry) => JSON.stringify([entry.seq, entry.id, entry.at, entry.actor, entry.action, entry.recordType, entry.recordId, entry.summary, entry.changes, entry.prevHash]);

/* Storage ------------------------------------------------------------------ */

function readLog() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUDIT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* Writing ------------------------------------------------------------------ */

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Before/after pairs for the fields that actually changed. `fields` limits the
 * comparison (and sets its order); without it every key on either side counts.
 */
export function diff(before = {}, after = {}, fields) {
  const keys = fields || [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  return keys
    .filter((field) => !same(before?.[field], after?.[field]))
    .map((field) => ({ field, before: before?.[field] ?? null, after: after?.[field] ?? null }));
}

/**
 * Appends one entry. `action` is a key of AUDIT_ACTIONS; `recordId` is the
 * patient request, booking or caregiver the action touched; `changes` is an
 * array of { field, before, after } (see diff()). Returns the entry.
 */
export function logAudit({ action, recordType, recordId, summary = '', changes = [], actor, at } = {}) {
  if (muted || typeof window === 'undefined') return null;
  const log = readLog();
  const last = log[log.length - 1];
  const seq = (last?.seq || 0) + 1;
  const entry = {
    seq,
    id: `AUD-${String(seq).padStart(6, '0')}`,
    at: at || new Date().toISOString(),
    actor: actor || currentActor,
    action,
    recordType: recordType || AUDIT_ACTIONS[action]?.record || 'Record',
    recordId: String(recordId || '—'),
    summary,
    changes,
    prevHash: last?.hash || GENESIS,
  };
  entry.hash = hash(contentOf(entry));
  log.push(entry);
  try {
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
  } catch {
    // Storage full or blocked: the action itself still went through.
  }
  return entry;
}

/* Reading ------------------------------------------------------------------ */

/** Newest first. Returns copies, so callers cannot mutate the stored log. */
export function listAuditLog() {
  return readLog().slice().reverse().map((entry) => ({ ...entry }));
}

/**
 * Walks the chain from the first entry. `ok` is false when any entry's content
 * no longer matches its hash, or its link to the previous entry is broken
 * (an entry edited, removed or reordered). `brokenAt` is that entry's id.
 */
export function verifyAuditLog() {
  const log = readLog();
  let prev = GENESIS;
  for (let i = 0; i < log.length; i += 1) {
    const entry = log[i];
    if (entry.prevHash !== prev || entry.hash !== hash(contentOf(entry)) || entry.seq !== i + 1) {
      return { ok: false, count: log.length, brokenAt: entry.id || `#${i + 1}` };
    }
    prev = entry.hash;
  }
  return { ok: true, count: log.length, brokenAt: null };
}

/** Filters for the audit page: date range (YYYY-MM-DD, inclusive), actor, action, record text. */
export function filterAuditLog(entries, { from, to, actor, action, record } = {}) {
  const needle = String(record || '').trim().toLowerCase();
  return entries.filter((entry) => {
    const day = entry.at.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (actor && entry.actor?.name !== actor) return false;
    if (action && entry.action !== action) return false;
    if (needle && !`${entry.recordId} ${entry.recordType} ${entry.summary}`.toLowerCase().includes(needle)) return false;
    return true;
  });
}

/** A value as readable text: lists joined, objects as JSON, empty as ''. */
export const plainValue = (value) => (value === null || value === undefined ? '' : Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value));

const csvCell = (value) => {
  const text = plainValue(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** One row per entry, before/after flattened; includes the hashes so an export can be re-verified. */
export function auditLogToCsv(entries) {
  const header = ['Entry', 'Timestamp', 'Actor', 'Actor email', 'Role', 'Action', 'Record type', 'Record ID', 'Summary', 'Before', 'After', 'Previous hash', 'Hash'];
  const rows = entries.map((entry) => [
    entry.id, entry.at, entry.actor?.name, entry.actor?.email, entry.actor?.role, actionLabel(entry.action), entry.recordType, entry.recordId, entry.summary,
    entry.changes.map((change) => `${fieldName(change.field)}: ${plainValue(change.before) || '—'}`).join(' | '),
    entry.changes.map((change) => `${fieldName(change.field)}: ${plainValue(change.after) || '—'}`).join(' | '),
    entry.prevHash, entry.hash,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
