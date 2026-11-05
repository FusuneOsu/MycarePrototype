import { jsPDF } from 'jspdf';

const money = (cents) => `RM ${(Number(cents || 0) / 100).toFixed(2)}`;

export function downloadPriceSlateReceipt(booking, slate) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const right = pageWidth - margin;
  const contentWidth = right - margin;
  let y = 52;

  const heading = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('myCare — Service Receipt', margin, y);
    y += 22;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(105, 115, 111);
    doc.text(`Booking ${booking.id} · Issued ${new Date().toLocaleDateString('en-GB')}`, margin, y);
    doc.setTextColor(20, 30, 28);
    y += 28;
  };

  const ensureSpace = (height) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = 52;
    heading();
  };

  heading();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Patient', margin, y);
  doc.text('Service', pageWidth / 2, y);
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(String(booking.patient_name || '—'), margin, y);
  doc.text(String(booking.service_type || 'Care service'), pageWidth / 2, y);
  y += 15;
  doc.text(`Date: ${booking.date || '—'} · ${booking.start_time || ''}`, margin, y);
  y += 15;
  if (booking.location || booking.address) {
    const location = doc.splitTextToSize(`Location: ${booking.location || booking.address}`, contentWidth);
    doc.text(location, margin, y);
    y += location.length * 12;
  }
  y += 14;

  doc.setDrawColor(205, 216, 211);
  doc.line(margin, y, right, y);
  y += 19;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPTION', margin, y);
  doc.text('AMOUNT', right, y, { align: 'right' });
  y += 13;
  doc.line(margin, y, right, y);
  y += 15;

  const items = slate.items || [];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (!items.length) {
    doc.text('No line items', margin, y);
    doc.text(money(0), right, y, { align: 'right' });
    y += 20;
  }
  items.forEach((item) => {
    const labelLines = doc.splitTextToSize(String(item.label || 'Item'), contentWidth - 130);
    const noteLines = item.note ? doc.splitTextToSize(String(item.note), contentWidth - 130) : [];
    const rowHeight = Math.max(18, labelLines.length * 13 + noteLines.length * 11 + 5);
    ensureSpace(rowHeight + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(labelLines, margin, y);
    doc.setFont('helvetica', 'normal');
    if (noteLines.length) {
      doc.setFontSize(8.5);
      doc.setTextColor(100, 110, 106);
      doc.text(noteLines, margin, y + labelLines.length * 13);
      doc.setTextColor(20, 30, 28);
      doc.setFontSize(10);
    }
    doc.text(money(item.amount_cents), right, y, { align: 'right' });
    y += rowHeight;
    doc.setDrawColor(232, 237, 234);
    doc.line(margin, y, right, y);
    y += 12;
  });

  ensureSpace(48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Total due', margin, y + 4);
  doc.text(money(slate.total_cents), right, y + 4, { align: 'right' });
  y += 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(105, 115, 111);
  doc.text('This receipt shows the patient service price only.', margin, Math.min(y + 8, pageHeight - 35));

  const safeName = String(booking.patient_name || 'patient').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '');
  doc.save(`mycare-receipt-${safeName || 'patient'}-${booking.id}.pdf`);
}
