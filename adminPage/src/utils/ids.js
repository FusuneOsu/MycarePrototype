// Suggests the next sequential caregiver ID (e.g. CG-1013) based on
// the highest existing numeric suffix. Editable by the user in the form.
export function getNextCaregiverId(caregivers) {
  const numbers = caregivers
    .map((c) => parseInt(c.id.replace('CG-', ''), 10))
    .filter((n) => !Number.isNaN(n));

  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
  return `CG-${next}`;
}
