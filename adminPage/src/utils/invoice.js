// Builds a one-page invoice PDF for a booking, entirely client-side.
// Used when an admin/caregiver generates a payment link for a
// "Service completed" booking (Module 8 — Payment).
import { jsPDF } from 'jspdf';
import { rateCentsToCents } from '../../../shared/pricing.js';

function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMoney(cents) {
  return `RM ${(cents / 100).toFixed(2)}`;
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

  // Patient-facing price only. Never print caregiver payout components.
  const breakdown = parseCostBreakdown(booking);
  if (breakdown?.version === 'slate-v1' && Array.isArray(breakdown.items)) {
    doc.setFontSize(12);
    doc.text('Price breakdown', margin, y);
    y += 18;
    doc.setFontSize(10);
    const right = doc.internal.pageSize.width - margin;
    breakdown.items.forEach((item) => {
      const label = doc.splitTextToSize(String(item.label || 'Item'), right - margin - 110);
      const note = item.note ? doc.splitTextToSize(String(item.note), right - margin - 110) : [];
      const height = label.length * 13 + note.length * 10 + 6;
      if (y + height > doc.internal.pageSize.height - margin) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      if (note.length) {
        doc.setFontSize(8);
        doc.setTextColor(105, 115, 111);
        doc.text(note, margin, y + label.length * 13);
        doc.setTextColor(20, 30, 28);
        doc.setFontSize(10);
      }
      doc.text(formatMoney(item.amount_cents), right, y, { align: 'right' });
      y += height;
    });

    y += 10;
    if (y + 28 > doc.internal.pageSize.height - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(14);
    doc.text('Total due', margin, y);
    const totalCents = Number.isSafeInteger(Number(breakdown.total_cents))
      ? Number(breakdown.total_cents)
      : Math.round(Number(breakdown.total || 0) * 100);
    doc.text(formatMoney(totalCents), right, y, { align: 'right' });
  } else {
    // Old cost breakdowns included payout amounts and are not reused as
    // patient-facing prices. Use the booking rate fallback until a slate exists.
    doc.setFontSize(12);
    doc.text('Amount due', margin, y);
    y += 20;
    doc.setFontSize(16);
    doc.text(formatMoney(rateCentsToCents(booking.rate_cents)), margin, y);
  }

  y += 32;
  doc.setFontSize(9);
  doc.text('This is a demo invoice generated for prototype purposes.', margin, y);

  return doc.output('datauristring');
}
