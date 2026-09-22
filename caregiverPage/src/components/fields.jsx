export function TextField({ label, value, onChange, type = 'text', placeholder = '', hint = '', required = false, disabled = false }) {
  return <label className="field"><span className="field-label">{label}{required && <i className="req">*</i>}</span><input type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />{hint && <small className="field-hint">{hint}</small>}</label>;
}

export function SelectField({ label, value, onChange, options, placeholder = 'Please select', required = false }) {
  return <label className="field"><span className="field-label">{label}{required && <i className="req">*</i>}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

export function TextareaField({ label, value, onChange, placeholder = '', hint = '' }) {
  return <label className="field"><span className="field-label">{label}</span><textarea rows={4} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{hint && <small className="field-hint">{hint}</small>}</label>;
}

/** Multi-select rendered as toggleable chips — used for languages, specialisations and working days. */
export function ChipGroup({ label, values, onChange, options, hint = '', required = false }) {
  const toggle = (option) => onChange(values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  return <div className="field"><span className="field-label">{label}{required && <i className="req">*</i>}</span><div className="chips">{options.map((option) => <button type="button" key={option} className={values.includes(option) ? 'chip chip--on' : 'chip'} aria-pressed={values.includes(option)} onClick={() => toggle(option)}>{option}</button>)}</div>{hint && <small className="field-hint">{hint}</small>}</div>;
}

export function ChoiceRow({ label, value, onChange, options, required = false }) {
  return <div className="field"><span className="field-label">{label}{required && <i className="req">*</i>}</span><div className="chips">{options.map((option) => <button type="button" key={option} className={value === option ? 'chip chip--on' : 'chip'} aria-pressed={value === option} onClick={() => onChange(option)}>{option}</button>)}</div></div>;
}

export function FileSlot({ slot, file, onSelect, onClear }) {
  return <div className={file ? 'slot slot--filled' : 'slot'}>
    <div className="slot-copy"><strong>{slot.label}{slot.required && <i className="req">*</i>}</strong><small>{file ? `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB` : slot.hint}</small></div>
    {file
      ? <button type="button" className="slot-clear" onClick={() => onClear(slot.id)}>Remove</button>
      : <label className="slot-pick">Choose file<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => { const picked = event.target.files?.[0]; if (picked) onSelect(slot.id, { name: picked.name, size: picked.size, type: picked.type }); }} /></label>}
  </div>;
}
