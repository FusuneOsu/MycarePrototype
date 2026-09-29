import { Fragment, useEffect, useMemo, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import { Button, CellStack, Icon, Input, Pill, Select, Table, Toolbar } from '../../../../shared/ui/index.js';
import {
  AUDIT_ACTIONS, AUDIT_KEY, actionLabel, auditLogToCsv, fieldName, filterAuditLog, listAuditLog, logAudit, plainValue, verifyAuditLog,
} from '../../../../shared/auditStore.js';
import { downloadText, fileDate } from '../../utils/download.js';
import './AuditTrailPage.css';

const PAGE_SIZE = 50;
const NO_FILTERS = { from: '', to: '', actor: '', action: '', record: '' };

/** Pill colour by what the action did. */
const toneOf = (action) => {
  if (['booking.cancelled', 'caregiver.rejected', 'caregiver.deactivated'].includes(action)) return 'danger';
  if (['booking.created', 'booking.completed', 'caregiver.approved', 'caregiver.onboarded', 'caregiver.reactivated', 'request.received'].includes(action)) return 'success';
  if (action === 'payment.status') return 'info';
  if (action === 'data.exported') return 'neutral';
  return 'warning';
};

const stamp = (iso) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

const shown = (value) => plainValue(value) || '—';

/**
 * Module 4 — the audit trail. Read-only by design: there is no control here
 * (or anywhere in the store) to edit or remove an entry. Management can search
 * it and export it for compliance; the export itself is logged.
 */
function AuditTrailPage() {
  const [entries, setEntries] = useState(listAuditLog);
  const [integrity, setIntegrity] = useState(verifyAuditLog);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [open, setOpen] = useState(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const reload = () => { setEntries(listAuditLog()); setIntegrity(verifyAuditLog()); };

  // Entries written in another tab (e.g. the caregiver app) show up live.
  useEffect(() => {
    const onStorage = (event) => { if (!event.key || event.key === AUDIT_KEY) reload(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const actors = useMemo(() => [...new Set(entries.map((entry) => entry.actor?.name).filter(Boolean))].sort(), [entries]);
  const filtered = useMemo(() => filterAuditLog(entries, filters), [entries, filters]);
  const filtering = Object.values(filters).some(Boolean);

  const setFilter = (field) => (event) => { setFilters((prev) => ({ ...prev, [field]: event.target.value })); setLimit(PAGE_SIZE); };

  const exportCsv = () => {
    const filename = `audit-log-${fileDate()}.csv`;
    downloadText(filename, auditLogToCsv(filtered));
    const scope = filtering ? `filtered: ${Object.entries(filters).filter(([, value]) => value).map(([key, value]) => `${key}=${key === 'action' ? actionLabel(value) : value}`).join(', ')}` : 'full log';
    logAudit({ action: 'data.exported', recordType: 'Report', recordId: 'Audit log', summary: `${filtered.length} audit entries exported as ${filename} (${scope})` });
    reload();
  };

  return (
    <div className="audit-page">
      <Topbar
        title="Audit Trail"
        subtitle="Who did what, and when — for accountability and dispute resolution."
        actions={<Button size="sm" onClick={exportCsv} disabled={!filtered.length}><Icon name="download" size={15} />Export CSV</Button>}
      />

      <div className={integrity.ok ? 'audit-integrity' : 'audit-integrity audit-integrity--broken'} role="status">
        <Icon name="shield" size={22} />
        <div>
          <strong>{integrity.ok ? 'Log intact' : 'Integrity check failed'}</strong>
          <p>
            {integrity.ok
              ? `All ${integrity.count} entr${integrity.count === 1 ? 'y' : 'ies'} verified against the hash chain — nothing has been edited, removed or reordered.`
              : `Entry ${integrity.brokenAt} does not match the hash chain. It, or an entry before it, was altered or removed outside the app. Everything from that point on should be treated as unverified.`}
            {' '}Entries are read-only and cannot be edited or deleted.
          </p>
        </div>
        <button type="button" className="audit-integrity__recheck" onClick={reload}>Re-check</button>
      </div>

      <Toolbar className="audit-filters">
        <label className="audit-filters__date"><span>From</span><Input size="sm" type="date" value={filters.from} max={filters.to || undefined} onChange={setFilter('from')} /></label>
        <label className="audit-filters__date"><span>To</span><Input size="sm" type="date" value={filters.to} min={filters.from || undefined} onChange={setFilter('to')} /></label>
        <Select size="sm" value={filters.actor} onChange={setFilter('actor')} aria-label="Filter by actor">
          <option value="">All actors</option>
          {actors.map((name) => <option key={name} value={name}>{name}</option>)}
        </Select>
        <Select size="sm" value={filters.action} onChange={setFilter('action')} aria-label="Filter by action type">
          <option value="">All action types</option>
          {Object.entries(AUDIT_ACTIONS).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
        </Select>
        <Input size="sm" type="search" placeholder="Record ID, patient, caregiver…" value={filters.record} onChange={setFilter('record')} aria-label="Filter by record" />
        {filtering && <Button size="sm" variant="link" onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button>}
      </Toolbar>

      <p className="audit-count">
        {filtering ? `${filtered.length} of ${entries.length} entries match` : `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`}, newest first
      </p>

      <Table
        raised
        label="Audit log"
        columns={['When', 'Actor', 'Action', 'Record', 'Details', '']}
        empty={filtered.length === 0 && (entries.length === 0
          ? 'No activity recorded yet. Key actions — requests, bookings, caregiver approvals, payments and exports — are logged here as they happen.'
          : 'No entries match these filters.')}
      >
        {filtered.slice(0, limit).map((entry) => {
          const { date, time } = stamp(entry.at);
          const expanded = open === entry.id;
          const hasChanges = entry.changes?.length > 0;
          return (
            <Fragment key={entry.id}>
              <tr className={expanded ? 'audit-row audit-row--open' : 'audit-row'} onClick={() => setOpen(expanded ? null : entry.id)}>
                <td><CellStack primary={date} secondary={time} /></td>
                <td><CellStack primary={entry.actor?.name || '—'} secondary={entry.actor?.role} /></td>
                <td><Pill tone={toneOf(entry.action)}>{actionLabel(entry.action)}</Pill></td>
                <td><CellStack primary={entry.recordId} secondary={entry.recordType} /></td>
                <td className="audit-row__summary">{entry.summary || '—'}</td>
                <td className="ui-table__actions">
                  <button type="button" className="audit-row__toggle" aria-expanded={expanded} aria-label={expanded ? 'Hide details' : 'Show details'} onClick={(event) => { event.stopPropagation(); setOpen(expanded ? null : entry.id); }}>
                    <Icon name={expanded ? 'chevronLeft' : 'chevronRight'} size={16} className={expanded ? 'audit-row__chevron--open' : ''} />
                  </button>
                </td>
              </tr>
              {expanded && (
                <tr className="audit-detail">
                  <td colSpan={6}>
                    {hasChanges ? (
                      <table className="audit-changes">
                        <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
                        <tbody>
                          {entry.changes.map((change) => (
                            <tr key={change.field}>
                              <td>{fieldName(change.field)}</td>
                              <td className="audit-changes__before">{shown(change.before)}</td>
                              <td className="audit-changes__after">{shown(change.after)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <p className="audit-detail__none">No field values changed by this action.</p>}
                    <dl className="audit-meta">
                      <div><dt>Entry</dt><dd>{entry.id}</dd></div>
                      <div><dt>Timestamp</dt><dd>{entry.at}</dd></div>
                      <div><dt>Actor email</dt><dd>{entry.actor?.email || '—'}</dd></div>
                      <div><dt>Hash</dt><dd><code>{entry.hash}</code></dd></div>
                      <div><dt>Previous hash</dt><dd><code>{entry.prevHash}</code></dd></div>
                    </dl>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </Table>

      {filtered.length > limit && (
        <div className="audit-more"><Button size="sm" onClick={() => setLimit((value) => value + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, filtered.length - limit)} more</Button></div>
      )}
    </div>
  );
}

export default AuditTrailPage;
