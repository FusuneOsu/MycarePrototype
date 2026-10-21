// Builds a one-page invoice PDF for a booking, entirely client-side.
// Used when an admin/caregiver generates a payment link for a
// "Service completed" booking (Module 8 — Payment).
import { jsPDF } from 'jspdf';

function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMoney(cents) {
  return `RM ${(cents / 100).toFixed(2)}`;
}

/** Format a raw RM amount (not in cents). */
function fmtRm(amount) {
  return `RM ${Number(amount || 0).toFixed(2)}`;
}

/**
 * Try to parse cost_breakdown from a booking.
 * Accepts both a string (JSON) and an already-parsed object.
 */
function parseCostBreakdown(booking) {
  if (!booking) return null;
  const raw = booking.cost_breakdown || booking.costBreakdown;
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Returns a data: URL (application/pdf) invoice for the given booking row. */
export function buildInvoicePdf(booking) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = margin;

  doc.setFontSize(18);
  doc.text('myCare — Invoice', margin, y);
  y += 28;

  doc.setFontSize(10);
  doc.text(`Invoice for booking ${booking.id}`, margin, y);
  y += 16;
  doc.text(`Issued ${formatDateTime(new Date().toISOString())}`, margin, y);
  y += 32;

  doc.setFontSize(12);
  doc.text('Patient details', margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.text(`Name: ${booking.patient_name}`, margin, y);
  y += 16;
  doc.text(`Service location: ${booking.location || booking.address || ''}`, margin, y);
  y += 32;

  doc.setFontSize(12);
  doc.text('Service summary', margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.text(`Service type: ${booking.service_type}`, margin, y);
  y += 16;
  doc.text(`Caregiver: ${booking.caregiver_name}`, margin, y);
  y += 16;
  doc.text(`Date/time: ${formatDateTime(`${booking.date}T${booking.start_time}`)}`, margin, y);
  y += 16;
  doc.text(`Duration: ${booking.duration_mins} min`, margin, y);
  y += 24;

  // Cost breakdown section
  const breakdown = parseCostBreakdown(booking);
  if (breakdown) {
    doc.setFontSize(12);
    doc.text('Cost breakdown', margin, y);
    y += 18;
    doc.setFontSize(10);

    const items = [
      { label: 'Service fee', value: fmtRm(breakdown.serviceFee?.subtotal) },
    ];
    if (breakdown.travelCost?.subtotal > 0) {
      items.push({ label: 'Travel cost', value: fmtRm(breakdown.travelCost.subtotal) });
    }
    if (breakdown.siteFee?.subtotal > 0) {
      items.push({ label: 'Site fee', value: fmtRm(breakdown.siteFee.subtotal) });
    }
    items.push({ label: 'Caregiver payout', value: fmtRm(breakdown.caregiverPayout?.subtotal) });

    items.forEach((item) => {
      doc.text(item.label, margin, y);
      doc.text(item.value, doc.internal.pageSize.width - margin, y, { align: 'right' });
      y += 16;
    });

    y += 8;
    doc.setFontSize(14);
    doc.text('Total due', margin, y);
    doc.text(fmtRm(breakdown.total), doc.internal.pageSize.width - margin, y, { align: 'right' });
  } else {
    // Fallback to flat rate
    doc.setFontSize(12);
    doc.text('Amount due', margin, y);
    y += 20;
    doc.setFontSize(16);
    doc.text(formatMoney(booking.rate_cents), margin, y);
  }

  y += 32;
  doc.setFontSize(9);
  doc.text('This is a demo invoice generated for prototype purposes.', margin, y);

  return doc.output('datauristring');
}
