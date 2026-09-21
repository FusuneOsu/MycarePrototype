import { useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import { Button, Card, CellStack, Pill, SectionHeader, StatCard, StatGrid, Table } from '../../../../shared/ui/index.js';
import './PaymentsDemoPage.css';

const initialPayments = [
  { id: 'PAY-1001', patient: 'Nur Aisyah Rahman', caregiver: 'Sarah Tan', amount: 'RM 120.00', date: '28 Sep 2026', patientStatus: 'Payment link sent', caregiverStatus: 'Awaiting payout' },
  { id: 'PAY-0998', patient: 'Daniel Lim', caregiver: 'Adam Tan', amount: 'RM 95.00', date: '26 Sep 2026', patientStatus: 'Receipt verified', caregiverStatus: 'Ready to pay' },
  { id: 'PAY-0992', patient: 'Nadia Ismail', caregiver: 'Siti Aminah', amount: 'RM 110.00', date: '24 Sep 2026', patientStatus: 'Paid', caregiverStatus: 'Paid to caregiver' },
];

export default function PaymentsDemoPage() {
  const [payments, setPayments] = useState(initialPayments);
  const verify = (id) => setPayments((items) => items.map((item) => (item.id === id ? { ...item, patientStatus: 'Receipt verified', caregiverStatus: 'Ready to pay' } : item)));
  const payout = (id) => setPayments((items) => items.map((item) => (item.id === id ? { ...item, caregiverStatus: 'Paid to caregiver' } : item)));

  const awaitingReceipts = payments.filter((item) => item.patientStatus === 'Payment link sent').length;
  const readyToPay = payments.filter((item) => item.caregiverStatus === 'Ready to pay').length;
  const completed = payments.filter((item) => item.caregiverStatus === 'Paid to caregiver').length;

  return (
    <div className="payments-demo-page">
      <Topbar title="Payments" subtitle="Demo the patient payment and caregiver payout workflow." />

      <StatGrid>
        <StatCard label="Awaiting receipts" value={awaitingReceipts} note="Payment link sent to patient" icon="◌" tone="gold" />
        <StatCard label="Ready to pay caregivers" value={readyToPay} note="Receipt verified" icon="RM" />
        <StatCard label="Completed payouts" value={completed} note="Paid to caregiver" icon="✓" />
      </StatGrid>

      <Card padded>
        <SectionHeader
          eyebrow="Mock payment gateway"
          title="Payment operations"
          intro="Review receipts, verify patient payments, and release caregiver payouts."
          actions={<Pill tone="warning">Test mode · no real charges</Pill>}
        />

        <Table columns={['Payment', 'Patient', 'Amount', 'Patient status', 'Caregiver payout', '']} label="Payments">
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
        <p className="payments-demo-page__note">Demo only. This screen does not connect to Stripe or move money.</p>
      </Card>
    </div>
  );
}
