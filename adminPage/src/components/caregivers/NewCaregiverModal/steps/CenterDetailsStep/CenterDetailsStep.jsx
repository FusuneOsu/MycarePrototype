import { TRAVEL_MODES, CENTER_PLACES, WORK_ACCOMMODATIONS_MAX_WORDS } from '../../../../../data/caregiverFormOptions.js';
import { CAREGIVING_SITES } from '../../../../../../../shared/careVocabulary.js';
import { countWords, limitToWordCount } from '../../../../../utils/text.js';
import './CenterDetailsStep.css';

function CenterDetailsStep({ formData, onFieldChange }) {
  const wordCount = countWords(formData.workAccommodations);

  const handleAccommodationsChange = (event) => {
    const nextValue = limitToWordCount(event.target.value, WORK_ACCOMMODATIONS_MAX_WORDS);
    onFieldChange('workAccommodations', nextValue);
  };

  return (
    <div className="center-details-step">
      <div className="form-field">
        <label htmlFor="travel-mode">Travel mode</label>
        <select
          id="travel-mode"
          value={formData.travelMode}
          onChange={(e) => onFieldChange('travelMode', e.target.value)}
        >
          <option value="" disabled>Select a travel mode</option>
          {TRAVEL_MODES.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="center-place">Caregiving place name</label>
        <select
          id="center-place"
          value={formData.centerPlace}
          onChange={(e) => onFieldChange('centerPlace', e.target.value)}
        >
          <option value="" disabled>Select a place</option>
          {CENTER_PLACES.map((place) => (
            <option key={place} value={place}>{place}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="base-site">Base site (reporting branch)</label>
        <select
          id="base-site"
          value={formData.baseSiteId}
          onChange={(e) => onFieldChange('baseSiteId', e.target.value)}
        >
          <option value="" disabled>Select a base site</option>
          {CAREGIVING_SITES.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name} — {site.area}
            </option>
          ))}
        </select>
        <span className="form-field__hint">
          The specific branch or center where this caregiver is stationed.
        </span>
      </div>

      <div className="form-field">
        <label htmlFor="work-accommodations">Work accommodations</label>
        <textarea
          id="work-accommodations"
          placeholder="Any accommodations this caregiver needs at work..."
          value={formData.workAccommodations}
          onChange={handleAccommodationsChange}
        />
        <span className="form-field__hint">{wordCount}/{WORK_ACCOMMODATIONS_MAX_WORDS} words</span>
      </div>
    </div>
  );
}

export default CenterDetailsStep;
