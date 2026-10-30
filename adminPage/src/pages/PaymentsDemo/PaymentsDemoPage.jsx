import { useEffect, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import { Button, Card, CellStack, Pill, SectionHeader, StatCard, StatGrid, Table } from '../../../../shared/ui/index.js';
import './PaymentsDemoPage.css';

export default function PaymentsDemoPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payments')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setPayments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to load payments:', err);
        setPayments([]);
        setLoading(false);
      });
  }, []);

  const verify = (id) => setPayments((items) => items.map((item) => (item.id === id ? { ...item, patientStatus: 'Receipt verified', caregiverStatus: 'Ready to pay' } : item)));
  const payout = (id) => setPayments((items) => items.map((item) => (item.id === id ? { ...item, caregiverStatus: 'Paid to caregiver' } : item)));

  const awaitingReceipts = payments.filter((item) => item.patientStatus === 'Payment link sent').length;
  const readyToPay = payments.filter((item) => item.caregiverStatus === 'Ready to pay').length;
  const completed = payments.filter((item) => item.caregiverStatus === 'Paid to caregiver').length;

  return (
    <div className="payments-demo-page">
      <Topbar title="Payments" subtitle="Review patient payment and caregiver payout records from the database." />

      <StatGrid>
        <StatCard label="Awaiting receipts" value={awaitingReceipts} note="Payment link sent to patient" icon="◌" tone="gold" />
        <StatCard label="Ready to pay caregivers" value={readyToPay} note="Receipt verified" icon="RM" />
        <StatCard label="Completed payouts" value={completed} note="Paid to caregiver" icon="✓" />
      </StatGrid>

      <Card padded>
        <SectionHeader
          eyebrow="Payment gateway"
          title="Payment operations"
          intro="Review receipts, verify patient payments, and release caregiver payouts."
          actions={<Pill tone="success">Live Database</Pill>}
        />

        <Table columns={['Payment', 'Patient', 'Amount', 'Patient status', 'Caregiver payout', '']} label="Payments">
          {payments.length === 0 && !loading && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-ink-faint)' }}>
                No payment records in the database yet.
              </td>
            </tr>
          )}
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td><CellStack primary={payment.id} secondary={payment.date} /></td>
              <td><CellStack primary={payment.patient} secondary={`Caregiver: ${payment.caregiver}`} /></td>
              <td><strong>{payment.amount}</strong></td>
              <td><StatusPill status={payment.patientStatus} /></td>
              <td><StatusPill status={payment.caregiverStatus} /></td>
              <td className="ui-table__actions">
                {payment.patientStatus !== 'Receipt verified' && payment.patientStatus !== 'Paid' && <Button size="sm" onClick={() => verify(payment.id)}>Verify receipt</Button>}
                {payment.caregiverStatus === 'Ready to pay' && <Button variant="primary" size="sm" onClick={() => payout(payment.id)}>Pay caregiver</Button>}
                {payment.caregiverStatus === 'Paid to caregiver' && <span className="ui-table__muted">Complete</span>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
