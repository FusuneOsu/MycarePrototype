import StatusPill from '../StatusPill/StatusPill.jsx';
import { ACCOUNT_STATUS, isAwaitingAction } from '../../../data/caregiverAccounts.js';
import './CaregiverTable.css';

const AVAILABILITY_OPTIONS = ['Available', 'On Duty', 'Off Duty', 'On Leave'];

function CaregiverTable({ caregivers, onSeeMore, onReview, onAvailabilityChange }) {
  if (caregivers.length === 0) {
    return (
      <div className="caregiver-table__empty">
        <p>No caregivers match your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="caregiver-table-wrap">
      <table className="caregiver-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Gender</th>
            <th>Center</th>
            <th>Account status</th>
            <th>Availability</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {caregivers.map((caregiver) => {
            const isActive = caregiver.accountStatus === ACCOUNT_STATUS.active;
            const needsAction = isAwaitingAction(caregiver);
            const onHold = Boolean(caregiver.hold);
            // Still going through onboarding — the review modal is the right view.
            const inOnboarding = caregiver.source === 'application' && !isActive && !onHold;

            return (
              <tr
                key={caregiver.id}
                className={needsAction ? 'caregiver-table__row--flagged' : undefined}
              >
                <td className="caregiver-table__id">{caregiver.id}</td>
                <td>
                  {caregiver.name}
                  {caregiver.source === 'application' && (
                    <span className="caregiver-table__tag">Applied online</span>
                  )}
                </td>
                <td>{caregiver.gender}</td>
                <td>{caregiver.center || '—'}</td>
                <td>
                  <StatusPill status={caregiver.accountStatus} />
                  {caregiver.pendingChange && (
                    <span className="caregiver-table__hint">Profile update pending</span>
                  )}
                </td>
                <td>
                  {isActive ? (
                    <select
                      className="caregiver-table__availability"
                      value={caregiver.availability}
                      aria-label={`Availability for ${caregiver.name}`}
                      onChange={(event) =>
                        onAvailabilityChange(caregiver.id, event.target.value)
                      }
                    >
                      {AVAILABILITY_OPTIONS.map((availability) => (
                        <option key={availability} value={availability}>
                          {availability}
                        </option>
                      ))}
                    </select>
                  ) : (
                    // Not approved yet, or suspended / deactivated: out of the booking pool.
                    <span className="caregiver-table__muted">{onHold ? 'Out of booking pool' : 'Not rostered'}</span>
                  )}
                </td>
                <td className="caregiver-table__actions">
                  {needsAction ? (
                    <button
                      type="button"
                      className="caregiver-table__review"
                      onClick={() => onReview(caregiver)}
                    >
                      Review
                    </button>
                  ) : inOnboarding ? (
                    // Sent back and waiting on the applicant — viewable, nothing to decide.
                    <button
                      type="button"
                      className="caregiver-table__see-more"
                      onClick={() => onReview(caregiver)}
                    >
                      View
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="caregiver-table__see-more"
                      onClick={() => onSeeMore(caregiver)}
                    >
                      See more
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CaregiverTable;
