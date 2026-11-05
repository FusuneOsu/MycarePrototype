import { Button, Input, Select, Textarea } from '../../../../shared/ui/index.js';
import './BranchForm.css';

const REQUIRED_FIELDS = [
  ['name', 'Branch name'], ['address', 'Address'], ['city', 'City'],
  ['state', 'State'], ['postcode', 'Postcode'], ['service_area', 'Service area'],
];

export default function BranchForm({ form, onChange, onSubmit, onCancel, saving, error, fieldErrors = {} }) {
  const field = (name) => (event) => onChange(name, event.target.value);

  return (
    <form className="branch-form" onSubmit={onSubmit} noValidate>
      <div className="branch-form__grid">
        {REQUIRED_FIELDS.map(([name, label]) => (
          <label className="form-field" key={name}>
            <span>{label} <span className="form-field__required">*</span></span>
            <Input value={form[name] || ''} onChange={field(name)} aria-invalid={Boolean(fieldErrors[name])} />
            {fieldErrors[name] && <small className="branch-form__field-error">{fieldErrors[name]}</small>}
          </label>
        ))}

        <label className="form-field">
          <span>Latitude <span className="form-field__required">*</span></span>
          <Input type="number" step="any" min="-90" max="90" value={form.latitude} onChange={field('latitude')} aria-invalid={Boolean(fieldErrors.latitude)} />
          {fieldErrors.latitude && <small className="branch-form__field-error">{fieldErrors.latitude}</small>}
        </label>
        <label className="form-field">
          <span>Longitude <span className="form-field__required">*</span></span>
          <Input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={field('longitude')} aria-invalid={Boolean(fieldErrors.longitude)} />
          {fieldErrors.longitude && <small className="branch-form__field-error">{fieldErrors.longitude}</small>}
        </label>

        <label className="form-field">
          <span>Phone</span>
          <Input value={form.phone || ''} onChange={field('phone')} placeholder="+60 12-345 6789" aria-invalid={Boolean(fieldErrors.phone)} />
          {fieldErrors.phone && <small className="branch-form__field-error">{fieldErrors.phone}</small>}
        </label>
        <label className="form-field">
          <span>Email</span>
          <Input type="email" value={form.email || ''} onChange={field('email')} aria-invalid={Boolean(fieldErrors.email)} />
          {fieldErrors.email && <small className="branch-form__field-error">{fieldErrors.email}</small>}
        </label>

        <label className="form-field">
          <span>Opening time</span>
          <Input type="time" value={form.operating_hours?.open || '07:00'} onChange={(event) => onChange('operating_hours', { ...form.operating_hours, open: event.target.value })} />
        </label>
        <label className="form-field">
          <span>Closing time</span>
          <Input type="time" value={form.operating_hours?.close || '23:00'} onChange={(event) => onChange('operating_hours', { ...form.operating_hours, close: event.target.value })} />
          {fieldErrors.operating_hours && <small className="branch-form__field-error">{fieldErrors.operating_hours}</small>}
        </label>

        <label className="form-field">
          <span>Capacity</span>
          <Input type="number" min="0" step="1" value={form.capacity} onChange={field('capacity')} aria-invalid={Boolean(fieldErrors.capacity)} />
          {fieldErrors.capacity && <small className="branch-form__field-error">{fieldErrors.capacity}</small>}
        </label>
        <label className="form-field">
          <span>Status</span>
          <Select value={form.status} onChange={field('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </label>

        <label className="form-field">
          <span>Emergency contact name</span>
          <Input value={form.emergency_contact_name || ''} onChange={field('emergency_contact_name')} />
        </label>
        <label className="form-field">
          <span>Emergency contact phone</span>
          <Input value={form.emergency_contact_phone || ''} onChange={field('emergency_contact_phone')} placeholder="+60 12-345 6789" aria-invalid={Boolean(fieldErrors.emergency_contact_phone)} />
          {fieldErrors.emergency_contact_phone && <small className="branch-form__field-error">{fieldErrors.emergency_contact_phone}</small>}
        </label>

        <label className="form-field">
          <span>Facility fee (cents)</span>
          <Input type="number" min="0" step="1" value={form.facility_fee_cents ?? 0} onChange={field('facility_fee_cents')} aria-invalid={Boolean(fieldErrors.facility_fee_cents)} />
          {fieldErrors.facility_fee_cents && <small className="branch-form__field-error">{fieldErrors.facility_fee_cents}</small>}
        </label>
        <label className="form-field branch-form__notes">
          <span>Notes</span>
          <Textarea rows={3} value={form.notes || ''} onChange={field('notes')} />
        </label>
      </div>

      {error && <p className="branch-form__error" role="alert">{error}</p>}
      <div className="branch-form__actions">
        <Button type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save branch'}</Button>
      </div>
    </form>
  );
}
