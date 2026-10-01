import { useCallback, useEffect, useState } from 'react';
import { Modal, Button, Input, Select, Textarea } from '../../../../shared/ui/index.js';
import LocationMap from '../map/LocationMap.jsx';
import {
  LANGUAGES, CENTERS, SPECIALISATIONS,
} from '../../../../shared/careVocabulary.js';
import { REQUEST_SOURCES } from '../../../../shared/bookingStore.js';
import './AddRequestModal.css';

/** Time options for HH:MM dropdowns (30‑minute slots, 00:00–23:30). */
const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

function getDurationMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

/** Forward‑geocode via Nominatim. Returns { lat, lng } or null. */
async function geocodeAddress(address) {
  if (!address || address.trim().length < 5) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=my`;
    const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await resp.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* ignore */ }
  return null;
}

/** Reverse‑geocode via Nominatim. Returns a display name or null. */
async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`;
    const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await resp.json();
    return data?.display_name || null;
  } catch { /* ignore */ }
  return null;
}

const emptyForm = () => ({
  source: 'Website',
  patientName: '',
  phone: '',
  language: '',
  careType: 'Home Visit',
  bookingType: 'One time',
  caregiverId: '',
  genderPreference: 'No preference',
  requiredSkill: '',
  zone: '',
  location: '',
  latitude: null,
  longitude: null,
  requestedDate: new Date().toISOString().slice(0, 10),
  preferredStart: '09:00',
  preferredEnd: '10:00',
  notes: '',
});

