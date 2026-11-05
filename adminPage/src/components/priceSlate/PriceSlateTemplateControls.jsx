import { useState } from 'react';
import './PriceSlateTemplateControls.css';

export default function PriceSlateTemplateControls({
  templates,
  busy,
  onApply,
  onSave,
  onDelete,
}) {
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const selected = templates.find((template) => template.id === selectedId);

  const handleSave = async () => {
    setError('');
    try {
      await onSave(name);
      setName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm(`Delete the “${selected.name}” template?`)) return;
    setError('');
    try {
      await onDelete(selected.id);
      setSelectedId('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="price-slate-templates" aria-label="Slate templates">
      <div className="price-slate-templates__apply">
        <label>
          <span>Saved template</span>
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={busy}>
            <option value="">Choose a template…</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => selected && onApply(selected)} disabled={busy || !selected}>Apply</button>
        <button type="button" className="price-slate-templates__delete" onClick={handleDelete} disabled={busy || !selected}>Delete</button>
      </div>
      <div className="price-slate-templates__save">
        <label>
          <span>Save current rows as template</span>
          <input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="e.g. Standard home visit" disabled={busy} />
        </label>
        <button type="button" onClick={handleSave} disabled={busy || !name.trim()}>Save template</button>
      </div>
      {error && <p className="price-slate-templates__error" role="alert">{error}</p>}
    </section>
  );
}
