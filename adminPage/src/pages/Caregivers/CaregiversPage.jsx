import { useEffect, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import CaregiverActionBar from '../../components/caregivers/CaregiverActionBar/CaregiverActionBar.jsx';
import CaregiverFilters from '../../components/caregivers/CaregiverFilters/CaregiverFilters.jsx';
import CaregiverTable from '../../components/caregivers/CaregiverTable/CaregiverTable.jsx';
import NewCaregiverModal from '../../components/caregivers/NewCaregiverModal/NewCaregiverModal.jsx';
import CaregiverDetailModal from '../../components/caregivers/CaregiverDetailModal/CaregiverDetailModal.jsx';
import { fetchCaregivers } from '../../data/mockCaregivers.js';
import { useCaregiverFilters } from '../../hooks/useCaregiverFilters.js';
import './CaregiversPage.css';

function CaregiversPage() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isNewCaregiverOpen, setIsNewCaregiverOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);

  useEffect(() => {
    fetchCaregivers().then((data) => {
      setCaregivers(data);
      setLoading(false);
    });
  }, []);

  const { filters, setFilter, resetFilters, options, filteredCaregivers } =
    useCaregiverFilters(caregivers);

  const handleSeeMore = (caregiver) => {
    setSelectedCaregiver(caregiver);
  };

  const handleCreateCaregiver = (newCaregiver) => {
    setCaregivers((prev) => [newCaregiver, ...prev]);
  };

  return (
    <div className="caregivers-page">
      <div className="caregivers-page__header">
        <Topbar
          title="Caregivers"
          subtitle="View, search and manage every caregiver across your centers."
        />
        <div className="caregivers-page__actions">
          <CaregiverActionBar onNewCaregiverClick={() => setIsNewCaregiverOpen(true)} />
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

      <NewCaregiverModal
        isOpen={isNewCaregiverOpen}
        onClose={() => setIsNewCaregiverOpen(false)}
        caregivers={caregivers}
        onCreateCaregiver={handleCreateCaregiver}
      />

      <CaregiverDetailModal
        isOpen={Boolean(selectedCaregiver)}
        onClose={() => setSelectedCaregiver(null)}
        caregiver={selectedCaregiver}
      />
    </div>
  );
}

export default CaregiversPage;
