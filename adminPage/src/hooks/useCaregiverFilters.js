import { useMemo, useState } from 'react';
import { isAwaitingAction } from '../data/caregiverAccounts.js';

// Pseudo-values for the account-status filter that span more than one status.
export const AWAITING_ACTION = 'Awaiting action';
export const PROFILE_UPDATE_PENDING = 'Profile update pending';

const INITIAL_FILTERS = {
  search: '',
  gender: 'All',
  branchId: 'All',
  availability: 'All',
  accountStatus: 'All',
};

export function useCaregiverFilters(caregivers, branches = [], selectedBranchId = '') {
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS, branchId: selectedBranchId || 'All' });
  const branchIdFilter = selectedBranchId !== null ? (selectedBranchId || 'All') : filters.branchId;
  const resolvedFilters = { ...filters, branchId: branchIdFilter };

  const options = useMemo(() => {
    const genders = new Set();
    const availabilities = new Set();
    const accountStatuses = new Set();

    caregivers.forEach((c) => {
      genders.add(c.gender);
      if (c.availability) availabilities.add(c.availability);
      accountStatuses.add(c.accountStatus);
    });

    return {
      genders: Array.from(genders).sort(),
      branches,
      availabilities: Array.from(availabilities).sort(),
      accountStatuses: Array.from(accountStatuses).sort(),
    };
  }, [caregivers, branches]);

  const awaitingCount = useMemo(() => caregivers.filter(isAwaitingAction).length, [caregivers]);

  const filteredCaregivers = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return caregivers.filter((c) => {
      if (filters.gender !== 'All' && c.gender !== filters.gender) return false;
      if (branchIdFilter !== 'All' && (c.branchId || c.branch_id || '') !== branchIdFilter) return false;
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
  }, [caregivers, filters, branchIdFilter]);

  const setFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  return { filters: resolvedFilters, setFilter, resetFilters, options, filteredCaregivers, awaitingCount };
}
