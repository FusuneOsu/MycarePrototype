import { useEffect, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import CaregiverActionBar from '../../components/caregivers/CaregiverActionBar/CaregiverActionBar.jsx';
import CaregiverFilters from '../../components/caregivers/CaregiverFilters/CaregiverFilters.jsx';
import CaregiverTable from '../../components/caregivers/CaregiverTable/CaregiverTable.jsx';
import { fetchCaregivers } from '../../data/mockCaregivers.js';
import { useCaregiverFilters } from '../../hooks/useCaregiverFilters.js';
import './CaregiversPage.css';

function CaregiversPage() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCaregivers().then((data) => {
      setCaregivers(data);
      setLoading(false);
    });
  }, []);

  const { filters, setFilter, resetFilters, options, filteredCaregivers } =
    useCaregiverFilters(caregivers);

  const handleSeeMore = (caregiver) => {
    // Dummy for now — will open a caregiver detail view/drawer later.
    alert(`See more: ${caregiver.name} (${caregiver.id}) — not wired up yet.`);
  };

  return (
    <div className="caregivers-page">
      <div className="caregivers-page__header">
        <Topbar
          title="Caregivers"
          subtitle="View, search and manage every caregiver across your centers."
        />
        <div className="caregivers-page__actions">
          <CaregiverActionBar />
        </div>
      </div>

      <div className="caregivers-page__body">
        {loading ? (
          <p className="caregivers-page__loading">Loading caregivers…</p>
        ) : (
          <>
            <CaregiverFilters
              filters={filters}
              onFilterChange={setFilter}
              onReset={resetFilters}
              options={options}
              resultCount={filteredCaregivers.length}
            />
            <CaregiverTable caregivers={filteredCaregivers} onSeeMore={handleSeeMore} />
          </>
        )}
      </div>
    </div>
  );
}

export default CaregiversPage;
