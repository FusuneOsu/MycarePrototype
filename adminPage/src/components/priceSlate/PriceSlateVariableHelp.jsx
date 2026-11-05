import './PriceSlateVariableHelp.css';

const VARIABLES = [
  ['rate', 'Hourly rate in RM'],
  ['duration_mins', 'Booking duration in minutes'],
  ['duration_hrs', 'Booking duration in hours'],
  ['branch_facility_fee', 'Serving branch facility fee in RM'],
  ['subtotal', 'Sum of earlier rows in RM'],
];

export default function PriceSlateVariableHelp() {
  return (
    <details className="price-slate-variable-help">
      <summary>Formula variables and operators</summary>
      <div className="price-slate-variable-help__body">
        <p>Use numbers, parentheses, and +, −, ×, ÷. No code or functions are evaluated.</p>
        <dl>
          {VARIABLES.map(([name, description]) => (
            <div key={name}><dt><code>{name}</code></dt><dd>{description}</dd></div>
          ))}
        </dl>
        <p><code>subtotal</code> includes only the rows above the current row. Each row is rounded to the nearest sen.</p>
      </div>
    </details>
  );
}
