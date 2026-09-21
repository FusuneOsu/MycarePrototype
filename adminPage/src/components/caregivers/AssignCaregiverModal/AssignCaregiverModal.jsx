import { useEffect, useMemo, useState } from 'react';
import Modal from '../../common/Modal/Modal.jsx';
import StatusPill from '../StatusPill/StatusPill.jsx';
import { mockCaregivers } from '../../../data/mockCaregivers.js';
import { getAllAppointments } from '../../../data/mockAppointments.js';
import './AssignCaregiverModal.css';

const ANY_OPTION = 'Any';

function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

// A caregiver is busy if they already have a non-cancelled booking that
// overlaps the request's requested date/time window.
function findSchedulingClash(caregiverId, requestedDateISO, preferredStart, preferredEnd) {
  return getAllAppointments().find((appointment) => (
    appointment.caregiverId === caregiverId
    && appointment.date === requestedDateISO
    && !['Cancelled', 'Completed', 'Missed', 'No caregiver assigned'].includes(appointment.status)
    && timesOverlap(preferredStart, preferredEnd, appointment.startTime, appointment.endTime)
  ));
}

function AssignCaregiverModal({ isOpen, onClose, request, onAssign }) {
  const [filters, setFilters] = useState({ zone: ANY_OPTION, gender: ANY_OPTION, skill: ANY_OPTION, onlyAvailable: false });
  const [selectedCaregiver, setSelectedCaregiver] = useState('');

  // Pre-apply the patient's own zone/gender/skill preferences every time the
  // modal is opened for a request, instead of starting from "Any".
  useEffect(() => {
    if (!isOpen || !request) return;
    setFilters({
      zone: request.zone || ANY_OPTION,
      gender: request.genderPreference && request.genderPreference !== 'No preference' ? request.genderPreference : ANY_OPTION,
      skill: request.requiredSkill || ANY_OPTION,
      onlyAvailable: false,
    });
    setSelectedCaregiver('');
  }, [isOpen, request]);

  const zoneOptions = useMemo(() => Array.from(new Set(mockCaregivers.map((c) => c.center))).sort(), []);
  const genderOptions = useMemo(() => Array.from(new Set(mockCaregivers.map((c) => c.gender))).sort(), []);
  const skillOptions = useMemo(() => Array.from(new Set(mockCaregivers.flatMap((c) => c.skills || []))).sort(), []);

  // Flags scheduling clashes against booked appointments, then surfaces the
  // nearest, free-at-the-requested-time matches first.
  const rows = useMemo(() => {
    return mockCaregivers
      .filter((c) => filters.zone === ANY_OPTION || c.center === filters.zone)
      .filter((c) => filters.gender === ANY_OPTION || c.gender === filters.gender)
      .filter((c) => filters.skill === ANY_OPTION || (c.skills || []).includes(filters.skill))
      .map((c) => {
        const clash = request ? findSchedulingClash(c.id, request.requestedDateISO, request.preferredStart, request.preferredEnd, request.id) : null;
        const isAssignable = (c.availability === 'Available' || c.availability === 'On Duty') && !clash;
        return { ...c, clash, isAssignable };
      })
      .filter((c) => !filters.onlyAvailable || c.isAssignable)
      .sort((a, b) => {
        const aNearby = request && a.center === request.zone ? 0 : 1;
        const bNearby = request && b.center === request.zone ? 0 : 1;
        if (aNearby !== bNearby) return aNearby - bNearby;
        if (a.isAssignable !== b.isAssignable) return a.isAssignable ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [filters, request]);

  const setFilter = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));
  const resetFilters = () => setFilters({ zone: ANY_OPTION, gender: ANY_OPTION, skill: ANY_OPTION, onlyAvailable: false });

  const handleClose = () => {
    setSelectedCaregiver('');
    resetFilters();
    onClose();
  };

  const handleConfirm = () => {
    const caregiver = mockCaregivers.find((c) => c.id === selectedCaregiver);
    if (!caregiver) return;
    onAssign(caregiver);
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Assign a caregiver" size="lg">
      {request && (
        <p className="assign-caregiver-modal__context">
          Matching against <strong>{request.zone}</strong> · <strong>{request.genderPreference}</strong> preferred
          {request.requiredSkill ? <> · <strong>{request.requiredSkill}</strong></> : null} · <strong>{request.requestedDate}, {request.preferredTime}</strong>
        </p>
      )}

      <div className="assign-caregiver-modal__filters">
        <select value={filters.zone} onChange={(event) => setFilter('zone', event.target.value)} aria-label="Filter by zone">
          <option value={ANY_OPTION}>Any zone</option>
          {zoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        </select>
        <select value={filters.gender} onChange={(event) => setFilter('gender', event.target.value)} aria-label="Filter by gender">
          <option value={ANY_OPTION}>Any gender</option>
          {genderOptions.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
        </select>
        <select value={filters.skill} onChange={(event) => setFilter('skill', event.target.value)} aria-label="Filter by specialization">
          <option value={ANY_OPTION}>Any specialization</option>
          {skillOptions.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
        </select>
        <label className="assign-caregiver-modal__toggle">
          <input type="checkbox" checked={filters.onlyAvailable} onChange={(event) => setFilter('onlyAvailable', event.target.checked)} />
          Only free at requested time
        </label>
        <button type="button" className="assign-caregiver-modal__reset" onClick={resetFilters}>Clear</button>
      </div>

      <div className="assign-caregiver-table-wrap">
        <table className="assign-caregiver-table">
          <thead>
            <tr>
              <th aria-label="Select" />
              <th>ID</th>
              <th>Name</th>
              <th>Gender</th>
              <th>Zone</th>
              <th>Specialization</th>
              <th>Availability</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="assign-caregiver-table__empty">No caregivers match these filters.</td></tr>
            )}
            {rows.map((caregiver) => (
              <tr key={caregiver.id} className={!caregiver.isAssignable ? 'assign-caregiver-table__row--disabled' : ''}>
                <td>
                  <input
                    type="radio"
                    name="assign-caregiver"
                    value={caregiver.id}
                    checked={selectedCaregiver === caregiver.id}
                    disabled={!caregiver.isAssignable}
                    onChange={() => setSelectedCaregiver(caregiver.id)}
                    aria-label={`Select ${caregiver.name}`}
                  />
                </td>
                <td className="assign-caregiver-table__id">{caregiver.id}</td>
                <td>{caregiver.name}</td>
                <td>{caregiver.gender}</td>
                <td>{caregiver.center}</td>
                <td>{(caregiver.skills || []).join(', ') || '—'}</td>
                <td><StatusPill status={caregiver.clash ? 'Busy' : caregiver.availability} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="assign-caregiver-modal__footer">
        <button type="button" className="assign-caregiver-modal__cancel" onClick={handleClose}>Cancel</button>
        <button type="button" className="assign-caregiver-modal__confirm" disabled={!selectedCaregiver} onClick={handleConfirm}>Confirm booking</button>
      </div>
    </Modal>
  );
}

export default AssignCaregiverModal;
