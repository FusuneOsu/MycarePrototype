import './PriceSlateItemRow.css';

export default function PriceSlateItemRow({
  item,
  index,
  count,
  amountCents,
  errors = {},
  disabled = false,
  onChange,
  onMove,
  onRemove,
}) {
  const prefix = `items.${index}`;
  return (
    <fieldset className="price-slate-row" disabled={disabled}>
      <legend>Line item {index + 1}</legend>
      <div className="price-slate-row__fields">
        <label className="price-slate-row__label">
          <span>Label</span>
          <input
            value={item.label}
            maxLength={120}
            onChange={(event) => onChange(item.id, 'label', event.target.value)}
            placeholder="e.g. Service fee"
            aria-invalid={Boolean(errors[`${prefix}.label`] || errors[prefix])}
          />
          {(errors[`${prefix}.label`] || errors[prefix]) && <small>{errors[`${prefix}.label`] || errors[prefix]}</small>}
        </label>
        <label className="price-slate-row__expression">
          <span>Amount or formula <em>(RM)</em></span>
          <input
            value={item.expression}
            maxLength={256}
            onChange={(event) => onChange(item.id, 'expression', event.target.value)}
            placeholder="e.g. rate * duration_hrs + 15"
            aria-invalid={Boolean(errors[`${prefix}.expression`] || errors[prefix])}
          />
          {(errors[`${prefix}.expression`] || errors[prefix]) && <small>{errors[`${prefix}.expression`] || errors[prefix]}</small>}
        </label>
        <div className="price-slate-row__amount" aria-live="polite">
          <span>Preview</span>
          <strong>{amountCents == null ? '—' : `RM ${(amountCents / 100).toFixed(2)}`}</strong>
        </div>
      </div>
      <div className="price-slate-row__footer">
        <label className="price-slate-row__note">
          <span>Note <em>(optional, appears on receipt)</em></span>
          <input
            value={item.note || ''}
            maxLength={500}
            onChange={(event) => onChange(item.id, 'note', event.target.value)}
            placeholder="Short patient-facing description"
            aria-invalid={Boolean(errors[`${prefix}.note`])}
          />
          {errors[`${prefix}.note`] && <small>{errors[`${prefix}.note`]}</small>}
        </label>
        <div className="price-slate-row__buttons">
          <button type="button" onClick={() => onMove(item.id, -1)} disabled={disabled || index === 0} aria-label={`Move line item ${index + 1} up`}>↑</button>
          <button type="button" onClick={() => onMove(item.id, 1)} disabled={disabled || index === count - 1} aria-label={`Move line item ${index + 1} down`}>↓</button>
          <button type="button" className="price-slate-row__remove" onClick={() => onRemove(item.id)} aria-label={`Remove line item ${index + 1}`}>Remove</button>
        </div>
      </div>
    </fieldset>
  );
}
