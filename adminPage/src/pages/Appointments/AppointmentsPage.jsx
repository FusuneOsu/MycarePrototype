import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import Modal from '../../components/common/Modal/Modal.jsx';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import { Button, Input, Segmented, Select, StatCard, StatGrid, Toolbar } from '../../../../shared/ui/index.js';
import { fetchAppointments, updateAppointment } from '../../api/appointments.js';
import './AppointmentsPage.css';

const STATUS_OPTIONS = [
  'Caregiver assigned', 'Scheduled', 'In progress', 'Cancelled',
  'Missed', 'Completed', 'No caregiver assigned',
];

const STATUS_COLORS = {
  'Scheduled': 'var(--color-blue, #3b82f6)',
  'Caregiver assigned': 'var(--color-indigo, #6366f1)',
  'In progress': 'var(--color-gold, #eab308)',
  'Completed': 'var(--color-green, #22c55e)',
  'Cancelled': 'var(--color-red, #ef4444)',
  'Missed': 'var(--color-orange, #f97316)',
  'No caregiver assigned': 'var(--color-gray, #6b7280)',
};

function toISODate(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function toDateObject(value) {
  const d = new Date(value + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date) {
  const s = new Date(date);
  s.setDate(s.getDate() + (s.getDay() === 0 ? -6 : 1 - s.getDay()));
  s.setHours(0, 0, 0, 0);
  return s;
}

function monthGridFor(dateValue) {
  const date = toDateObject(dateValue);
  const y = date.getFullYear(), m = date.getMonth();
  const start = startOfWeek(new Date(y, m, 1));
  const today = toISODate(new Date());
  return Array.from({ length: 42 }, (_, i) => {
    const cd = addDays(start, i);
    return { date: toISODate(cd), dayNumber: cd.getDate(), inMonth: cd.getMonth() === m, isToday: toISODate(cd) === today };
  });
}

function weekGridFor(dateValue) {
  const start = startOfWeek(toDateObject(dateValue));
  const today = toISODate(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const cd = addDays(start, i);
    return {
      date: toISODate(cd), dayNumber: cd.getDate(),
      label: cd.toLocaleDateString('en-SG', { weekday: 'short' }),
      isToday: toISODate(cd) === today,
    };
  });
}

function formatDateLabel(dateValue) {
  return toDateObject(dateValue).toLocaleDateString('en-SG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTimeRange(s, e) { return s + ' - ' + e; }

function normalizeAppointment(a) {
  return {
    id: a.id, patientId: a.patient_id, patientName: a.patient_name,
    caregiverId: a.caregiver_id, caregiverName: a.caregiver_name || 'Unassigned',
    date: a.date, startTime: a.start_time, endTime: a.end_time, status: a.status,
    appointmentType: a.appointment_type, bookingType: a.booking_type,
    caregiverGenderPreference: a.caregiver_gender_preference,
    locationMode: a.location_mode, locationText: a.location_text,
    latitude: a.latitude, longitude: a.longitude, tasks: a.tasks || [],
    specialInstructions: a.special_instructions || '', duration_mins: a.duration_mins,
  };
}

function toApiFormat(a) {
  return {
    patient_id: a.patientId, patient_name: a.patientName,
    caregiver_id: a.caregiverId, caregiver_name: a.caregiverName,
    date: a.date, start_time: a.startTime, end_time: a.endTime, status: a.status,
    appointment_type: a.appointmentType, booking_type: a.bookingType,
    caregiver_gender_preference: a.caregiverGenderPreference,
    location_mode: a.locationMode, location_text: a.locationText,
    latitude: a.latitude, longitude: a.longitude,
    tasks: a.tasks, special_instructions: a.specialInstructions, duration_mins: a.duration_mins,
  };
}

function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState('week');
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  const [hoveredDate, setHoveredDate] = useState(null);
  const [caregiverFilter, setCaregiverFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  const navigate = useNavigate();

  const loadAppointments = useCallback(() => {
    setLoading(true);
    fetchAppointments()
      .then((data) => setAppointments(data.map(normalizeAppointment)))
      .catch((err) => { console.error('Failed:', err); setAppointments([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const mc = !caregiverFilter || a.caregiverName.toLowerCase().includes(caregiverFilter.toLowerCase()) || (a.caregiverId||'').toLowerCase().includes(caregiverFilter.toLowerCase());
      const mp = !patientFilter || a.patientName.toLowerCase().includes(patientFilter.toLowerCase()) || (a.patientId||'').toLowerCase().includes(patientFilter.toLowerCase());
      return mc && mp && (statusFilter === 'All' || a.status === statusFilter) && (typeFilter === 'All' || a.appointmentType === typeFilter);
    });
  }, [appointments, caregiverFilter, patientFilter, statusFilter, typeFilter]);

  const selectedDayAppointments = useMemo(
    () => filteredAppointments.filter((a) => a.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [filteredAppointments, selectedDate]
  );

  const monthGrid = useMemo(() => monthGridFor(selectedDate), [selectedDate]);
  const weekGrid = useMemo(() => weekGridFor(selectedDate), [selectedDate]);
  const selectedDateSummary = useMemo(() => ({ upcoming: filteredAppointments.filter((a) => a.date >= selectedDate).length }), [filteredAppointments, selectedDate]);
  const selectedDayCount = selectedDayAppointments.length;

  const openEditModal = (appt) => { setEditForm({ ...appt }); setSaveError(''); setIsEditModalOpen(true); };
  const closeEditModal = () => { setIsEditModalOpen(false); setEditForm(null); setSaveError(''); };
  const handleEditFieldChange = (f, v) => setEditForm((p) => ({ ...p, [f]: v }));
  const handleEditTaskChange = (i, v) => setEditForm((p) => { const nt = [...(p.tasks||[])]; nt[i]=v; return {...p, tasks: nt}; });
  const handleAddEditTask = () => setEditForm((p) => ({ ...p, tasks: [...(p.tasks||[]), ''] }));
  const handleRemoveEditTask = (i) => setEditForm((p) => ({ ...p, tasks: (p.tasks||[]).filter((_, idx) => idx !== i) }));
  const handleSaveEdit = async () => {
    if (!editForm) return;
    setSaveBusy(true); setSaveError('');
    try { await updateAppointment(editForm.id, toApiFormat(editForm)); closeEditModal(); loadAppointments(); }
    catch (err) { setSaveError(err.message); } finally { setSaveBusy(false); }
  };
  const handleAppointmentClick = (appt) => openEditModal(appt);
  const handleSeeDetails = (date) => { setSelectedDate(date); setSelectedView('day'); };
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const currentTimePosition = useMemo(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }, []);
  const appointmentToPosition = (appt) => {
    const [sh, sm] = appt.startTime.split(':').map(Number);
    const [eh, em] = appt.endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    return { top: (startMins / 60) * 60, height: Math.max(((endMins - startMins) / 60) * 60, 20) };
  };

  return (
    <div className="appointments-page">
      <Topbar title="Appointments" subtitle="Schedule, track and resolve care visits across the week." />

      <div className="appointments-page__content">
        <Toolbar className="appointments-page__toolbar">
          <Segmented label="Change calendar view" value={selectedView} onChange={setSelectedView}
            options={[{ id: 'month', label: 'Month' }, { id: 'week', label: 'Week' }, { id: 'day', label: 'Day' }]} />
          <Input size="sm" type="text" value={caregiverFilter}
            onChange={(e) => setCaregiverFilter(e.target.value)}
            placeholder="Filter by caregiver name / ID" aria-label="Filter by caregiver" />
          <Input size="sm" type="text" value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            placeholder="Filter by patient name / ID" aria-label="Filter by patient" />
          <Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select size="sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
            <option value="All">All appointment types</option>
            <option value="Home Visit">Home Visit</option>
            <option value="Care Center">Care Center</option>
          </Select>
        </Toolbar>

        <StatGrid>
          <StatCard label="Selected date" value={formatDateLabel(selectedDate)} note="Click a day to change it" icon={'\u25a3'} />
          <StatCard label="Appointments" value={selectedDayCount}
            note={selectedDateSummary.upcoming + ' upcoming from this date'} icon={'\u25f7'} />
        </StatGrid>
        {/* MONTH VIEW */}
        {selectedView === 'month' && (
          <div className="appointments-page__calendar-grid">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((l) => (
              <div key={l} className="appointments-page__weekday-header">{l}</div>
            ))}
            {monthGrid.map((day) => {
              const dayAppts = filteredAppointments.filter((a) => a.date === day.date);
              const isHov = hoveredDate === day.date;
              const total = dayAppts.length;
              return (
                <div key={day.date}
                  className={[
                    'appointments-page__day-cell',
                    day.date === selectedDate ? 'appointments-page__day-cell--selected' : '',
                    day.inMonth ? '' : 'appointments-page__day-cell--muted',
                    isHov && day.inMonth ? 'appointments-page__day-cell--hovered' : '',
                  ].filter(Boolean).join(' ')}
                  onMouseEnter={() => day.inMonth && setHoveredDate(day.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  onClick={() => { setSelectedDate(day.date); setSelectedView('day'); }}
                >
                  <div className="appointments-page__day-topline">
                    <span className={day.isToday ? 'appointments-page__day-number--today' : ''}>
                      {day.dayNumber}
                      {day.isToday && <span className="appointments-page__today-dot" />}
                    </span>
                    {day.isToday && <span className="appointments-page__day-badge">Today</span>}
                  </div>
                  {dayAppts.length > 0 && (
                    <div className="appointments-page__day-stack">
                      {dayAppts.slice(0, 3).map((a) => (
                        <span key={a.id} className="appointments-page__mini-pill">
                          {a.startTime} &middot; {a.patientName.split(' ')[0]}
                        </span>
                      ))}
                      {total > 3 && <span className="appointments-page__mini-pill">+{total - 3} more</span>}
                      <span className="appointments-page__total-count">{total} total</span>
                    </div>
                  )}
                  {day.inMonth && total > 0 && <span className="appointments-page__see-details">See details</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* WEEK VIEW */}
        {selectedView === 'week' && (
          <div className="appointments-page__week-grid">
            {weekGrid.map((day) => {
              const dayAppts = filteredAppointments.filter((a) => a.date === day.date);
              const isHov = hoveredDate === day.date;
              const total = dayAppts.length;
              return (
                <div key={day.date}
                  className={[
                    'appointments-page__week-day',
                    day.date === selectedDate ? 'appointments-page__week-day--selected' : '',
                    isHov ? 'appointments-page__week-day--hovered' : '',
                  ].filter(Boolean).join(' ')}
                  onMouseEnter={() => setHoveredDate(day.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="appointments-page__week-day-header">
                    <span>{day.label}</span>
                    <strong className={day.isToday ? 'appointments-page__week-day-number--today' : ''}>
                      {day.dayNumber}
                      {day.isToday && <span className="appointments-page__today-dot" />}
                    </strong>
                  </div>
                  <div className="appointments-page__week-day-body">
                    {dayAppts.length === 0 ? (
                      <span className="appointments-page__empty-text">No visits</span>
                    ) : (
                      <>
                        {dayAppts.slice(0, 4).map((a) => (
                          <span key={a.id} className="appointments-page__event-chip">
                            {a.startTime} &middot; {a.patientName}
                          </span>
                        ))}
                        {total > 0 && <span className="appointments-page__total-count">{total} total</span>}
                      </>
                    )}
                  </div>
                  {total > 0 && (
                    <button type="button" className="appointments-page__see-details-btn"
                      onClick={(e) => { e.stopPropagation(); handleSeeDetails(day.date); }}>
                      See details
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* DAY VIEW */}
        {selectedView === 'day' && (
          <div className="appointments-page__day-panel">
            <div className="appointments-page__day-header">
              <h3>{formatDateLabel(selectedDate)}</h3>
              <div className="appointments-page__day-date-controls">
                <Button size="sm" aria-label="Previous day"
                  onClick={() => setSelectedDate(toISODate(addDays(toDateObject(selectedDate), -1)))}>{'\u2039'}</Button>
                <Button size="sm" onClick={() => setSelectedDate(toISODate(new Date()))}>Today</Button>
                <Button size="sm" aria-label="Next day"
                  onClick={() => setSelectedDate(toISODate(addDays(toDateObject(selectedDate), 1)))}>{'\u203a'}</Button>
              </div>
            </div>

            <div className="appointments-page__hour-grid">
              <div className="appointments-page__hour-labels">
                {HOURS.map((h) => (
                  <div key={h} className="appointments-page__hour-label">
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              <div className="appointments-page__hour-body">
                {HOURS.map((h) => <div key={h} className="appointments-page__hour-slot" />)}
                <div className="appointments-page__current-time-line"
                  style={{ top: (currentTimePosition / 60) * 60 + 'px' }} />
                {selectedDayAppointments.map((appt) => {
                  const { top, height } = appointmentToPosition(appt);
                  const sc = STATUS_COLORS[appt.status] || 'var(--color-primary)';
                  return (
                    <div key={appt.id} className="appointments-page__hour-appointment"
                      style={{ top: top + 'px', height: height + 'px', borderLeft: '4px solid ' + sc }}
                      onClick={() => handleAppointmentClick(appt)}>
                      <div className="appointments-page__hour-appt-header">
                        <strong>{appt.patientName}</strong>
                        <StatusPill status={appt.status} />
                      </div>
                      <div className="appointments-page__hour-appt-meta">
                        <span>{formatTimeRange(appt.startTime, appt.endTime)}</span>
                        <span>{appt.caregiverName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Edit Appointment" size="lg">
        {editForm && (
          <div className="appointments-page__modal-form">
            <div className="appointments-page__modal-grid">
              <div className="form-field">
                <label>Patient Name</label>
                <input type="text" value={editForm.patientName || ''}
                  onChange={(e) => handleEditFieldChange('patientName', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Caregiver Name</label>
                <input type="text" value={editForm.caregiverName || ''}
                  onChange={(e) => handleEditFieldChange('caregiverName', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Date</label>
                <input type="date" value={editForm.date || ''}
                  onChange={(e) => handleEditFieldChange('date', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Status</label>
                <select value={editForm.status || 'Scheduled'}
                  onChange={(e) => handleEditFieldChange('status', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Start Time</label>
                <input type="time" value={editForm.startTime || '09:00'}
                  onChange={(e) => handleEditFieldChange('startTime', e.target.value)} />
              </div>
              <div className="form-field">
                <label>End Time</label>
                <input type="time" value={editForm.endTime || '10:00'}
                  onChange={(e) => handleEditFieldChange('endTime', e.target.value)} />
              </div>
              <div className="form-field">
                <label>Appointment Type</label>
                <select value={editForm.appointmentType || 'Home Visit'}
                  onChange={(e) => handleEditFieldChange('appointmentType', e.target.value)}>
                  <option value="Home Visit">Home Visit</option>
                  <option value="Care Center">Care Center</option>
                </select>
              </div>
              <div className="form-field">
                <label>Booking Type</label>
                <select value={editForm.bookingType || 'One time'}
                  onChange={(e) => handleEditFieldChange('bookingType', e.target.value)}>
                  <option value="One time">One time</option>
                  <option value="Recurring">Recurring</option>
                </select>
              </div>
              <div className="form-field">
                <label>Gender Preference</label>
                <select value={editForm.caregiverGenderPreference || 'No preference'}
                  onChange={(e) => handleEditFieldChange('caregiverGenderPreference', e.target.value)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="No preference">No preference</option>
                </select>
              </div>
              <div className="form-field">
                <label>Location Mode</label>
                <select value={editForm.locationMode || 'address'}
                  onChange={(e) => handleEditFieldChange('locationMode', e.target.value)}>
                  <option value="address">Typed address</option>
                  <option value="pinpoint">Pinpoint on map</option>
                  <option value="center">Care center</option>
                </select>
              </div>
              <div className="form-field form-field--full">
                <label>Location / Address</label>
                <input type="text" value={editForm.locationText || ''}
                  onChange={(e) => handleEditFieldChange('locationText', e.target.value)}
                  placeholder="e.g. 12 Jalan Ampang, Kuala Lumpur" />
              </div>
              <div className="form-field form-field--full">
                <label>Tasks</label>
                <div className="appointments-page__task-editor">
                  {(editForm.tasks || []).map((task, idx) => (
                    <div key={'et-' + idx} className="appointments-page__task-row">
                      <input type="text" value={task}
                        onChange={(e) => handleEditTaskChange(idx, e.target.value)}
                        placeholder="Task description" />
                      <button type="button" onClick={() => handleRemoveEditTask(idx)}
                        aria-label="Remove task">{'\u00d7'}</button>
                    </div>
                  ))}
                  <button type="button" className="appointments-page__inline-add"
                    onClick={handleAddEditTask}>+ Add task</button>
                </div>
              </div>
              <div className="form-field form-field--full">
                <label>Special Instructions</label>
                <textarea value={editForm.specialInstructions || ''} maxLength={240}
                  onChange={(e) => handleEditFieldChange('specialInstructions', e.target.value)}
                  placeholder="Write any custom caregiver instructions for this visit." />
                <span className="form-field__hint">{(editForm.specialInstructions||'').length}/240 characters</span>
              </div>
              <div className="form-field form-field--full">
                <label>Location Map</label>
                <div className="appointments-page__map-placeholder">
                  OpenStreetMap integration coming soon.
                </div>
              </div>
            </div>

            {saveError && <p className="appointments-page__error">{saveError}</p>}

            <div className="appointments-page__modal-actions">
              <Button onClick={closeEditModal}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={saveBusy}>
                {saveBusy ? 'Saving\u2026' : 'Save changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AppointmentsPage;

