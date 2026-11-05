import { SERVICE_RATES, TRAVEL_COST_DEFAULTS } from '../../../shared/bookingStore.js';
import { rateCentsToRm } from '../../../shared/pricing.js';

export function parseBookingCostBreakdown(booking) {
  const raw = booking?.cost_breakdown || booking?.costBreakdown;
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

export function getPriceSlateSnapshot(booking) {
  const breakdown = parseBookingCostBreakdown(booking);
  if (breakdown?.version !== 'slate-v1' || !Array.isArray(breakdown.items)) return null;
  const totalCents = Number(breakdown.total_cents);
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) return null;
  return { items: breakdown.items, total_cents: totalCents, total: totalCents / 100 };
}

function moneyExpression(amount) {
  return Math.round(Number(amount || 0) * 100) / 100;
}

function distanceKm(from, to) {
  if (!from || !to || from.latitude == null || from.longitude == null || to.latitude == null || to.longitude == null) return 0;
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = Number(from.latitude), lon1 = Number(from.longitude);
  const lat2 = Number(to.latitude), lon2 = Number(to.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

function item(label, expression, note = '') {
  return { id: `init-${crypto.randomUUID()}`, label, note, expression: String(expression) };
}

/**
 * Prefill the new patient-price slate without ever carrying over caregiver
 * payout rows from the retired cost breakdown.
 */
export function buildInitialPriceSlate(booking, { servingBranch, caregiverBaseBranch } = {}) {
  const old = parseBookingCostBreakdown(booking);
  if (old?.version === 'slate-v1' && Array.isArray(old.items)) {
    return old.items.map(({ id: _id, label, note, expression }) => item(label, expression, note || ''));
  }

  if (old && (old.serviceFee || old.travelCost || old.siteFee)) {
    const rows = [];
    if (old.serviceFee?.subtotal != null) {
      rows.push(item('Service fee', moneyExpression(old.serviceFee.subtotal), 'Prefilled from the previous service calculation.'));
    }
    if (Number(old.travelCost?.subtotal) > 0) {
      rows.push(item('Travel cost', moneyExpression(old.travelCost.subtotal), 'Prefilled from the previous travel calculation.'));
    }
    if (Number(old.siteFee?.subtotal) > 0) {
      rows.push(item('Facility fee', moneyExpression(old.siteFee.subtotal), 'Prefilled from the previous facility calculation.'));
    }
    if (rows.length) return rows;
  }

  const durationMins = Number(booking.duration_mins || 0);
  const durationHours = Math.round((durationMins / 60) * 100) / 100;
  const storedRate = rateCentsToRm(booking.rate_cents);
  const defaultRate = Number(SERVICE_RATES[booking.service_type] || 40);
  const rows = [
    item(
      'Service fee',
      storedRate > 0 ? 'rate * duration_hrs' : moneyExpression(defaultRate * durationHours),
      'Prefilled from the booking rate and duration. Edit this row or formula as needed.',
    ),
  ];

  const travelDistance = distanceKm(caregiverBaseBranch, {
    latitude: booking.latitude,
    longitude: booking.longitude,
  });
  if (travelDistance > 0) {
    const travel = TRAVEL_COST_DEFAULTS.baseFee + travelDistance * TRAVEL_COST_DEFAULTS.ratePerKm;
    rows.push(item(
      'Travel cost',
      moneyExpression(travel),
      `Auto-estimate: ${travelDistance.toFixed(1)} km from the caregiver's base branch.`,
    ));
  }

  if (booking.appointment_type === 'Care Center' && Number(servingBranch?.facility_fee_cents) > 0) {
    rows.push(item(
      'Facility fee',
      'branch_facility_fee',
      'Prefilled from the serving branch facility fee.',
    ));
  }
  return rows;
}

export function stripCalculatedAmounts(items = []) {
  return items.map(({ id, label, note, expression }) => ({ id, label, note: note || '', expression }));
}
