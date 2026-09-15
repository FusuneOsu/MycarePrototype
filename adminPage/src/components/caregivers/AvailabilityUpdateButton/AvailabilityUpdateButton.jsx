import './AvailabilityUpdateButton.css';

function AvailabilityUpdateButton() {
  // Dummy for now — wire up to an availability update flow later.
  const handleClick = () => {
    alert('Availability Update: not wired up yet.');
  };

  return (
    <button type="button" className="availability-update-btn" onClick={handleClick}>
      Availability Update
    </button>
  );
}

export default AvailabilityUpdateButton;