export default function AddRequestModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [caregivers, setCaregivers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  // Fetch caregivers list for the dropdown.
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/caregivers-list')
      .then((r) => r.ok ? r.json() : [])
      .then(setCaregivers)
      .catch(() => {});
  }, [isOpen]);

  // Reset form when modal opens.
  useEffect(() => {
    if (isOpen) setForm(emptyForm());
  }, [isOpen]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // When "Locate" is clicked, forward‑geocode the address onto the map.
  const handleLocateAddress = useCallback(async () => {
    if (!form.location || form.location.trim().length < 5) return;
    setGeocoding(true);
    const coords = await geocodeAddress(form.location);
    if (coords) {
      set('latitude', coords.lat);
      set('longitude', coords.lng);
    }
    setGeocoding(false);
  }, [form.location]);

  // When the user pins on the map, reverse‑geocode to fill the address field.
  const handleMapChange = useCallback(async (lat, lng) => {
    set('latitude', lat);
    set('longitude', lng);
    const displayName = await reverseGeocode(lat, lng);
    if (displayName) {
      set('location', displayName);
      const area = CENTERS.find((c) => displayName.toLowerCase().includes(c.toLowerCase()));
      if (area) set('zone', area);
    } else {
      set('location', `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, []);

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const bookingNote = form.bookingType === 'Recurring'
        ? `[Booking Type: Recurring]\n${form.notes}`
        : form.notes;

      const payload = {
        source: form.source,
        patient_name: form.patientName.trim(),
        phone: form.phone.trim() || null,
        preferred_language: form.language || null,
        care_type: form.careType,
        gender_preference: form.genderPreference,
        required_skill: form.requiredSkill || null,
        zone: form.zone,
        location: form.location || form.zone || '',
        latitude: form.latitude,
        longitude: form.longitude,
        requested_date: form.requestedDate,
        preferred_start: form.preferredStart,
        preferred_end: form.preferredEnd,
        notes: bookingNote || null,
        assigned_caregiver_id: form.caregiverId || null,
      };

      // POST to the API (persists to SQLite).
      const resp = await fetch('/api/patient-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await resp.json();
      if (!resp.ok) {
        throw new Error(result.error || 'Failed to save request');
      }

      // Also write to localStorage so listRequests() picks it up immediately.
      try {
        const REQUESTS_KEY = 'mycare.patientRequests';
        const existing = JSON.parse(window.localStorage.getItem(REQUESTS_KEY) || '{}');
        existing[result.id] = {
          id: result.id,
          source: form.source,
          status: 'New',
          patientName: form.patientName.trim(),
          phone: form.phone.trim(),
          language: form.language || 'English',
          careType: form.careType,
          preferredGender: form.genderPreference,
          requiredSkill: form.requiredSkill || '',
          area: form.zone,
          location: form.location,
          lat: form.latitude,
          lng: form.longitude,
          requestedDateISO: form.requestedDate,
          preferredDate: form.requestedDate,
          preferredStart: form.preferredStart,
          preferredEnd: form.preferredEnd,
          notes: bookingNote,
          receivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(existing));
        window.dispatchEvent(new Event('storage'));
      } catch (lsErr) {
        console.warn('[AddRequestModal] localStorage write failed', lsErr);
      }

      if (onSaved) onSaved(result.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const duration = getDurationMinutes(form.preferredStart, form.preferredEnd);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Request" size="lg">
      <div className="add-request-modal__form">
        <div className="add-request-modal__grid">
          {/* Source */}
          <div className="form-field">
            <label>Source</label>
            <Select value={form.source} onChange={(e) => set('source', e.target.value)}>
              {REQUEST_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          {/* Patient Name */}
          <div className="form-field">
            <label>Patient name <span className="form-field__required">*</span></label>
            <Input value={form.patientName} onChange={(e) => set('patientName', e.target.value)}
              placeholder="e.g. Aisha Rahman" />
          </div>

          {/* Phone */}
          <div className="form-field">
            <label>Phone</label>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)}
              placeholder="+60 12-345 6789" />
          </div>

          {/* Preferred Language */}
          <div className="form-field">
            <label>Preferred language</label>
            <Select value={form.language} onChange={(e) => set('language', e.target.value)}>
              <option value="">— Select —</option>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </div>

          {/* Care Type / Appointment Type */}
          <div className="form-field">
            <label>Appointment type</label>
            <Select value={form.careType} onChange={(e) => set('careType', e.target.value)}>
              <option value="Home Visit">Home Visit</option>
              <option value="Care Center">Care Center</option>
            </Select>
          </div>

          {/* Booking Type */}
          <div className="form-field">
            <label>Booking type</label>
            <Select value={form.bookingType} onChange={(e) => set('bookingType', e.target.value)}>
              <option value="One time">One time</option>
              <option value="Recurring">Recurring</option>
            </Select>
          </div>

          {/* Assigned Caregiver */}
          <div className="form-field">
            <label>Assigned caregiver</label>
            <Select value={form.caregiverId} onChange={(e) => set('caregiverId', e.target.value)}>
              <option value="">— Select caregiver —</option>
              {caregivers.map((cg) => (
                <option key={cg.id} value={cg.id}>{cg.name} — {cg.center}</option>
              ))}
            </Select>
          </div>
          {/* Gender Preference */}
          <div className="form-field">
            <label>Caregiver gender preference</label>
            <Select value={form.genderPreference} onChange={(e) => set('genderPreference', e.target.value)}>
              <option value="No preference">No preference</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </Select>
          </div>

          {/* Required Skill */}
          <div className="form-field">
            <label>Required skill</label>
            <Select value={form.requiredSkill} onChange={(e) => set('requiredSkill', e.target.value)}>
              <option value="">— None specified —</option>
              {SPECIALISATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>

          {/* Zone / Area */}
          <div className="form-field">
            <label>Zone / Area</label>
            <Select value={form.zone} onChange={(e) => set('zone', e.target.value)}>
              <option value="">— Select zone —</option>
              {CENTERS.map((z) => <option key={z} value={z}>{z}</option>)}
            </Select>
          </div>

          {/* Requested Date */}
          <div className="form-field">
            <label>Date <span className="form-field__required">*</span></label>
            <Input type="date" value={form.requestedDate}
              onChange={(e) => set('requestedDate', e.target.value)} />
          </div>

          {/* Start time */}
          <div className="form-field">
            <label>Start time <span className="form-field__required">*</span></label>
            <Select value={form.preferredStart} onChange={(e) => set('preferredStart', e.target.value)}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>

          {/* End time */}
          <div className="form-field">
            <label>End time <span className="form-field__required">*</span></label>
            <Select value={form.preferredEnd} onChange={(e) => set('preferredEnd', e.target.value)}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>

          {/* Duration (read‑only) */}
          <div className="form-field">
            <label>Duration</label>
            <Input readOnly value={duration > 0 ? `${duration} minutes` : '—'} />
          </div>
        </div>

        {/* Location section — shows map + address */}
        <div className="form-field form-field--full">
          <label>Location</label>

          {form.careType === 'Home Visit' ? (
            <div className="add-request-modal__location-row">
              <div className="add-request-modal__address-col">
                <div className="add-request-modal__address-input-row">
                  <Input
                    value={form.location}
                    onChange={(e) => set('location', e.target.value)}
                    placeholder="Type address and click Locate, or pin on map"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleLocateAddress}
                    disabled={geocoding || form.location.trim().length < 5}
                  >
                    {geocoding ? 'Locating…' : 'Locate'}
                  </Button>
                </div>
                <p className="form-field__hint">
                  Enter an address then click <strong>Locate</strong>, or click on the map to auto‑fill.
                </p>
              </div>
            </div>
          ) : (
            <p className="form-field__hint">
              For Care Center visits, the site location will be used.
            </p>
          )}

          <LocationMap
            latitude={form.latitude}
            longitude={form.longitude}
            onChange={handleMapChange}
            height="260px"
            showSiteSelector={form.careType === 'Care Center'}
            showOpenInGmaps={true}
          />
        </div>

        {/* Notes */}
        <div className="form-field form-field--full">
          <label>Notes / Special instructions</label>
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            maxLength={500}
            placeholder="Any special instructions or notes about this request."
            rows={3}
          />
          <span className="form-field__hint">{form.notes.length}/500 characters</span>
        </div>

        {error && <p className="add-request-modal__error">{error}</p>}

        <div className="add-request-modal__actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={saving || !form.patientName.trim() || !form.requestedDate || !form.preferredStart || !form.preferredEnd}
          >
            {saving ? 'Saving…' : 'Save request'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

