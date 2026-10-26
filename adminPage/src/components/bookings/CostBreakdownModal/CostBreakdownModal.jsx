import { useState, useEffect, useMemo } from 'react';
import {
  formatDuration,
  buildCostBreakdown, overrideCostBreakdown,
} from '../../../../../shared/bookingStore.js';
import { getSiteById } from '../../../../../shared/careVocabulary.js';
import { Modal } from '../../../../../shared/ui/Modal.jsx';

const fmt = (n) => Number(n || 0).toFixed(2);

function Row({ label, value, indent, highlight }) {
  return (
    <div className={`cbm-row${indent ? ' cbm-row--indent' : ''}${highlight ? ' cbm-row--highlight' : ''}`}>
      <span className="cbm-row__label">{label}</span>
      <span className="cbm-row__value">RM {fmt(value)}</span>
    </div>
  );
}

function EditableField({ label, value, onChange, suffix, step, min, disabled }) {
  return (
    <div className="cbm-field">
      <label className="cbm-field__label">{label}</label>
      <div className="cbm-field__input-group">
        <input
          type="number"
          step={step || '0.01'}
          min={min != null ? min : '0'}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled}
          className="cbm-field__input"
        />
        {suffix && <span className="cbm-field__suffix">{suffix}</span>}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="cbm-section">
      <h4 className="cbm-section__title">{title}</h4>
      {children}
    </div>
  );
}

/**
 * Cost Breakdown Modal — view and edit a booking's itemised cost breakdown.
 *
 * Props:
 *   booking         — the booking object (with costBreakdown or cost_breakdown)
 *   caregiver       — the caregiver object (for baseSiteId lookup)
 *   onSave          — (updatedBreakdown) => void
 *   onClose         — () => void
 *   readOnly        — boolean (default false)
 */
