import { useState } from 'react';
import { TextField, SelectField, TextareaField, ChipGroup } from '../../components/fields.jsx';
import { EDITABLE_FIELDS, REQUIRED_AFTER_APPROVAL } from '../../data/profileChanges.js';

const GROUPS = [...new Set(EDITABLE_FIELDS.map((field) => field.group))];

function initialValues(profile) {
  return Object.fromEntries(EDITABLE_FIELDS.map((field) => {
    const value = profile[field.id];
    if (field.type === 'chips') return [field.id, Array.isArray(value) ? value : []];
    return [field.id, value === '—' ? '' : (value ?? '')];
  }));
}

export default function ProfileEditModal({ profile, onCancel, onSubmit }) {
  const [values, setValues] = useState(() => initialValues(profile));
  const set = (id) => (value) => setValues((prev) => ({ ...prev, [id]: value }));

  const render = (field) => {
    const required = REQUIRED_AFTER_APPROVAL.includes(field.id);
    if (field.type === 'chips') return <ChipGroup key={field.id} label={field.label} values={values[field.id]} onChange={set(field.id)} options={field.options} required={required} />;
    if (field.type === 'select') return <SelectField key={field.id} label={field.label} value={values[field.id]} onChange={set(field.id)} options={field.options} required={required} />;
    if (field.type === 'textarea') return <TextareaField key={field.id} label={field.label} value={values[field.id]} onChange={set(field.id)} placeholder={field.placeholder} />;
    return <TextField key={field.id} label={field.label} type={field.type} value={values[field.id]} onChange={set(field.id)} placeholder={field.placeholder} required={required} />;
  };

  return <div className="sheet" role="dialog" aria-modal="true" aria-label="Edit profile">
    <div className="sheet-card panel">
      <header className="sheet-head">
        <div><h3>Edit my profile</h3><p>Changes are sent to your coordinator and go live once approved. Your name, IC number, assigned center and manager can only be changed by an admin.</p></div>
        <button type="button" className="sheet-close" onClick={onCancel} aria-label="Close">✕</button>
      </header>

      <div className="sheet-body">
        {GROUPS.map((group) => <div className="sheet-group" key={group}>
          <h4 className="apply-subhead">{group}</h4>
          <div className="apply-row">{EDITABLE_FIELDS.filter((field) => field.group === group && field.type !== 'chips' && field.type !== 'textarea').map(render)}</div>
          {EDITABLE_FIELDS.filter((field) => field.group === group && (field.type === 'chips' || field.type === 'textarea')).map(render)}
        </div>)}
      </div>

      <div className="apply-actions">
        <button type="button" className="back" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary compact" onClick={() => onSubmit(values)}>Send for approval</button>
      </div>
    </div>
  </div>;
}
