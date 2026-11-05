import './PriceSlateReceiptPreview.css';

export default function PriceSlateReceiptPreview({ booking, items, totalCents }) {
  return (
    <section className="price-slate-receipt" aria-label="Patient receipt preview">
      <div className="price-slate-receipt__heading">
        <div>
          <p>MYCARE · SERVICE RECEIPT</p>
          <h3>{booking.patient_name || 'Patient'}</h3>
          <span>{booking.date} · {booking.service_type}{booking.branch_name ? ` · ${booking.branch_name}` : ''}</span>
        </div>
        <span className="price-slate-receipt__booking">{booking.id}</span>
      </div>
      <div className="price-slate-receipt__items">
        {items.map((item) => (
          <div className="price-slate-receipt__item" key={item.id}>
            <div><strong>{item.label || 'Untitled item'}</strong>{item.note && <small>{item.note}</small>}</div>
            <span>{item.amount_cents == null ? '—' : `RM ${(item.amount_cents / 100).toFixed(2)}`}</span>
          </div>
        ))}
        {!items.length && <p className="price-slate-receipt__empty">Add line items to preview the receipt.</p>}
      </div>
      <div className="price-slate-receipt__total">
        <strong>Total due</strong>
        <strong>{totalCents == null ? '—' : `RM ${(totalCents / 100).toFixed(2)}`}</strong>
      </div>
      <p className="price-slate-receipt__notice">Patient service price only · caregiver payout is not included.</p>
    </section>
  );
}
