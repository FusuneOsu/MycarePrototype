import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import Modal from '../../components/common/Modal/Modal.jsx';
import { mockCaregivers } from '../../data/mockCaregivers.js';
import { mockPatients } from '../../data/mockPatients.js';
import { getAllAppointments } from '../../data/mockAppointments.js';
import { mockRequests, getEffectiveRequest } from '../../data/mockRequests.js';
import StatusPill from '../../components/caregivers/StatusPill/StatusPill.jsx';
import './AppointmentsPage.css';

const STATUS_OPTIONS = [
  'Caregiver assigned',
  'Scheduled',
  'In progress',
  'Cancelled',
  'Missed',
  'Completed',
  'No caregiver assigned',
];

const APPOINTMENT_TYPES = ['Home Visit', 'Care Center'];
const BOOKING_TYPES = ['One time', 'Recurring'];
const CARE_CENTER_OPTIONS = [
  'Bangsar Care Centre',
  'Sungai Buloh Care Centre',
  'Cyberjaya Care Centre',
  'Petaling Jaya Care Centre',
];
const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, index) => {
  const totalMinutes = index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

function toISODate(date) {
  const localDate = new Date(date);
  const offset = localDate.getTimezoneOffset();
  const adjusted = new Date(localDate.getTime() - offset * 60000);
  return adjusted.toISOString().slice(0, 10);
}

function toDateObject(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date) {
  const start = new Date(date);
  const day = start.getDay();
  const offset = (day === 0 ? -6 : 1 - day);
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function monthGridFor(dateValue) {
  const date = toDateObject(dateValue);
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const start = startOfWeek(firstDayOfMonth);
  const days = [];

  for (let i = 0; i < 42; i += 1) {
    const currentDay = addDays(start, i);
    days.push({
      date: toISODate(currentDay),
      dayNumber: currentDay.getDate(),
      inMonth: currentDay.getMonth() === month,
      isToday: toISODate(currentDay) === toISODate(new Date()),
    });
  }

  return days;
}

function weekGridFor(dateValue) {
  const date = toDateObject(dateValue);
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => {
    const currentDay = addDays(start, index);
    return {
      date: toISODate(currentDay),
      dayNumber: currentDay.getDate(),
      label: currentDay.toLocaleDateString('en-SG', { weekday: 'short' }),
      isToday: toISODate(currentDay) === toISODate(new Date()),
    };
  });
}

function formatDateLabel(dateValue) {
  const date = toDateObject(dateValue);
  return date.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeRange(startTime, endTime) {
  return `${startTime} - ${endTime}`;
}

function getDurationMinutes(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return Math.max(endTotal - startTotal, 0);
}

function getInitialForm(selectedDate) {
  return {
    patientSearch: '',
    selectedPatientId: '',
    caregiverId: '',
    caregiverGenderPreference: 'No preference',
    appointmentType: 'Home Visit',
    bookingType: 'One time',
    date: selectedDate,
    startTime: '09:00',
    endTime: '10:00',
    locationMode: 'address',
    locationAddress: '',
    locationPin: '',
    centerLocation: 'Bangsar Care Centre',
    tasks: [''],
    specialInstructions: '',
    recurringPattern: 'Weekly',
    recurrenceEndDate: selectedDate,
  };
}

function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState(getAllAppointments);
  const [selectedView, setSelectedView] = useState('week');
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState(() => getInitialForm(selectedDate));
  const [caregiverFilter, setCaregiverFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);

  const patientMap = useMemo(
    () => new Map(mockPatients.map((patient) => [patient.id, patient])),
    []
  );

  const caregiverMap = useMemo(
    () => new Map(mockCaregivers.map((caregiver) => [caregiver.id, caregiver])),
    []
  );

  const patientSuggestions = useMemo(() => {
    const query = form.patientSearch.trim().toLowerCase();
    if (!query) return mockPatients.slice(0, 6);

    return mockPatients.filter((patient) => {
      const haystack = `${patient.name} ${patient.id} ${patient.preferredLanguage}`.toLowerCase();
      return haystack.includes(query);
    }).slice(0, 6);
  }, [form.patientSearch]);

  const caregiverSuggestions = useMemo(() => {
    const query = form.caregiverId.trim().toLowerCase();
    if (!query) return mockCaregivers.slice(0, 6);

    return mockCaregivers.filter((caregiver) => {
      const haystack = `${caregiver.name} ${caregiver.id}`.toLowerCase();
      return haystack.includes(query);
    }).slice(0, 6);
  }, [form.caregiverId]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesCaregiver =
        !caregiverFilter ||
        appointment.caregiverName.toLowerCase().includes(caregiverFilter.toLowerCase()) ||
        appointment.caregiverId.toLowerCase().includes(caregiverFilter.toLowerCase());

      const matchesPatient =
        !patientFilter ||
        appointment.patientName.toLowerCase().includes(patientFilter.toLowerCase()) ||
        appointment.patientId.toLowerCase().includes(patientFilter.toLowerCase());

      const matchesStatus = statusFilter === 'All' || appointment.status === statusFilter;
      const matchesType = typeFilter === 'All' || appointment.appointmentType === typeFilter;
      const matchesConflict = !showConflictsOnly || Boolean(appointment.isConflict);

      return matchesCaregiver && matchesPatient && matchesStatus && matchesType && matchesConflict;
    });
  }, [appointments, caregiverFilter, patientFilter, statusFilter, typeFilter, showConflictsOnly]);

  const selectedDayAppointments = useMemo(
    () => filteredAppointments
      .filter((appointment) => appointment.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [filteredAppointments, selectedDate]
  );

  const monthGrid = useMemo(() => monthGridFor(selectedDate), [selectedDate]);
  const weekGrid = useMemo(() => weekGridFor(selectedDate), [selectedDate]);

  const selectedDateSummary = useMemo(
    () => ({
      upcoming: filteredAppointments.filter((appointment) => appointment.date >= selectedDate).length,
      conflicts: filteredAppointments.filter((appointment) => appointment.isConflict).length,
    }),
    [filteredAppointments, selectedDate]
  );

  const openAddModal = () => {
    setForm(getInitialForm(selectedDate));
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleNewAppointment = () => {
    if (!form.selectedPatientId) return;

    const patient = patientMap.get(form.selectedPatientId);
    const caregiver = form.caregiverId ? caregiverMap.get(form.caregiverId) : null;

    const durationMinutes = getDurationMinutes(form.startTime, form.endTime);
    const newAppointment = {
      id: `AP-${String(Math.max(...appointments.map((item) => Number(item.id.replace(/\D/g, ''))), 3000) + 1)}`,
      patientId: patient.id,
      patientName: patient.name,
      caregiverId: caregiver ? caregiver.id : 'UNASSIGNED',
      caregiverName: caregiver ? caregiver.name : 'Unassigned',
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      status: caregiver ? 'Scheduled' : 'No caregiver assigned',
      appointmentType: form.appointmentType,
      bookingType: form.bookingType,
      caregiverGenderPreference: form.caregiverGenderPreference,
      locationMode: form.appointmentType === 'Home Visit' ? form.locationMode : 'center',
      locationText:
        form.appointmentType === 'Home Visit'
          ? form.locationMode === 'address'
            ? form.locationAddress || 'Address pending'
            : form.locationPin || 'Pinpointed location'
          : form.centerLocation,
      latitude: form.locationMode === 'pinpoint' ? '3.1390' : null,
      longitude: form.locationMode === 'pinpoint' ? '101.6869' : null,
      tasks: form.tasks.filter(Boolean),
      specialInstructions: form.specialInstructions.slice(0, 240),
      duration_mins: durationMinutes,
      isConflict: false,
    };

    setAppointments((prev) => [newAppointment, ...prev]);
    setSelectedDate(form.date);
    setSelectedView('day');
    closeAddModal();
  };

  const updateTask = (index, value) => {
    setForm((prev) => {
      const nextTasks = [...prev.tasks];
      nextTasks[index] = value;
      return { ...prev, tasks: nextTasks };
    });
  };

  const addTask = () => {
    setForm((prev) => ({ ...prev, tasks: [...prev.tasks, ''] }));
  };

  const removeTask = (index) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const selectedDayCount = selectedDayAppointments.length;

  // Read-only view of caregiver assignments made from the Requests flow —
  // the calendar above is untouched; this just surfaces what's been booked.
  const requestsWithAssignments = useMemo(
    () => mockRequests.map((item) => getEffectiveRequest(item.id)),
    []
  );

  return (
    <div className="appointments-page">
      <Topbar
        title="Appointments"
        subtitle="Schedule, track and resolve care visits across the week."
      />

      <div className="appointments-page__content">
        <div className="appointments-page__toolbar">
          <div className="appointments-page__view-toggle" role="tablist" aria-label="Change calendar view">
            {['month', 'week', 'day'].map((view) => (
              <button
                key={view}
                type="button"
                className={`appointments-page__view-button ${selectedView === view ? 'appointments-page__view-button--active' : ''}`}
                onClick={() => setSelectedView(view)}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>

          <button type="button" className="appointments-page__add-button" onClick={openAddModal}>
            + Add appointment
          </button>
        </div>

        <div className="appointments-page__filters">
          <input
            type="text"
            value={caregiverFilter}
            onChange={(event) => setCaregiverFilter(event.target.value)}
            placeholder="Filter by caregiver name / ID"
          />
          <input
            type="text"
            value={patientFilter}
            onChange={(event) => setPatientFilter(event.target.value)}
            placeholder="Filter by patient name / ID"
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="All">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="All">All appointment types</option>
            {APPOINTMENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <label className="appointments-page__checkbox">
            <input
              type="checkbox"
              checked={showConflictsOnly}
              onChange={(event) => setShowConflictsOnly(event.target.checked)}
            />
            Conflicted only
          </label>
        </div>

        <div className="appointments-page__summary">
          <div className="appointments-page__stat">
            <span>Selected date</span>
            <strong>{formatDateLabel(selectedDate)}</strong>
          </div>
          <div className="appointments-page__stat">
            <span>Appointments</span>
            <strong>{selectedDayCount}</strong>
          </div>
          <div className="appointments-page__stat appointments-page__stat--warning">
            <span>Conflicts</span>
            <strong>{selectedDateSummary.conflicts}</strong>
          </div>
        </div>

        <div className="appointments-page__requests-panel">
          <div className="appointments-page__requests-panel-header">
            <h3>Patient requests</h3>
            <span>Caregiver assignments made from the Requests queue</span>
          </div>
          <div className="appointments-page__requests-list">
            {requestsWithAssignments.map((request) => (
              <button
                type="button"
                key={request.id}
                className="appointments-page__request-row"
                onClick={() => navigate(`/requests/${request.id}`)}
              >
                <span className="appointments-page__request-row-main">
                  <strong>{request.patientName}</strong>
                  <small>{request.id} · {request.requestedDate}, {request.preferredTime}</small>
                </span>
                <span className="appointments-page__request-row-caregiver">
                  {request.caregiverName || 'Unassigned'}
                </span>
                <StatusPill status={request.status} />
              </button>
            ))}
          </div>
        </div>

        {selectedView === 'month' && (
          <div className="appointments-page__calendar-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
              <div key={label} className="appointments-page__weekday-header">{label}</div>
            ))}

            {monthGrid.map((day) => {
              const dayAppointmentsForCell = filteredAppointments.filter((appointment) => appointment.date === day.date);
              return (
                <button
                  key={day.date}
                  type="button"
                  className={`appointments-page__day-cell ${day.date === selectedDate ? 'appointments-page__day-cell--selected' : ''} ${day.inMonth ? '' : 'appointments-page__day-cell--muted'}`}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setSelectedView('day');
                  }}
                >
                  <div className="appointments-page__day-topline">
                    <span>{day.dayNumber}</span>
                    {day.isToday && <span className="appointments-page__day-badge">Today</span>}
                  </div>
                  {dayAppointmentsForCell.length > 0 && (
                    <div className="appointments-page__day-stack">
                      {dayAppointmentsForCell.slice(0, 3).map((appointment) => (
                        <span
                          key={appointment.id}
                          className={`appointments-page__mini-pill ${appointment.isConflict ? 'appointments-page__mini-pill--warning' : ''}`}
                        >
                          {appointment.startTime} · {appointment.patientName.split(' ')[0]}
                        </span>
                      ))}
                      {dayAppointmentsForCell.length > 3 && (
                        <span className="appointments-page__mini-pill">+{dayAppointmentsForCell.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedView === 'week' && (
          <div className="appointments-page__week-grid">
            {weekGrid.map((day) => {
              const dayAppointmentsForCell = filteredAppointments.filter((appointment) => appointment.date === day.date);
              return (
                <button
                  key={day.date}
                  type="button"
                  className={`appointments-page__week-day ${day.date === selectedDate ? 'appointments-page__week-day--selected' : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="appointments-page__week-day-header">
                    <span>{day.label}</span>
                    <strong>{day.dayNumber}</strong>
                  </div>
                  <div className="appointments-page__week-day-body">
                    {dayAppointmentsForCell.length === 0 ? (
                      <span className="appointments-page__empty-text">No visits</span>
                    ) : (
                      dayAppointmentsForCell.slice(0, 4).map((appointment) => (
                        <span
                          key={appointment.id}
                          className={`appointments-page__event-chip ${appointment.isConflict ? 'appointments-page__event-chip--warning' : ''}`}
                        >
                          {appointment.startTime} · {appointment.patientName}
                        </span>
                      ))
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedView === 'day' && (
          <div className="appointments-page__day-panel">
            <div className="appointments-page__day-header">
              <h3>{formatDateLabel(selectedDate)}</h3>
              <div className="appointments-page__day-date-controls">
                <button type="button" onClick={() => setSelectedDate(toISODate(addDays(toDateObject(selectedDate), -1)))}>{'<'}</button>
                <button type="button" onClick={() => setSelectedDate(toISODate(new Date()))}>Today</button>
                <button type="button" onClick={() => setSelectedDate(toISODate(addDays(toDateObject(selectedDate), 1)))}>{'>'}</button>
              </div>
            </div>

            <div className="appointments-page__visit-list">
              {selectedDayAppointments.length === 0 ? (
                <div className="appointments-page__empty-card">No appointments scheduled for this day.</div>
              ) : (
                selectedDayAppointments.map((appointment) => (
                  <article
                    key={appointment.id}
                    className={`appointments-page__visit-card ${appointment.isConflict ? 'appointments-page__visit-card--warning' : ''}`}
                  >
                    <div className="appointments-page__visit-card-header">
                      <div>
                        <h4>{appointment.patientName}</h4>
                        <p>{appointment.patientId}</p>
                      </div>
                      <span className={`appointments-page__status-pill appointments-page__status-pill--${appointment.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {appointment.status}
                      </span>
                    </div>

                    <div className="appointments-page__visit-meta">
                      <span>{appointment.caregiverName}</span>
                      <span>{appointment.appointmentType}</span>
                      <span>{appointment.bookingType}</span>
                    </div>

                    <div className="appointments-page__visit-meta">
                      <span>{formatTimeRange(appointment.startTime, appointment.endTime)}</span>
                      <span>{appointment.locationText}</span>
                    </div>

                    {appointment.isConflict && (
                      <div className="appointments-page__conflict-banner">Conflict flagged: caregiver/time overlap detected.</div>
                    )}

                    {appointment.tasks && appointment.tasks.length > 0 && (
                      <div className="appointments-page__task-list">
                        {appointment.tasks.map((task) => (
                          <span key={`${appointment.id}-${task}`} className="appointments-page__task-chip">
                            {task}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={closeAddModal} title="Add Appointment" size="lg">
        <div className="appointments-page__modal-form">
          <div className="appointments-page__modal-grid">
            <div className="form-field">
              <label>Patient</label>
              <input
                type="text"
                value={form.patientSearch}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setForm((prev) => ({ ...prev, patientSearch: nextValue }));
                  if (!nextValue.trim()) {
                    setForm((prev) => ({ ...prev, selectedPatientId: '' }));
                  }
                }}
                placeholder="Search patient by name or ID"
              />
              {form.patientSearch && (
                <div className="appointments-page__autocomplete">
                  {patientSuggestions.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      className="appointments-page__suggestion-item"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          patientSearch: patient.name,
                          selectedPatientId: patient.id,
                        }));
                      }}
                    >
                      <strong>{patient.name}</strong>
                      <span>{patient.id}</span>
                      <span>{patient.preferredLanguage}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-field">
              <label>Assigned caregiver</label>
              <input
                type="text"
                value={form.caregiverId}
                onChange={(event) => setForm((prev) => ({ ...prev, caregiverId: event.target.value }))}
                placeholder="Search caregiver by name or ID"
              />
              {form.caregiverId && (
                <div className="appointments-page__autocomplete">
                  {caregiverSuggestions.map((caregiver) => (
                    <button
                      key={caregiver.id}
                      type="button"
                      className="appointments-page__suggestion-item"
                      onClick={() => setForm((prev) => ({ ...prev, caregiverId: caregiver.id }))}
                    >
                      <strong>{caregiver.name}</strong>
                      <span>{caregiver.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-field">
              <label>Caregiver gender preference</label>
              <select
                value={form.caregiverGenderPreference}
                onChange={(event) => setForm((prev) => ({ ...prev, caregiverGenderPreference: event.target.value }))}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="No preference">No preference</option>
              </select>
            </div>

            <div className="form-field">
              <label>Appointment Type</label>
              <select
                value={form.appointmentType}
                onChange={(event) => setForm((prev) => ({ ...prev, appointmentType: event.target.value }))}
              >
                {APPOINTMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Booking Type</label>
              <select
                value={form.bookingType}
                onChange={(event) => setForm((prev) => ({ ...prev, bookingType: event.target.value }))}
              >
                {BOOKING_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>{form.bookingType === 'Recurring' ? 'Recurrence pattern' : 'Date of appointment'}</label>
              {form.bookingType === 'Recurring' ? (
                <select
                  value={form.recurringPattern}
                  onChange={(event) => setForm((prev) => ({ ...prev, recurringPattern: event.target.value }))}
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              ) : (
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              )}
            </div>

            {form.bookingType === 'One time' && (
              <>
                <div className="form-field">
                  <label>Start time</label>
                  <select
                    value={form.startTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>End time</label>
                  <select
                    value={form.endTime}
                    onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="form-field form-field--full">
              <label>Duration</label>
              <input
                readOnly
                value={`${getDurationMinutes(form.startTime, form.endTime)} minutes`}
              />
            </div>

            {form.appointmentType === 'Home Visit' ? (
              <>
                <div className="form-field">
                  <label>Location mode</label>
                  <select
                    value={form.locationMode}
                    onChange={(event) => setForm((prev) => ({ ...prev, locationMode: event.target.value }))}
                  >
                    <option value="address">Typed address</option>
                    <option value="pinpoint">Pinpoint on map</option>
                  </select>
                </div>

                {form.locationMode === 'address' ? (
                  <div className="form-field form-field--full">
                    <label>Exact address</label>
                    <input
                      type="text"
                      value={form.locationAddress}
                      onChange={(event) => setForm((prev) => ({ ...prev, locationAddress: event.target.value }))}
                      placeholder="e.g. 12 Jalan Ampang, Kuala Lumpur"
                    />
                  </div>
                ) : (
                  <div className="form-field form-field--full">
                    <label>Pinpoint location</label>
                    <input
                      type="text"
                      value={form.locationPin}
                      onChange={(event) => setForm((prev) => ({ ...prev, locationPin: event.target.value }))}
                      placeholder="Lat / Lon or map pinpoint label"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="form-field form-field--full">
                <label>Care centre</label>
                <select
                  value={form.centerLocation}
                  onChange={(event) => setForm((prev) => ({ ...prev, centerLocation: event.target.value }))}
                >
                  {CARE_CENTER_OPTIONS.map((center) => (
                    <option key={center} value={center}>{center}</option>
                  ))}
                </select>
              </div>
            )}

            {form.bookingType === 'Recurring' && (
              <div className="form-field form-field--full">
                <label>Recurrence end date</label>
                <input
                  type="date"
                  value={form.recurrenceEndDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, recurrenceEndDate: event.target.value }))}
                />
              </div>
            )}

            <div className="form-field form-field--full">
              <label>Tasks for caregiver</label>
              <div className="appointments-page__task-editor">
                {form.tasks.map((task, index) => (
                  <div key={`task-${index}`} className="appointments-page__task-row">
                    <input
                      type="text"
                      value={task}
                      onChange={(event) => updateTask(index, event.target.value)}
                      placeholder="Task description"
                    />
                    <button type="button" onClick={() => removeTask(index)} aria-label="Remove task">×</button>
                  </div>
                ))}
                <button type="button" className="appointments-page__inline-add" onClick={addTask}>
                  + Add task
                </button>
              </div>
            </div>

            <div className="form-field form-field--full">
              <label>Special instructions</label>
              <textarea
                value={form.specialInstructions}
                maxLength={240}
                onChange={(event) => setForm((prev) => ({ ...prev, specialInstructions: event.target.value }))}
                placeholder="Write any custom caregiver instructions for this visit."
              />
              <span className="form-field__hint">{form.specialInstructions.length}/240 characters</span>
            </div>
          </div>

          <div className="appointments-page__modal-actions">
            <button type="button" className="appointments-page__ghost-button" onClick={closeAddModal}>
              Cancel
            </button>
            <button
              type="button"
              className="appointments-page__primary-button"
              onClick={handleNewAppointment}
              disabled={!form.selectedPatientId || !form.startTime || !form.endTime}
            >
              Save appointment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AppointmentsPage;
