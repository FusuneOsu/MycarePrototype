// Pure aggregation and formatting functions for the Admin Dashboard.
// These work on raw booking/caregiver/request arrays, so they can be used
// both client-side (fallback from localStorage) and server-side (D1 queries).

/* Date helpers ------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD for `offset` days from today. */
export function localDate(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** True when `isoDate` falls within the given named range from `today`. */
export function inRange(isoDate, range, today) {
  if (!isoDate) return false;
  const t = today || localDate();
  const d = String(isoDate).slice(0, 10);
  if (range === 'Today') return d === t;
  if (range === 'This week') {
    const start = new Date(`${t}T00:00:00`);
    const day = start.getDay();
    const mon = new Date(start);
    mon.setDate(start.getDate() - ((day + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return d >= dateStr(mon) && d <= dateStr(sun);
  }
  if (range === 'This month') return d.slice(0, 7) === t.slice(0, 7);
  return true;
}

const dateStr = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/* Status grouping --------------------------------------------------------- */

const UPCOMING_STATUSES = ['Caregiver assigned'];
const IN_PROGRESS_STATUSES = ['In progress'];
const COMPLETED_STATUSES = ['Service completed'];
const CANCELLED_STATUSES = ['Cancelled', 'Missed'];
const PAID_STATUSES = ['Paid - Online', 'Paid - Collected Directly'];
const UNPAID_STATUSES = ['Link sent (Unpaid)', 'Service completed'];
const PAYMENT_RELEVANT = [...PAID_STATUSES, ...UNPAID_STATUSES, 'Payment pending'];

/* Bookings aggregation ---------------------------------------------------- */

export function aggregateBookings(bookings, range) {
  const filtered = range ? bookings.filter((b) => inRange(b.date, range)) : bookings;
  const byStatus = {};
  let upcoming = 0; let inProgress = 0; let completed = 0; let cancelled = 0;

  filtered.forEach((b) => {
    const s = b.status;
    byStatus[s] = (byStatus[s] || 0) + 1;
    if (UPCOMING_STATUSES.includes(s)) upcoming += 1;
    else if (IN_PROGRESS_STATUSES.includes(s)) inProgress += 1;
    else if (COMPLETED_STATUSES.includes(s)) completed += 1;
    else if (CANCELLED_STATUSES.includes(s)) cancelled += 1;
  });

  return { total: filtered.length, upcoming, inProgress, completed, cancelled, byStatus };
}

/* Revenue aggregation ----------------------------------------------------- */

/**
 * Try to parse a cost_breakdown from a booking row.
 * Accepts JSON string or already-parsed object.
 */
function parseBreakdown(booking) {
  if (!booking) return null;
  const raw = booking.cost_breakdown || booking.costBreakdown;
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

export function aggregateRevenue(bookings, range) {
  const filtered = range
    ? bookings.filter((b) => PAYMENT_RELEVANT.includes(b.status) && inRange(b.date, range))
    : bookings.filter((b) => PAYMENT_RELEVANT.includes(b.status));

  let paidCents = 0; let unpaidCents = 0;
  let travelPaid = 0; let travelUnpaid = 0;
  let sitePaid = 0; let siteUnpaid = 0;
  const byServiceType = {};
  const byCaregiver = {};

  filtered.forEach((b) => {
    const isPaid = PAID_STATUSES.includes(b.status);
    const breakdown = parseBreakdown(b);

    let cents;
    let travelCents = 0;
    let siteCents = 0;

    if (breakdown) {
      cents = Math.round((breakdown.total || 0) * 100);
      travelCents = Math.round((breakdown.travelCost?.subtotal || 0) * 100);
      siteCents = Math.round((breakdown.siteFee?.subtotal || 0) * 100);
    } else {
      cents = b.rate_cents || 0;
    }

    if (isPaid) {
      paidCents += cents;
      travelPaid += travelCents;
      sitePaid += siteCents;
    } else {
      unpaidCents += cents;
      travelUnpaid += travelCents;
      siteUnpaid += siteCents;
    }

    const st = b.service_type || 'Other';
    if (!byServiceType[st]) byServiceType[st] = { service: st, paidCents: 0, unpaidCents: 0, count: 0 };
    if (isPaid) byServiceType[st].paidCents += cents;
    else byServiceType[st].unpaidCents += cents;
    byServiceType[st].count += 1;

    const cn = b.caregiver_name || 'Unassigned';
    if (!byCaregiver[cn]) byCaregiver[cn] = { name: cn, paidCents: 0, unpaidCents: 0, count: 0 };
    if (isPaid) byCaregiver[cn].paidCents += cents;
    else byCaregiver[cn].unpaidCents += cents;
    byCaregiver[cn].count += 1;
  });

  return {
    paid: fmtMoney(paidCents), unpaid: fmtMoney(unpaidCents), paidCents, unpaidCents,
    travelPaid: fmtMoney(travelPaid), travelUnpaid: fmtMoney(travelUnpaid),
    sitePaid: fmtMoney(sitePaid), siteUnpaid: fmtMoney(siteUnpaid),
    byServiceType: Object.values(byServiceType),
    byCaregiver: Object.values(byCaregiver),
  };
}

/* Caregiver availability -------------------------------------------------- */

export function aggregateCaregiverAvailability(caregivers, filters = {}) {
  let list = [...caregivers];

  if (filters.location) {
    list = list.filter((c) =>
      String(c.center || '').toLowerCase().includes(filters.location.toLowerCase())
    );
  }
  if (filters.gender) {
    list = list.filter((c) => c.gender === filters.gender);
  }
  if (filters.skill) {
    list = list.filter((c) =>
      (c.skills || []).some((s) =>
        String(s).toLowerCase().includes(filters.skill.toLowerCase())
      )
    );
  }

  const free = list.filter((c) => c.availability === 'Available').length;
  const assigned = list.filter((c) => c.availability === 'On Duty').length;
  const inactive = list.filter((c) =>
    ['Off Duty', 'On Leave', 'Suspended', 'Deactivated'].includes(c.availability)
  ).length;

  const total = list.length;
  return {
    total, free, assigned, inactive,
    freePercent: total ? Math.round((free / total) * 100) : 0,
    assignedPercent: total ? Math.round((assigned / total) * 100) : 0,
    inactivePercent: total ? Math.round((inactive / total) * 100) : 0,
  };
}

/* Onboarding pipeline ----------------------------------------------------- */

export function aggregateOnboarding(applications, requests) {
  const PENDING_STATUSES = ['Submitted', 'Under review', 'More info needed'];
  const pending = applications.filter((a) => PENDING_STATUSES.includes(a.status)).length;

  let whatsapp = 0; let website = 0;
  (requests || []).forEach((r) => {
    const src = String(r.source || '').toLowerCase();
    if (src.includes('whatsapp')) whatsapp += 1;
    else if (src.includes('website') || src.includes('web')) website += 1;
  });

  return { pendingApplications: pending, whatsappRequests: whatsapp, websiteRequests: website };
}

/* Trend series ------------------------------------------------------------ */

export function buildTrendSeries(bookings, days = 7) {
  const series = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateStr(d);
    const label = d.toLocaleDateString('en', { weekday: 'short' });
    const dayBookings = bookings.filter((b) => String(b.date).slice(0, 10) === key);
    series.push({
      date: key, label, total: dayBookings.length,
      paid: dayBookings.filter((b) => PAID_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rate_cents || 0), 0),
      unpaid: dayBookings.filter((b) => UNPAID_STATUSES.includes(b.status))
        .reduce((sum, b) => sum + (b.rate_cents || 0), 0),
    });
  }
  return series;
}

/* Formatting -------------------------------------------------------------- */

export const fmtMoney = (cents) => `RM ${(cents / 100).toFixed(2)}`;
export const fmtCents = (cents) => (cents / 100).toFixed(2);

/* Export CSV builder ------------------------------------------------------ */

export function buildExportCsv({ bookings, caregivers, applications, requests }, range) {
  const bAgg = aggregateBookings(bookings, range);
  const rAgg = aggregateRevenue(bookings, range);
  const cAgg = aggregateCaregiverAvailability(caregivers);
  const oAgg = aggregateOnboarding(applications, requests);

  const rows = [
    ['My CareGivers — Dashboard Report'],
    [`Generated: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`],
    [`Period: ${range}`], [],
    ['--- BOOKINGS OVERVIEW ---'],
    ['Total', String(bAgg.total)],
    ['Upcoming', String(bAgg.upcoming)],
    ['In Progress', String(bAgg.inProgress)],
    ['Completed', String(bAgg.completed)],
    ['Cancelled', String(bAgg.cancelled)], [],
    ['--- REVENUE OVERVIEW ---'],
    ['Collected', rAgg.paid],
    ['Outstanding', rAgg.unpaid], [],
    ['--- REVENUE BY SERVICE TYPE ---'],
    ['Service Type', 'Collected (RM)', 'Outstanding (RM)', 'Bookings'],
    ...rAgg.byServiceType.map((s) => [s.service, fmtCents(s.paidCents), fmtCents(s.unpaidCents), String(s.count)]), [],
    ['--- CAREGIVER AVAILABILITY ---'],
    ['Free', String(cAgg.free)],
    ['Assigned', String(cAgg.assigned)],
    ['Inactive', String(cAgg.inactive)], [],
    ['--- ONBOARDING PIPELINE ---'],
    ['Pending Applications', String(oAgg.pendingApplications)],
    ['WhatsApp Requests', String(oAgg.whatsappRequests)],
    ['Website Requests', String(oAgg.websiteRequests)],
  ];
  return rows;
}

