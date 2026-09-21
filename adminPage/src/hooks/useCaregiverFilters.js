import { useMemo, useState } from 'react';
import { isAwaitingAction } from '../data/caregiverAccounts.js';

// Pseudo-values for the account-status filter that span more than one status.
export const AWAITING_ACTION = 'Awaiting action';
export const PROFILE_UPDATE_PENDING = 'Profile update pending';

const INITIAL_FILTERS = {
  search: '',
  gender: 'All',
  center: 'All',
  availability: 'All',
  accountStatus: 'All',
};

export function useCaregiverFilters(caregivers) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const options = useMemo(() => {
    const genders = new Set();
    const centers = new Set();
    const availabilities = new Set();
    const accountStatuses = new Set();

    caregivers.forEach((c) => {
      genders.add(c.gender);
      centers.add(c.center);
      if (c.availability) availabilities.add(c.availability);
      accountStatuses.add(c.accountStatus);
    });

    return {
      genders: Array.from(genders).sort(),
      centers: Array.from(centers).sort(),
      availabilities: Array.from(availabilities).sort(),
      accountStatuses: Array.from(accountStatuses).sort(),
    };
  }, [caregivers]);

  const awaitingCount = useMemo(() => caregivers.filter(isAwaitingAction).length, [caregivers]);

  const filteredCaregivers = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return caregivers.filter((c) => {
      if (filters.gender !== 'All' && c.gender !== filters.gender) return false;
      if (filters.center !== 'All' && c.center !== filters.center) return false;
      if (filters.availability !== 'All' && c.availability !== filters.availability) return false;

      if (filters.accountStatus === AWAITING_ACTION) {
        if (!isAwaitingAction(c)) return false;
      } else if (filters.accountStatus === PROFILE_UPDATE_PENDING) {
        if (!c.pendingChange) return false;
      } else if (filters.accountStatus !== 'All' && c.accountStatus !== filters.accountStatus) {
        return false;
      }

      if (!term) return true;

      // Search across every visible column, not just name.
      const haystack = `${c.id} ${c.name} ${c.gender} ${c.center} ${c.availability} ${c.accountStatus} ${c.email}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [caregivers, filters]);

  const setFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  return { filters, setFilter, resetFilters, options, filteredCaregivers, awaitingCount };
}
