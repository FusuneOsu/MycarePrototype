import { useEffect, useState } from 'react';
import Modal from '../common/Modal/Modal.jsx';
import LocationMap from '../map/LocationMap.jsx';
import { Button } from '../../../../shared/ui/index.js';
import { STATUS_OPTIONS } from '../../utils/appointmentUtils.js';

/**
 * Edit Appointment modal — self-contained form with its own local state.
 *
 * Props:
 *   isOpen       – whether the modal is visible
 *   appointment  – the appointment to edit (or null)
 *   onClose      – called to close the modal
 *   onSave       – async (formData) => Promise; the modal handles busy/error state
 */
export default function EditAppointmentModal({ isOpen, appointment, onClose, onSave }) {
  const [form, setForm] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Initialise local form state when the modal opens with a new appointment.
  useEffect(() => {
    if (isOpen && appointment) {
      setForm({ ...appointment });
      setSaveBusy(false);
      setSaveError('');
    }
  }, [isOpen, appointment]);

  const handleFieldChange = (f, v) => setForm((p) => ({ ...p, [f]: v }));
  const handleTaskChange = (i, v) => setForm((p) => {
    const nt = [...(p.tasks || [])];
    nt[i] = v;
    return { ...p, tasks: nt };
  });
  const handleAddTask = () => setForm((p) => ({ ...p, tasks: [...(p.tasks || []), ''] }));
  const handleRemoveTask = (i) => setForm((p) => ({
    ...p,
    tasks: (p.tasks || []).filter((_, idx) => idx !== i),
  }));

  const handleSave = async () => {
    if (!form) return;
    setSaveBusy(true);
    setSaveError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaveBusy(false);
    }
  };

  if (!form) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Appointment" size="lg">
      <div className="appointments-page__modal-form">
        <div className="appointments-page__modal-grid">
          <div className="form-field">
            <label>Patient Name</label>
            <input
              type="text"
              value={form.patientName || ''}
              onChange={(e) => handleFieldChange('patientName', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Caregiver Name</label>
            <input
              type="text"
              value={form.caregiverName || ''}
              onChange={(e) => handleFieldChange('caregiverName', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Date</label>
            <input
              type="date"
              value={form.date || ''}
              onChange={(e) => handleFieldChange('date', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Status</label>
            <select
              value={form.status || 'Scheduled'}
              onChange={(e) => handleFieldChange('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>End Time</label>
            <input
              type="time"
              value={form.endTime || '10:00'}
              onChange={(e) => handleFieldChange('endTime', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Appointment Type</label>
            <select
              value={form.appointmentType || 'Home Visit'}
              onChange={(e) => handleFieldChange('appointmentType', e.target.value)}
            >
              <option value="Home Visit">Home Visit</option>
              <option value="Care Center">Care Center</option>
            </select>
          </div>
          <div className="form-field">
            <label>Booking Type</label>
            <select
              value={form.bookingType || 'One time'}
              onChange={(e) => handleFieldChange('bookingType', e.target.value)}
            >
              <option value="One time">One time</option>
              <option value="Recurring">Recurring</option>
            </select>
          </div>
          <div className="form-field">
            <label>Gender Preference</label>
            <select
              value={form.caregiverGenderPreference || 'No preference'}
              onChange={(e) => handleFieldChange('caregiverGenderPreference', e.target.value)}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="No preference">No preference</option>
            </select>
          </div>
          <div className="form-field">
            <label>Location Mode</label>
            <select
              value={form.locationMode || 'address'}
              onChange={(e) => handleFieldChange('locationMode', e.target.value)}
            >
              <option value="address">Typed address</option>
              <option value="pinpoint">Pinpoint on map</option>
              <option value="center">Care center</option>
            </select>
          </div>
          <div className="form-field form-field--full">
            <label>Location / Address</label>
            <input
              type="text"
              value={form.locationText || ''}
              onChange={(e) => handleFieldChange('locationText', e.target.value)}
              placeholder="e.g. 12 Jalan Ampang, Kuala Lumpur"
            />
          </div>
          <div className="form-field form-field--full">
            <label>Tasks</label>
            <div className="appointments-page__task-editor">
              {(form.tasks || []).map((task, idx) => (
                <div key={'et-' + idx} className="appointments-page__task-row">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => handleTaskChange(idx, e.target.value)}
                    placeholder="Task description"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(idx)}
                    aria-label="Remove task"
                  >
                    {'\u00d7'}
                  </button>
                </div>
              ))}
              <button type="button" className="appointments-page__inline-add" onClick={handleAddTask}>
                + Add task
              </button>
            </div>
          </div>
          <div className="form-field form-field--full">
            <label>Special Instructions</label>
            <textarea
              value={form.specialInstructions || ''}
              maxLength={240}
              onChange={(e) => handleFieldChange('specialInstructions', e.target.value)}
              placeholder="Write any custom caregiver instructions for this visit."
            />
            <span className="form-field__hint">{(form.specialInstructions || '').length}/240 characters</span>
          </div>
          <div className="form-field form-field--full">
            <label>Location Map</label>
            <LocationMap
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(lat, lng) => {
                handleFieldChange('latitude', lat);
                handleFieldChange('longitude', lng);
              }}
              height="280px"
              showSiteSelector
              showOpenInGmaps
            />
          </div>
        </div>

        {saveError && <p className="appointments-page__error">{saveError}</p>}

        <div className="appointments-page__modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saveBusy}>
            {saveBusy ? 'Saving\u2026' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