export default function CostBreakdownModal({ booking, caregiver, onSave, onClose, readOnly = false }) {
  const [breakdown, setBreakdown] = useState(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [travelBaseFee, setTravelBaseFee] = useState(0);
  const [travelRatePerKm, setTravelRatePerKm] = useState(1.50);
  const [tollFee, setTollFee] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(40);
  const [travelAllowance, setTravelAllowance] = useState(0);
  const [siteFee, setSiteFee] = useState(0);

  // Initialise from existing breakdown or build a fresh one
  useEffect(() => {
    if (!booking) return;

    const raw = booking.costBreakdown || booking.cost_breakdown;
    let existing = null;
    if (raw && typeof raw === 'object') existing = raw;
    else if (raw && typeof raw === 'string') {
      try { existing = JSON.parse(raw); } catch { /* ignore */ }
    }

    // Compute auto distance from caregiver's base site to patient location
    const baseSiteId = caregiver?.baseSiteId;
    const patientLat = booking.lat || booking.latitude;
    const patientLng = booking.lng || booking.longitude;
    let autoDistance = 0;
    if (baseSiteId && patientLat != null && patientLng != null) {
      const site = getSiteById(baseSiteId);
      if (site) {
        const rad = (deg) => (deg * Math.PI) / 180;
        const dLat = rad(patientLng - site.longitude);
        const dLng = rad(patientLat - site.latitude);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(site.latitude)) * Math.cos(rad(patientLat)) * Math.sin(dLng / 2) ** 2;
        autoDistance = Math.round(6371 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10;
      }
    }

    if (existing) {
      setBreakdown(existing);
      setDistanceKm(existing.travelCost?.distanceKm || autoDistance);
      setTravelBaseFee(existing.travelCost?.baseFee || 0);
      setTravelRatePerKm(existing.travelCost?.ratePerKm || 1.50);
      setTollFee(existing.travelCost?.tollFee || 0);
      setHourlyRate(existing.serviceFee?.hourlyRate || booking.rate || 40);
      setTravelAllowance(existing.caregiverPayout?.travelAllowance || 0);
      setSiteFee(existing.siteFee?.facilityFee || 0);
    } else {
      const fresh = buildCostBreakdown({
        serviceType: booking.serviceType || booking.service_type,
        durationMins: booking.durationMins || booking.duration_mins || 60,
        distanceKm: autoDistance,
        tollFee: 0,
        siteFee: 0,
      });
      setBreakdown(fresh);
      setDistanceKm(autoDistance);
      setTravelBaseFee(fresh.travelCost.baseFee);
      setTravelRatePerKm(fresh.travelCost.ratePerKm);
      setTollFee(0);
      setHourlyRate(fresh.serviceFee.hourlyRate);
      setTravelAllowance(fresh.caregiverPayout.travelAllowance);
      setSiteFee(0);
    }
  }, [booking, caregiver]);

  // Recompute breakdown whenever any editable field changes
  const updatedBreakdown = useMemo(() => {
    if (!breakdown) return null;
    return overrideCostBreakdown(breakdown, {
      hourlyRate,
      travelBaseFee,
      distanceKm,
      travelRatePerKm,
      tollFee,
      travelAllowance,
      siteFee,
    });
  }, [breakdown, hourlyRate, travelBaseFee, distanceKm, travelRatePerKm, tollFee, travelAllowance, siteFee]);

  if (!booking) return null;

  // Show a brief loading state while the breakdown is being built
  if (!breakdown) {
    return (
      <Modal isOpen onClose={onClose} title="Cost Breakdown">
        <div className="cbm cbm--loading">
          <p>Calculating cost breakdown…</p>
        </div>
      </Modal>
    );
  }

  const isPaid = booking.status === 'Paid - Online' || booking.status === 'Paid - Collected Directly' || booking.status === 'Paid';
  const isReadOnly = readOnly || isPaid;

  return (
    <Modal isOpen onClose={onClose} title="Cost Breakdown">
      <div className="cbm">
        {/* Booking summary */}
        <div className="cbm-summary">
          <span><strong>{booking.patientName || booking.patient_name}</strong></span>
          <span>{booking.serviceType || booking.service_type} · {formatDuration(booking.durationMins || booking.duration_mins || 60)}</span>
          {caregiver?.baseSiteId && (
            <span className="cbm-summary__site">
              Base: {getSiteById(caregiver.baseSiteId)?.name || caregiver.baseSiteId}
              {distanceKm > 0 && ` · ${distanceKm} km from patient`}
            </span>
          )}
        </div>

        {isPaid && <p className="cbm__paid-notice">This booking is already paid. Costs are read-only.</p>}

        <div className="cbm-columns">
          {/* Left column: editable fields */}
          <div className="cbm-column cbm-column--fields">
            <Section title="Service Fee">
              <EditableField
                label="Hourly rate (RM/hr)"
                value={hourlyRate}
                onChange={setHourlyRate}
                disabled={isReadOnly}
                step="1"
                min="0"
              />
            </Section>

            <Section title="Travel Cost">
              <EditableField label="Distance (km)" value={distanceKm} onChange={setDistanceKm} step="0.1" min="0" />
              <EditableField label="Base fee (RM)" value={travelBaseFee} onChange={setTravelBaseFee} disabled={isReadOnly} />
              <EditableField label="Rate per km (RM)" value={travelRatePerKm} onChange={setTravelRatePerKm} disabled={isReadOnly} step="0.1" />
              <EditableField label="Toll surcharge (RM)" value={tollFee} onChange={setTollFee} disabled={isReadOnly} />
            </Section>

            <Section title="Caregiver Payout">
              <EditableField label="Travel allowance (RM)" value={travelAllowance} onChange={setTravelAllowance} disabled={isReadOnly} />
            </Section>

            <Section title="Site Fee">
              <EditableField label="Facility fee (RM/hr)" value={siteFee} onChange={setSiteFee} disabled={isReadOnly} step="1" />
            </Section>
          </div>

          {/* Right column: computed breakdown */}
          <div className="cbm-column cbm-column--summary">
            <Section title="Breakdown">
              <Row label="Service fee" value={updatedBreakdown?.serviceFee?.subtotal} highlight />
              <Row label={`  @ RM ${fmt(updatedBreakdown?.serviceFee?.hourlyRate)}/hr × ${fmt(updatedBreakdown?.serviceFee?.hours)} hr`} indent />

              {updatedBreakdown?.travelCost?.subtotal > 0 && (
                <>
                  <Row label="Travel cost" value={updatedBreakdown?.travelCost?.subtotal} highlight />
                  {updatedBreakdown?.travelCost?.baseFee > 0 && <Row label={`  Base fee: RM ${fmt(updatedBreakdown.travelCost.baseFee)}`} indent />}
                  {updatedBreakdown?.travelCost?.distanceSubtotal > 0 && (
                    <Row label={`  ${updatedBreakdown.travelCost.distanceKm} km × RM ${fmt(updatedBreakdown.travelCost.ratePerKm)}/km`} indent />
                  )}
                  {updatedBreakdown?.travelCost?.tollFee > 0 && <Row label={`  Toll: RM ${fmt(updatedBreakdown.travelCost.tollFee)}`} indent />}
                </>
              )}

              {updatedBreakdown?.siteFee?.subtotal > 0 && (
                <Row label="Site fee" value={updatedBreakdown?.siteFee?.subtotal} highlight />
              )}

              <Row label="Caregiver payout" value={updatedBreakdown?.caregiverPayout?.subtotal} highlight />
              {updatedBreakdown?.caregiverPayout?.travelAllowance > 0 && (
                <Row label={`  Travel allowance: RM ${fmt(updatedBreakdown.caregiverPayout.travelAllowance)}`} indent />
              )}

              <div className="cbm-total">
                <Row label="Total" value={updatedBreakdown?.total} highlight />
              </div>
            </Section>
          </div>
        </div>

        <div className="cbm-actions">
          {!isReadOnly && (
            <button
              className="cbm-actions__save"
              onClick={() => onSave && onSave(updatedBreakdown)}
            >
              Save Breakdown
            </button>
          )}
          <button className="cbm-actions__close" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
