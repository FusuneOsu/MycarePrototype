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
  doc.text(`Service location: ${booking.location}`, margin, y);
  y += 32;

  doc.setFontSize(12);
  doc.text('Service summary', margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.text(`Service type: ${booking.service_type}`, margin, y);
  y += 16;
  doc.text(`Caregiver: ${booking.caregiver_name}`, margin, y);
  y += 16;
  doc.text(`Date/time: ${formatDateTime(booking.scheduled_at)}`, margin, y);
  y += 16;
  doc.text(`Duration: ${booking.duration_mins} min`, margin, y);
  y += 32;

  doc.setFontSize(12);
  doc.text('Amount due', margin, y);
  y += 20;
  doc.setFontSize(16);
  doc.text(formatMoney(booking.rate_cents), margin, y);
  y += 32;

  doc.setFontSize(9);
  doc.text('This is a demo invoice generated for prototype purposes.', margin, y);

  return doc.output('datauristring');
}
