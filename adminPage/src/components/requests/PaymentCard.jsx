import { useState } from 'react';
import StatusPill from '../caregivers/StatusPill/StatusPill.jsx';
import { logAudit } from '../../../../shared/auditStore.js';
import { updateBookingPayment, formatMoney } from '../../../../shared/bookingStore.js';
import { Button, Card, SectionHeader } from '../../../../shared/ui/index.js';

/**
 * Payment card — payment link creation, receipt verification, caregiver payout.
 *
 * Props:
 *   booking   — booking object from bookingStore
 *   onChanged — callback after any mutation
 */
export default function PaymentCard({ booking, onChanged }) {
  const [message, setMessage] = useState('');

  const createPaymentLink = async () => {
    setMessage('Creating secure payment link...');
    try {
      const response = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: booking.requestId,
          bookingId: booking.id,
          amountCents: Math.round(booking.price * 100),
          currency: 'myr',
          description: `${booking.serviceType} for ${booking.patientName}`,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Payment link could not be created.');
      logAudit({
        action: 'payment.status',
        recordType: 'Booking',
        recordId: booking.id,
        summary: `Payment link created for ${booking.patientName} — ${formatMoney(booking.price)}${result.demo ? ' (demo mode)' : ''}`,
      });
      if (result.demo) {
        setMessage('Demo mode: add STRIPE_SECRET_KEY to create a real Stripe test link.');
        return;
      }
      setMessage('Payment link created.');
      window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <Card padded>
      <SectionHeader eyebrow="Payment" title="Service payment" />
      <div className="payment-amount"><span>Patient pays</span><strong>{formatMoney(booking.price)}</strong></div>
      <div className="payment-row"><span>Receipt</span><StatusPill status={booking.receiptStatus} /></div>
      <div className="payment-row"><span>Caregiver payout · {formatMoney(booking.caregiverPayout)}</span><StatusPill status={booking.payoutStatus} /></div>
      <div className="payment-actions">
        <Button block onClick={createPaymentLink}>Create patient payment link</Button>
        {message && <p className="finder-hint">{message}</p>}
        <Button block disabled={booking.receiptStatus === 'Receipt verified'}
          onClick={() => { updateBookingPayment(booking.id, { receiptStatus: 'Receipt verified' }); onChanged(); }}>
          Mark receipt verified
        </Button>
        <Button variant="primary" block
          disabled={booking.receiptStatus !== 'Receipt verified' || booking.payoutStatus === 'Paid to caregiver'}
          onClick={() => { updateBookingPayment(booking.id, { payoutStatus: 'Paid to caregiver' }); onChanged(); }}>
          {booking.payoutStatus === 'Paid to caregiver' ? 'Caregiver paid' : 'Release caregiver payment'}
        </Button>
      </div>
    </Card>
  );
}
