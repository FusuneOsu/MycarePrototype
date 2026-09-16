import LanguageTagInput from '../../../../common/LanguageTagInput/LanguageTagInput.jsx';
import { DEFAULT_LANGUAGE_OPTIONS } from '../../../../../data/languageOptions.js';
import './CaregiverDetailsStep.css';

function CaregiverDetailsStep({ formData, onFieldChange }) {
  return (
    <div className="caregiver-details-step">
      <div className="form-field">
        <label htmlFor="caregiver-id">Caregiver ID</label>
        <input
          id="caregiver-id"
          type="text"
          value={formData.id}
          onChange={(e) => onFieldChange('id', e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="caregiver-name">Name</label>
        <input
          id="caregiver-name"
          type="text"
          placeholder="e.g. Adam Tan"
          value={formData.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="caregiver-username">Username</label>
        <input
          id="caregiver-username"
          type="text"
          placeholder="e.g. adam.tan"
          value={formData.username}
          onChange={(e) => onFieldChange('username', e.target.value)}
        />
      </div>

      <div className="form-field">
        <span className="form-field__label">Gender</span>
        <div className="caregiver-details-step__radio-row">
          <label className="radio-option">
            <input
              type="radio"
              name="gender"
              value="Male"
              checked={formData.gender === 'Male'}
              onChange={(e) => onFieldChange('gender', e.target.value)}
            />
            Male
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="gender"
              value="Female"
              checked={formData.gender === 'Female'}
              onChange={(e) => onFieldChange('gender', e.target.value)}
            />
            Female
          </label>
        </div>
      </div>

      <div className="form-field">
        <span className="form-field__label">Languages</span>
        <LanguageTagInput
          value={formData.languages}
          onChange={(languages) => onFieldChange('languages', languages)}
          presetOptions={DEFAULT_LANGUAGE_OPTIONS}
        />
      </div>
    </div>
  );
}

export default CaregiverDetailsStep;
