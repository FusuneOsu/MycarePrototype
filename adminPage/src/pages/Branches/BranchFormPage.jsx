import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import BranchForm from '../../components/branches/BranchForm.jsx';
import BranchLocationSearch from '../../components/branches/BranchLocationSearch.jsx';
import BranchMap from '../../components/branches/BranchMap.jsx';
import BranchToast from '../../components/branches/BranchToast.jsx';
import { createBranch, fetchBranch, updateBranch } from '../../api/branches.js';
import { reverseGeocode } from '../../utils/geocoding.js';
import './BranchFormPage.css';

const emptyForm = {
  name: '', address: '', city: '', state: '', postcode: '', service_area: '',
  latitude: '', longitude: '', phone: '', email: '',
  operating_hours: { open: '07:00', close: '23:00' },
  capacity: 350, status: 'active', notes: '', emergency_contact_name: '',
  emergency_contact_phone: '', facility_fee_cents: 0,
};

function formFromBranch(branch) {
  let operatingHours = branch.operating_hours;
  if (typeof operatingHours === 'string') {
    try { operatingHours = JSON.parse(operatingHours); } catch { operatingHours = null; }
  }
  return {
    ...emptyForm,
    ...branch,
    latitude: branch.latitude ?? '',
    longitude: branch.longitude ?? '',
    phone: branch.phone || '',
    email: branch.email || '',
    notes: branch.notes || '',
    emergency_contact_name: branch.emergency_contact_name || '',
    emergency_contact_phone: branch.emergency_contact_phone || '',
    operating_hours: operatingHours || emptyForm.operating_hours,
  };
}

function validate(form) {
  const errors = {};
  for (const field of ['name', 'address', 'city', 'state', 'postcode', 'service_area']) {
    if (!String(form[field] || '').trim()) errors[field] = 'This field is required.';
  }
  const lat = Number(form.latitude), lng = Number(form.longitude);
  if (form.latitude === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = 'Enter a latitude between -90 and 90.';
  if (form.longitude === '' || !Number.isFinite(lng) || lng < -180 || lng > 180) errors.longitude = 'Enter a longitude between -180 and 180.';
  const validPhone = (value) => {
    if (!value) return true;
    const normalized = String(value).trim().replace(/[\s().-]/g, '');
    return /^(?:60|\+60)(?:1[0-9]\d{7,8}|[3-9]\d{7,8})$/.test(normalized);
  };
  if (!validPhone(form.phone)) errors.phone = 'Enter a valid Malaysian phone number.';
  if (!validPhone(form.emergency_contact_phone)) errors.emergency_contact_phone = 'Enter a valid Malaysian phone number.';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 0) errors.capacity = 'Capacity must be a non-negative integer.';
  if (!Number.isInteger(Number(form.facility_fee_cents)) || Number(form.facility_fee_cents) < 0) errors.facility_fee_cents = 'Facility fee must be a non-negative integer in cents.';
  if (!form.operating_hours?.open || !form.operating_hours?.close) errors.operating_hours = 'Set both opening and closing times.';
  return errors;
}

function payloadFromForm(form) {
  return {
    ...form,
    name: form.name.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    capacity: Number(form.capacity),
    facility_fee_cents: Number(form.facility_fee_cents),
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    notes: form.notes.trim() || null,
    emergency_contact_name: form.emergency_contact_name.trim() || null,
    emergency_contact_phone: form.emergency_contact_phone.trim() || null,
  };
}

export default function BranchFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id && id !== 'new');
  const [form, setForm] = useState(emptyForm);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const reverseLookupId = useRef(0);

  useEffect(() => {
    if (!editing) return;
    let active = true;
    fetchBranch(id)
      .then((branch) => {
        if (!active) return;
        setForm(formFromBranch(branch));
        setSearchValue(branch.address || `${branch.latitude}, ${branch.longitude}`);
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editing, id]);

  const updateField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const handleLocationSelected = ({ lat, lng, address, searchText }) => {
    setForm((previous) => ({ ...previous, latitude: lat, longitude: lng, address: address || previous.address }));
    setSearchValue(searchText || address || `${lat}, ${lng}`);
    setFieldErrors((previous) => ({ ...previous, latitude: '', longitude: '', address: '' }));
  };

  const handleMapChange = async (lat, lng) => {
    const lookupId = ++reverseLookupId.current;
    setForm((previous) => ({ ...previous, latitude: lat, longitude: lng }));
    const address = await reverseGeocode(lat, lng);
    if (lookupId !== reverseLookupId.current) return;
    const display = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setSearchValue(display);
    setForm((previous) => ({ ...previous, latitude: lat, longitude: lng, address: display }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const payload = payloadFromForm(form);
      const result = editing ? await updateBranch(id, payload) : await createBranch(payload);
      const savedBranch = result.branch;
      navigate(`/branches/${savedBranch.id}`, {
        state: { toast: { type: 'success', message: editing ? 'Branch updated.' : 'Branch created.' } },
      });
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.payload?.fields || {});
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="branch-form-page"><Topbar title={editing ? 'Edit Branch' : 'Add Branch'} /><p>Loading branch…</p></div>;
  if (error && editing && !form.id) return <div className="branch-form-page"><Topbar title="Branch unavailable" /><BranchToast message={error} type="error" /><button type="button" onClick={() => navigate('/branches')}>Back to branches</button></div>;

  return (
    <div className="branch-form-page">
      <Topbar title={editing ? 'Edit Branch' : 'Add Branch'} subtitle="Manage branch details and map location." />
      <div className="branch-form-page__body">
        <BranchLocationSearch value={searchValue} onChange={setSearchValue} onLocationSelected={handleLocationSelected} disabled={saving} />
        <div className="branch-form-page__columns">
          <BranchForm
            form={form}
            onChange={updateField}
            onSubmit={handleSubmit}
            onCancel={() => navigate(editing ? `/branches/${id}` : '/branches')}
            saving={saving}
            error={error}
            fieldErrors={fieldErrors}
          />
          <section className="branch-form-page__map-panel">
            <h2>Branch location</h2>
            <BranchMap latitude={form.latitude} longitude={form.longitude} readOnly={false} onChange={handleMapChange} height="560px" />
          </section>
        </div>
      </div>
    </div>
  );
}
