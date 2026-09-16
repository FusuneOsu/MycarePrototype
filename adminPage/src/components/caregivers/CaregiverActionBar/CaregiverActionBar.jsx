import NewCaregiverButton from '../NewCaregiverButton/NewCaregiverButton.jsx';
import PTORequestButton from '../PTORequestButton/PTORequestButton.jsx';
import AvailabilityUpdateButton from '../AvailabilityUpdateButton/AvailabilityUpdateButton.jsx';
import './CaregiverActionBar.css';

function CaregiverActionBar({ onNewCaregiverClick }) {
  return (
    <div className="caregiver-action-bar">
      <AvailabilityUpdateButton />
      <PTORequestButton />
      <NewCaregiverButton onClick={onNewCaregiverClick} />
    </div>
  );
}

export default CaregiverActionBar;
