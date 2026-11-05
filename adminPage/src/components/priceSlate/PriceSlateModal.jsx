import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../../shared/ui/index.js';
import Modal from '../common/Modal/Modal.jsx';
import { fetchBranch } from '../../api/branches.js';
import {
  createPriceTemplate, deletePriceTemplate, fetchPriceSlate, fetchPriceTemplates, savePriceSlate,
} from '../../api/priceSlate.js';
import { calculatePriceSlate } from '../../../../functions/_shared/priceSlateUtils.js';
import {
  buildInitialPriceSlate, getPriceSlateSnapshot, stripCalculatedAmounts,
} from '../../utils/priceSlateDefaults.js';
import PriceSlateCopyControls from './PriceSlateCopyControls.jsx';
import PriceSlateItemRow from './PriceSlateItemRow.jsx';
import PriceSlatePrintButton from './PriceSlatePrintButton.jsx';
import PriceSlateReceiptPreview from './PriceSlateReceiptPreview.jsx';
import PriceSlateTemplateControls from './PriceSlateTemplateControls.jsx';
import PriceSlateVariableHelp from './PriceSlateVariableHelp.jsx';
import './PriceSlateModal.css';

const makeItem = () => ({
  id: `PSI-${crypto.randomUUID()}`,
  label: '',
  note: '',
  expression: '',
});

async function fetchBranchOrNull(id) {
  if (!id) return null;
  try { return await fetchBranch(id); } catch { return null; }
}

