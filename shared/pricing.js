// Transitional compatibility for rate_cents rows created before booking writes
// consistently converted RM/hour to cents. Values below 1,000 are treated as
// the raw RM/hour values written by the legacy creator; larger values follow
// the column's cents convention.
export function rateCentsToRm(value) {
  const stored = Number(value || 0);
  if (!Number.isFinite(stored)) return 0;
  return stored >= 1000 ? stored / 100 : stored;
}

export function rateCentsToCents(value) {
  return Math.round(rateCentsToRm(value) * 100);
}

export function hourlyRateToCents(value) {
  const rate = Number(value || 0);
  return Number.isFinite(rate) ? Math.round(rate * 100) : 0;
}
