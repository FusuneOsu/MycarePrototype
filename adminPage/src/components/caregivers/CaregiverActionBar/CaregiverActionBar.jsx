import NewCaregiverButton from '../NewCaregiverButton/NewCaregiverButton.jsx';
import PTORequestButton from '../PTORequestButton/PTORequestButton.jsx';
import './CaregiverActionBar.css';

function CaregiverActionBar({ onNewCaregiverClick }) {
  return (
    <div className="caregiver-action-bar">
      <PTORequestButton />
      <NewCaregiverButton onClick={onNewCaregiverClick} />
    </div>
  );
}

export default CaregiverActionBar;
