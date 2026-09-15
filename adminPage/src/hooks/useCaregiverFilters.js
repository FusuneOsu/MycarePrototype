import { useMemo, useState } from 'react';

const INITIAL_FILTERS = {
  search: '',
  gender: 'All',
  center: 'All',
  availability: 'All',
};

export function useCaregiverFilters(caregivers) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const options = useMemo(() => {
    const genders = new Set();
    const centers = new Set();
    const availabilities = new Set();

    caregivers.forEach((c) => {
      genders.add(c.gender);
      centers.add(c.center);
      availabilities.add(c.availability);
    });

    return {
      genders: Array.from(genders).sort(),
      centers: Array.from(centers).sort(),
      availabilities: Array.from(availabilities).sort(),
    };
  }, [caregivers]);

  const filteredCaregivers = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return caregivers.filter((c) => {
      if (filters.gender !== 'All' && c.gender !== filters.gender) return false;
      if (filters.center !== 'All' && c.center !== filters.center) return false;
      if (filters.availability !== 'All' && c.availability !== filters.availability) return false;

      if (!term) return true;

      // Search across every visible column, not just name.
      const haystack = `${c.id} ${c.name} ${c.gender} ${c.center} ${c.availability}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [caregivers, filters]);

  const setFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  return { filters, setFilter, resetFilters, options, filteredCaregivers };
}
