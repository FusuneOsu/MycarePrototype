import { Button, Input, Select, Toolbar } from '../../../../../shared/ui/index.js';
import { AWAITING_ACTION, PROFILE_UPDATE_PENDING } from '../../../hooks/useCaregiverFilters.js';
import './CaregiverFilters.css';

function CaregiverFilters({ filters, onFilterChange, onReset, options, resultCount, awaitingCount }) {
  const handleChange = (field) => (event) => {
    onFilterChange(field, event.target.value);
  };

  const hasActiveFilters =
    filters.search ||
    filters.gender !== 'All' ||
    filters.center !== 'All' ||
    filters.availability !== 'All' ||
    filters.accountStatus !== 'All';

  const showingAwaiting = filters.accountStatus === AWAITING_ACTION;

  return (
    <div className="caregiver-filters">
      {awaitingCount > 0 && (
        <button
          type="button"
          className={'ui-banner caregiver-filters__queue' + (showingAwaiting ? '' : ' ui-banner--warning')}
          onClick={() => onFilterChange('accountStatus', showingAwaiting ? 'All' : AWAITING_ACTION)}
          aria-pressed={showingAwaiting}
        >
          <span className="caregiver-filters__queue-count">{awaitingCount}</span>
          <span>{awaitingCount === 1 ? 'item needs' : 'items need'} your approval — applications and profile updates</span>
          <span className="caregiver-filters__queue-action">{showingAwaiting ? 'Show all' : 'Review now →'}</span>
        </button>
      )}

      <Toolbar>
        <Input
          size="sm"
          type="text"
          placeholder="Search by name, ID, email, center..."
          value={filters.search}
          onChange={handleChange('search')}
          aria-label="Search caregivers"
        />

        <Select size="sm" value={filters.accountStatus} onChange={handleChange('accountStatus')} aria-label="Filter by account status">
          <option value="All">All accounts</option>
          <option value={AWAITING_ACTION}>Awaiting approval</option>
          <option value={PROFILE_UPDATE_PENDING}>Profile update pending</option>
          {options.accountStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </Select>

        <Select size="sm" value={filters.gender} onChange={handleChange('gender')} aria-label="Filter by gender">
          <option value="All">All genders</option>
          {options.genders.map((g) => <option key={g} value={g}>{g}</option>)}
        </Select>

        <Select size="sm" value={filters.center} onChange={handleChange('center')} aria-label="Filter by center">
          <option value="All">All centers</option>
          {options.centers.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>

        <Select size="sm" value={filters.availability} onChange={handleChange('availability')} aria-label="Filter by availability">
          <option value="All">All availability</option>
          {options.availabilities.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>

        {hasActiveFilters && <Button variant="link" onClick={onReset}>Clear filters</Button>}
      </Toolbar>

      <p className="caregiver-filters__count">
        {resultCount} {resultCount === 1 ? 'caregiver' : 'caregivers'}
      </p>
    </div>
  );
}

export default CaregiverFilters;
