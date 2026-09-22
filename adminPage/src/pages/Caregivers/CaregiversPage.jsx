import { useCallback, useEffect, useState } from 'react';
import Topbar from '../../components/common/Topbar/Topbar.jsx';
import CaregiverActionBar from '../../components/caregivers/CaregiverActionBar/CaregiverActionBar.jsx';
import CaregiverFilters from '../../components/caregivers/CaregiverFilters/CaregiverFilters.jsx';
import CaregiverTable from '../../components/caregivers/CaregiverTable/CaregiverTable.jsx';
import NewCaregiverModal from '../../components/caregivers/NewCaregiverModal/NewCaregiverModal.jsx';
import CaregiverDetailModal from '../../components/caregivers/CaregiverDetailModal/CaregiverDetailModal.jsx';
import CaregiverReviewModal from '../../components/caregivers/CaregiverReviewModal/CaregiverReviewModal.jsx';
import ApplicationLinkModal from '../../components/caregivers/ApplicationLinkModal/ApplicationLinkModal.jsx';
import { fetchCaregiverAccounts } from '../../data/caregiverAccounts.js';
import {
  approveApplication, approveProfileChanges, clearAccountHold, rejectProfileChanges,
  returnApplication, saveManualCaregiver, setAccountHold, setAvailability,
} from '../../../../shared/caregiverStore.js';
import { useCaregiverFilters } from '../../hooks/useCaregiverFilters.js';
import './CaregiversPage.css';

function CaregiversPage() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isNewCaregiverOpen, setIsNewCaregiverOpen] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [isLinkOpen, setIsLinkOpen] = useState(false);

  const load = useCallback(() => fetchCaregiverAccounts().then((data) => {
    setCaregivers(data);
    setLoading(false);
  }), []);

  useEffect(() => { load(); }, [load]);

  // Applications and profile edits are written by the caregiver app, which runs
  // on the same origin — refresh the queue when it changes or the tab regains focus.
  useEffect(() => {
    window.addEventListener('storage', load);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  const { filters, setFilter, resetFilters, options, filteredCaregivers, awaitingCount } =
    useCaregiverFilters(caregivers);

  // Admin-added caregivers are already vetted, so they go straight in as Active
  // — and are saved, so they survive a reload and reach the booking pool.
  const handleCreateCaregiver = (newCaregiver) => {
    saveManualCaregiver(newCaregiver);
    load();
  };

  const handleAvailabilityChange = (caregiverId, availability) => {
    const caregiver = caregivers.find((item) => item.id === caregiverId);
    if (!caregiver) return;
    setAvailability(caregiver.email, availability);
    load();
  };

  const handleHold = (caregiver, state, reason) => {
    setAccountHold(caregiver.email, state, reason);
    setSelectedCaregiver(null);
    load();
  };

  const handleRelease = (caregiver) => {
    clearAccountHold(caregiver.email);
    setSelectedCaregiver(null);
    load();
  };

  const handleDecision = ({ kind, action, note }) => {
    const { email } = reviewing;

    if (kind === 'change') {
      if (action === 'approve') approveProfileChanges(email);
      else rejectProfileChanges(email, note);
    } else if (action === 'approve') {
      approveApplication(email);
    } else {
      // Not approved: goes back to the applicant with the reason, to edit and resubmit.
      returnApplication(email, note);
    }

    setReviewing(null);
    load();
  };

  return (
    <div className="caregivers-page">
      <Topbar
        title="Caregivers"
        subtitle="View, search and manage every caregiver across your centers."
        actions={(
          <CaregiverActionBar
            onNewCaregiverClick={() => setIsNewCaregiverOpen(true)}
            onShareLinkClick={() => setIsLinkOpen(true)}
          />
        )}
      />

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
              awaitingCount={awaitingCount}
            />
            <CaregiverTable
              caregivers={filteredCaregivers}
              onSeeMore={setSelectedCaregiver}
              onReview={setReviewing}
              onAvailabilityChange={handleAvailabilityChange}
            />
          </>
        )}
      </div>

      <NewCaregiverModal
        isOpen={isNewCaregiverOpen}
        onClose={() => setIsNewCaregiverOpen(false)}
        // Online applicants take CG-5xxx ids (from APP-5xxx), so manual ids are
        // suggested from the other caregivers only — otherwise they would collide.
        caregivers={caregivers.filter((caregiver) => caregiver.source !== 'application')}
        onCreateCaregiver={handleCreateCaregiver}
      />

      <CaregiverDetailModal
        key={selectedCaregiver?.id}
        isOpen={Boolean(selectedCaregiver)}
        onClose={() => setSelectedCaregiver(null)}
        caregiver={selectedCaregiver}
        onHold={handleHold}
        onRelease={handleRelease}
      />

      <ApplicationLinkModal isOpen={isLinkOpen} onClose={() => setIsLinkOpen(false)} />

      <CaregiverReviewModal
        key={reviewing?.id}
        isOpen={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        caregiver={reviewing}
        onDecision={handleDecision}
      />
    </div>
  );
}

export default CaregiversPage;
