import { lookupManagerId } from '../../../../../data/mockManagers.js';
import './AssignmentReportingStep.css';

function AssignmentReportingStep({ formData, onFieldChange }) {
  const handleManagerNameChange = (event) => {
    const name = event.target.value;
    onFieldChange('managerName', name);
    onFieldChange('managerId', lookupManagerId(name));
  };

  return (
    <div className="assignment-reporting-step">
      <div className="form-field">
        <span className="form-field__label">Auto-assigned</span>
        <div className="assignment-reporting-step__radio-row">
          <label className="radio-option">
            <input
              type="radio"
              name="autoAssigned"
              value="Yes"
              checked={formData.autoAssigned === 'Yes'}
              onChange={(e) => onFieldChange('autoAssigned', e.target.value)}
            />
            Yes
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="autoAssigned"
              value="No"
              checked={formData.autoAssigned === 'No'}
              onChange={(e) => onFieldChange('autoAssigned', e.target.value)}
            />
            No
          </label>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="manager-name">Manager name</label>
        <input
          id="manager-name"
          type="text"
          placeholder="e.g. Grace Lim"
          value={formData.managerName}
          onChange={handleManagerNameChange}
        />
      </div>

      <div className="form-field">
        <label htmlFor="manager-id">Manager ID</label>
        <input
          id="manager-id"
          type="text"
          readOnly
          placeholder="Auto-fills once manager name matches"
          value={formData.managerId}
        />
        <span className="form-field__hint">
          Auto-fill from a live manager lookup is future development — this is a mock match.
        </span>
      </div>
    </div>
  );
}

export default AssignmentReportingStep;
