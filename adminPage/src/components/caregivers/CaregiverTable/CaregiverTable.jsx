import { Button, CellStack, Select, Table, Tag } from '../../../../../shared/ui/index.js';
import StatusPill from '../StatusPill/StatusPill.jsx';
import { ACCOUNT_STATUS, isAwaitingAction } from '../../../data/caregiverAccounts.js';
import { AVAILABILITY } from '../../../../../shared/careVocabulary.js';

const COLUMNS = ['ID', 'Name', 'Gender', 'Center', 'Account status', 'Availability', ''];

function CaregiverTable({ caregivers, onSeeMore, onReview, onAvailabilityChange }) {
  return (
    <Table columns={COLUMNS} raised label="Caregivers" empty={caregivers.length === 0 && 'No caregivers match your search or filters.'}>
      {caregivers.map((caregiver) => {
        const isActive = caregiver.accountStatus === ACCOUNT_STATUS.active;
        const needsAction = isAwaitingAction(caregiver);
        const onHold = Boolean(caregiver.hold);
        // Still going through onboarding — the review modal is the right view.
        const inOnboarding = caregiver.source === 'application' && !isActive && !onHold;

        return (
          <tr key={caregiver.id} className={needsAction ? 'ui-table__row--flagged' : undefined}>
            <td className="ui-table__muted">{caregiver.id}</td>
            <td>
              <CellStack primary={caregiver.name}>
                {caregiver.source === 'application' && <Tag>Applied online</Tag>}
              </CellStack>
            </td>
            <td>{caregiver.gender}</td>
            <td>{caregiver.center || '—'}</td>
            <td>
              <StatusPill status={caregiver.accountStatus} />
              {caregiver.pendingChange && <span className="ui-table__secondary">Profile update pending</span>}
            </td>
            <td>
              {isActive ? (
                <Select
                  size="sm"
                  value={caregiver.availability}
                  aria-label={`Availability for ${caregiver.name}`}
                  onChange={(event) => onAvailabilityChange(caregiver.id, event.target.value)}
                >
                  {AVAILABILITY.map((availability) => <option key={availability} value={availability}>{availability}</option>)}
                </Select>
              ) : (
                // Not approved yet, or suspended / deactivated: out of the booking pool.
                <span className="ui-table__muted">{onHold ? 'Out of booking pool' : 'Not rostered'}</span>
              )}
            </td>
            <td className="ui-table__actions">
              {needsAction ? (
                <Button variant="primary" size="sm" onClick={() => onReview(caregiver)}>Review</Button>
              ) : (
                // Sent back and waiting on the applicant — viewable, nothing to decide.
                <Button size="sm" onClick={() => (inOnboarding ? onReview(caregiver) : onSeeMore(caregiver))}>
                  {inOnboarding ? 'View' : 'See more'}
                </Button>
              )}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

export default CaregiverTable;
