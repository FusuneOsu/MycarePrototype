import { useState } from 'react';
import { listBookableCaregivers } from '../../data/caregiverAccounts.js';
import { formatRating } from '../../../../shared/bookingHistory.js';
import {
  matchCaregivers, filterMatches, confirmBooking, priceFor, endTimeOf,
  formatDate, formatDuration, formatMoney, SERVICE_RATES
} from '../../../../shared/bookingStore.js';
import { DURATIONS, calendarCommitments, Check } from '../../utils/patientRequestUtils.jsx';
import { Button, Card, CellStack, Field, Input, SectionHeader, Segmented, Select, Table, Tag } from '../../../../shared/ui/index.js';

/**
 * Caregiver finder — search, filter, and book a caregiver for a request.
 *
 * Props:
 *   request  — request object from bookingStore
 *   onBooked — called with the newly created booking object
 */
export default function CaregiverFinder({ request, onBooked }) {
  const [slot, setSlot] = useState({
    date: request.preferredDate,
    startTime: request.preferredStart,
    durationMins: request.durationMins,
    rate: SERVICE_RATES[request.careType] || 40,
  });
  const [filters, setFilters] = useState({
    location: 'zone',
    radiusKm: 10,
    availability: true,
    gender: request.preferredGender !== 'No preference',
    skill: false,
  });
  const [selectedId, setSelectedId] = useState('');

  const setSlotField = (field) => (event) => setSlot((prev) => ({ ...prev, [field]: event.target.value }));
  const toggle = (field) => setFilters((prev) => ({ ...prev, [field]: !prev[field] }));

  const matches = matchCaregivers(request, listBookableCaregivers(), slot, calendarCommitments);
  const visible = filterMatches(matches, filters);
  const selected = visible.find((match) => match.caregiver.id === selectedId) || null;
  const price = priceFor(slot.rate, slot.durationMins);

  const confirm = () => {
    const booking = confirmBooking({
      request,
      caregiver: selected.caregiver,
      date: slot.date,
      startTime: slot.startTime,
      durationMins: slot.durationMins,
      rate: slot.rate,
    });
    onBooked(booking);
  };

  return (
    <Card padded className="finder">
      <SectionHeader
        eyebrow="Assignment"
        title="Find an available caregiver"
        intro="Filter the Active caregiver pool for this request, pick one, and confirm the booking."
      />

      <div className="finder-slot">
        <Field label="Date"><Input type="date" value={slot.date} onChange={setSlotField('date')} /></Field>
        <Field label="Start time"><Input type="time" value={slot.startTime} onChange={setSlotField('startTime')} /></Field>
        <Field label="Duration">
          <Select value={slot.durationMins} onChange={(e) => setSlot((prev) => ({ ...prev, durationMins: Number(e.target.value) }))}>
            {[...new Set([...DURATIONS, request.durationMins])].sort((a, b) => a - b).map((mins) => (
              <option key={mins} value={mins}>{formatDuration(mins)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Rate (RM / hour)">
          <Input type="number" min="0" step="1" value={slot.rate} onChange={setSlotField('rate')} />
        </Field>
      </div>

      <div className="finder-filters">
        <div className="finder-filter">
          <span className="finder-filter__label">Location</span>
          <Segmented
            label="Location filter"
            value={filters.location}
            onChange={(location) => setFilters((prev) => ({ ...prev, location }))}
            options={[
              { id: 'zone', label: `Covers ${request.area}` },
              { id: 'radius', label: 'Within radius' },
              { id: 'any', label: 'Anywhere' },
            ]}
          />
          {filters.location === 'radius' && (
            <Select
              size="sm"
              value={filters.radiusKm}
              onChange={(e) => setFilters((prev) => ({ ...prev, radiusKm: Number(e.target.value) }))}
              aria-label="Radius"
            >
              {[5, 10, 15, 25].map((km) => <option key={km} value={km}>{km} km</option>)}
            </Select>
          )}
        </div>
        <label className="ui-check">
          <input type="checkbox" checked={filters.availability} onChange={() => toggle('availability')} />
          {' '}Free at this time (no clash)
        </label>
        <label className="ui-check">
          <input type="checkbox" checked={filters.gender} onChange={() => toggle('gender')}
            disabled={request.preferredGender === 'No preference'} />
          {' '}Matches gender preference{request.preferredGender !== 'No preference' ? ` (${request.preferredGender})` : ''}
        </label>
        <label className="ui-check">
          <input type="checkbox" checked={filters.skill} onChange={() => toggle('skill')} />
          {' '}Specialises in {request.careType.toLowerCase()}
        </label>
      </div>

      <p className="finder-count">{visible.length} of {matches.length} Active caregivers match · nearest first</p>

      <Table
        columns={['', 'Caregiver', 'Distance', 'Availability', 'Gender', 'Skill', 'Rating']}
        label="Matching caregivers"
        empty={visible.length === 0 && 'No caregiver matches every filter. Try "Within radius", another time, or turn a filter off.'}
      >
        {visible.map((match) => (
          <tr key={match.caregiver.id} onClick={() => setSelectedId(match.caregiver.id)}
            className={selectedId === match.caregiver.id ? 'finder-row--selected' : undefined}
            style={{ cursor: 'pointer' }}>
            <td>
              <input type="radio" name="caregiver" checked={selectedId === match.caregiver.id}
                onChange={() => setSelectedId(match.caregiver.id)} aria-label={`Select ${match.caregiver.name}`} />
            </td>
            <td>
              <CellStack primary={match.caregiver.name} secondary={`${match.caregiver.id} · ${match.caregiver.center}`}>
                {match.caregiver.source === 'application' && <Tag>New</Tag>}
              </CellStack>
            </td>
            <td>
              <CellStack primary={match.distanceKm === null ? '—' : `${match.distanceKm} km`}
                secondary={match.inZone ? `Covers ${request.area}` : 'Outside zone'} />
            </td>
            <td><Check ok={match.available}>{match.availabilityNote}</Check></td>
            <td><Check ok={match.genderMatch}>{match.caregiver.gender}</Check></td>
            <td><Check ok={match.skillMatch}>{match.skillMatch ? request.careType : 'Not listed'}</Check></td>
            <td className="ui-table__muted">{formatRating(match.caregiver.bookingSummary)}</td>
          </tr>
        ))}
      </Table>

      <div className="finder-confirm">
        <div>
          <strong>{selected ? selected.caregiver.name : 'Select a caregiver'}</strong>
          <span>{formatDate(slot.date)} · {slot.startTime}–{endTimeOf(slot.startTime, slot.durationMins)} · {formatDuration(slot.durationMins)} · {request.careType}</span>
        </div>
        <div className="finder-confirm__price"><span>Booking price</span><strong>{formatMoney(price)}</strong></div>
        <Button variant="primary" disabled={!selected || !slot.date || !slot.startTime || !(Number(slot.rate) > 0)} onClick={confirm}>Confirm booking</Button>
      </div>
      <p className="finder-hint">Confirming saves the booking, marks the request Booked, and notifies the patient on WhatsApp and the caregiver in their app.</p>
    </Card>
  );
}
