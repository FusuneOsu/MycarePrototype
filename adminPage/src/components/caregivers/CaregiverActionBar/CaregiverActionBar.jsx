import NewCaregiverButton from '../NewCaregiverButton/NewCaregiverButton.jsx';
import PTORequestButton from '../PTORequestButton/PTORequestButton.jsx';
import AvailabilityUpdateButton from '../AvailabilityUpdateButton/AvailabilityUpdateButton.jsx';
import './CaregiverActionBar.css';

function CaregiverActionBar() {
  return (
    <div className="caregiver-action-bar">
      <AvailabilityUpdateButton />
      <PTORequestButton />
      <NewCaregiverButton />
    </div>
  );
}

export default CaregiverActionBar;