export default function PriceSlateModal({
  booking,
  bookings = [],
  caregiverBranchId = '',
  onClose,
  onSaved,
}) {
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedBookingId, setLoadedBookingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState('');
  const [savedSlate, setSavedSlate] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [servingBranch, setServingBranch] = useState(null);
  const [caregiverBaseBranch, setCaregiverBaseBranch] = useState(null);
  const userEdited = useRef(false);

  useEffect(() => {
    let active = true;
    userEdited.current = false;

    Promise.all([
      fetchPriceSlate(booking.id),
      fetchPriceTemplates().catch((error) => {
        if (active) setToast(`Templates could not be loaded: ${error.message}`);
        return [];
      }),
      fetchBranchOrNull(booking.branch_id),
    ]).then(([slate, savedTemplates, branch]) => {
      if (!active) return;
      setLoadedBookingId(booking.id);
      setSavedSlate(slate);
      setTemplates(savedTemplates);
      setServingBranch(branch);
      if (slate) {
        setItems(stripCalculatedAmounts(slate.items));
        setIsDirty(false);
      } else {
        setItems(buildInitialPriceSlate(booking, { servingBranch: branch }));
        setIsDirty(true);
      }
    }).catch((error) => {
      if (active) {
        setLoadedBookingId(booking.id);
        setLoadError(error.message);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [booking]);

  useEffect(() => {
    let active = true;
    fetchBranchOrNull(caregiverBranchId).then((branch) => {
      if (active) setCaregiverBaseBranch(branch);
    });
    return () => { active = false; };
  }, [caregiverBranchId]);

  useEffect(() => {
    if (loading || savedSlate || !caregiverBaseBranch || userEdited.current) return;
    setItems(buildInitialPriceSlate(booking, { servingBranch, caregiverBaseBranch }));
  }, [booking, caregiverBaseBranch, loading, savedSlate, servingBranch]);

  const calculation = useMemo(() => calculatePriceSlate(items, {
    rate_cents: booking.rate_cents,
    duration_mins: booking.duration_mins,
    branch_facility_fee_cents: servingBranch?.facility_fee_cents || 0,
  }), [items, booking.rate_cents, booking.duration_mins, servingBranch]);

  const calculatedItems = calculation.ok ? calculation.items : items.map((item) => ({ ...item, amount_cents: null }));
  const displayedFieldErrors = { ...(calculation.fields || {}), ...fieldErrors };
  const previewTotal = calculation.ok ? calculation.total_cents : null;
  const availableCopies = useMemo(() => bookings.filter((row) => (
    row.id !== booking.id && getPriceSlateSnapshot(row)
  )), [bookings, booking.id]);

  const markChanged = () => {
    userEdited.current = true;
    setIsDirty(true);
    setFieldErrors({});
    setSaveError('');
  };

  const handleItemChange = (id, field, value) => {
    setItems((previous) => previous.map((item) => item.id === id ? { ...item, [field]: value } : item));
    markChanged();
  };

  const handleAdd = () => {
    setItems((previous) => [...previous, makeItem()]);
    markChanged();
  };

  const handleRemove = (id) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
    markChanged();
  };

  const handleMove = (id, direction) => {
    setItems((previous) => {
      const from = previous.findIndex((item) => item.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= previous.length) return previous;
      const next = [...previous];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    markChanged();
  };

  const handleSave = async () => {
    setSaveError('');
    setFieldErrors({});
    if (!calculation.ok) {
      setSaveError(calculation.error);
      setFieldErrors(calculation.fields || {});
      return;
    }
    setSaving(true);
    try {
      const result = await savePriceSlate(booking.id, stripCalculatedAmounts(items));
      setSavedSlate(result.slate);
      setItems(stripCalculatedAmounts(result.slate.items));
      setIsDirty(false);
      setToast('Price slate saved.');
      onSaved?.(result.slate);
    } catch (error) {
      setSaveError(error.message);
      setFieldErrors(error.payload?.fields || {});
    } finally {
      setSaving(false);
    }
  };

  const applyItems = (nextItems, message) => {
    userEdited.current = true;
    setItems(stripCalculatedAmounts(nextItems));
    setIsDirty(true);
    setFieldErrors({});
    setSaveError('');
    setToast(message);
  };

  const handleApplyTemplate = (template) => applyItems(template.items, `Applied “${template.name}”. Save the slate to calculate and store it.`);

  const handleCopyBooking = async (source) => {
    setSaveError('');
    try {
      const slate = await fetchPriceSlate(source.id);
      if (!slate) throw new Error('The selected booking no longer has a saved slate.');
      applyItems(slate.items, `Copied rows from booking ${source.id}. Save to recalculate for this booking.`);
    } catch (error) {
      setSaveError(error.message);
    }
  };

  const handleSaveTemplate = async (name) => {
    const result = await createPriceTemplate(name, stripCalculatedAmounts(items));
    setTemplates((previous) => [...previous, result.template].sort((a, b) => a.name.localeCompare(b.name)));
    setToast(`Saved template “${result.template.name}”.`);
  };

  const handleDeleteTemplate = async (id) => {
    await deletePriceTemplate(id);
    setTemplates((previous) => previous.filter((template) => template.id !== id));
    setToast('Template deleted. Existing booking slates are unchanged.');
  };

  const snapshot = savedSlate || getPriceSlateSnapshot(booking);
  const statusText = saving ? 'Saving…' : isDirty ? (snapshot ? 'Unsaved changes' : 'Not saved yet') : 'Saved';
  const isLoading = loading || loadedBookingId !== booking.id;

  return (
    <Modal isOpen onClose={saving ? () => {} : onClose} title={`Patient price slate · ${booking.id}`} size="lg" className="price-slate-modal">
      {isLoading ? (
        <p className="price-slate-modal__loading">Loading booking price context…</p>
      ) : loadError ? (
        <div className="price-slate-modal__error" role="alert">
          <p>{loadError}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="price-slate-modal__content">
          <div className="price-slate-modal__summary">
            <div>
              <strong>{booking.patient_name}</strong>
              <span>{booking.service_type} · {booking.duration_mins} minutes · {booking.date}</span>
            </div>
            <span className={`price-slate-modal__state${isDirty ? ' price-slate-modal__state--dirty' : ''}`}>{statusText}</span>
          </div>

          <p className="price-slate-modal__scope">This is the patient-facing service price only. Caregiver payout is managed separately and is not included.</p>

          {toast && <p className="price-slate-modal__toast" role="status">{toast}</p>}

          <PriceSlateTemplateControls
            templates={templates}
            busy={saving}
            onApply={handleApplyTemplate}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
          />
          <PriceSlateCopyControls
            bookings={availableCopies}
            currentBookingId={booking.id}
            disabled={saving}
            onCopy={handleCopyBooking}
          />
          <PriceSlateVariableHelp />

          <div className="price-slate-modal__section-heading">
            <div>
              <h3>Receipt line items</h3>
              <p>Enter an amount or formula for each row. Notes appear on the receipt.</p>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={saving}>Add line</Button>
          </div>

          <div className="price-slate-modal__rows">
            {items.map((item, index) => (
              <PriceSlateItemRow
                key={item.id}
                item={item}
                index={index}
                count={items.length}
                amountCents={calculatedItems[index]?.amount_cents}
                errors={displayedFieldErrors}
                disabled={saving}
                onChange={handleItemChange}
                onMove={handleMove}
                onRemove={handleRemove}
              />
            ))}
            {!items.length && <p className="price-slate-modal__empty">No line items yet. Add a row or apply a template.</p>}
          </div>

          {(calculation.fields?.total || fieldErrors.total) && (
            <p className="price-slate-modal__error" role="alert">{fieldErrors.total || calculation.fields.total}</p>
          )}
          {saveError && <p className="price-slate-modal__error" role="alert">{saveError}</p>}

          <div className="price-slate-modal__total" aria-live="polite">
            <span>Live total</span>
            <strong>{previewTotal == null ? 'Fix formula errors' : `RM ${(previewTotal / 100).toFixed(2)}`}</strong>
          </div>

          <div className="price-slate-modal__receipt-layout">
            <PriceSlateReceiptPreview booking={booking} items={calculatedItems} totalCents={previewTotal} />
            <div className="price-slate-modal__actions">
              <PriceSlatePrintButton
                booking={booking}
                items={calculatedItems}
                totalCents={previewTotal ?? 0}
                disabled={!calculation.ok || saving}
              />
              <Button variant="primary" onClick={handleSave} disabled={saving || !calculation.ok}>
                {saving ? 'Saving…' : snapshot ? 'Save price slate' : 'Save price slate'}
              </Button>
              <Button onClick={onClose} disabled={saving}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
