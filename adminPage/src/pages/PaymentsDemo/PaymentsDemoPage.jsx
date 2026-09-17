import { useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import './PaymentsDemoPage.css';

const initialPayments = [
  { id: 'PAY-1001', patient: 'Nur Aisyah Rahman', caregiver: 'Sarah Tan', amount: 'RM 120.00', date: '28 Sep 2026', patientStatus: 'Payment link sent', caregiverStatus: 'Awaiting payout' },
  { id: 'PAY-0998', patient: 'Daniel Lim', caregiver: 'Adam Tan', amount: 'RM 95.00', date: '26 Sep 2026', patientStatus: 'Receipt verified', caregiverStatus: 'Ready to pay' },
  { id: 'PAY-0992', patient: 'Nadia Ismail', caregiver: 'Siti Aminah', amount: 'RM 110.00', date: '24 Sep 2026', patientStatus: 'Paid', caregiverStatus: 'Paid to caregiver' },
];

export default function PaymentsDemoPage() {
  const [payments, setPayments] = useState(initialPayments);
  const verify = (id) => setPayments((items) => items.map((item) => item.id === id ? { ...item, patientStatus: 'Receipt verified', caregiverStatus: 'Ready to pay' } : item));
  const payout = (id) => setPayments((items) => items.map((item) => item.id === id ? { ...item, caregiverStatus: 'Paid to caregiver' } : item));

  return <div className="payments-demo-page"><Topbar title="Payments" subtitle="Demo the patient payment and caregiver payout workflow." /><div className="payments-demo-page__body"><div className="payments-demo-page__banner"><div><p className="payments-demo-page__eyebrow">Mock payment gateway</p><h2>Payment operations</h2><p>Review receipts, verify patient payments, and release caregiver payouts.</p></div><span className="payments-demo-page__test-badge">TEST MODE · NO REAL CHARGES</span></div><div className="payments-demo-page__stats"><div><span>Awaiting receipts</span><strong>1</strong></div><div><span>Ready to pay caregivers</span><strong>1</strong></div><div><span>Completed payouts</span><strong>1</strong></div></div><section className="payments-demo-table"><div className="payments-demo-table__head"><span>Payment</span><span>Patient</span><span>Amount</span><span>Patient status</span><span>Caregiver payout</span><span>Action</span></div>{payments.map((payment) => <div className="payments-demo-table__row" key={payment.id}><span><strong>{payment.id}</strong><small>{payment.date}</small></span><span>{payment.patient}<small>Caregiver: {payment.caregiver}</small></span><strong>{payment.amount}</strong><StatusPill status={payment.patientStatus} /><StatusPill status={payment.caregiverStatus} /><span className="payments-demo-table__actions">{payment.patientStatus !== 'Receipt verified' && payment.patientStatus !== 'Paid' && <button type="button" onClick={() => verify(payment.id)}>Verify receipt</button>}{payment.caregiverStatus === 'Ready to pay' && <button type="button" onClick={() => payout(payment.id)}>Pay caregiver</button>}{payment.caregiverStatus === 'Paid to caregiver' && <span className="payments-demo-table__complete">Complete</span>}</span></div>)}</section><p className="payments-demo-page__note">Demo only. This screen does not connect to Stripe or move money.</p></div></div>;
}
