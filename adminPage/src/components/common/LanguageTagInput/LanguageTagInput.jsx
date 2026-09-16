import { useState } from 'react';
import './LanguageTagInput.css';

function LanguageTagInput({ value, onChange, presetOptions }) {
  const [customInput, setCustomInput] = useState('');
  const availablePresets = presetOptions.filter((option) => !value.includes(option));

  const addLanguage = (language) => {
    const trimmed = language.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  const removeLanguage = (language) => {
    onChange(value.filter((item) => item !== language));
  };

  const handlePresetSelect = (event) => {
    const selected = event.target.value;
    if (selected) addLanguage(selected);
    event.target.value = '';
  };

  const handleCustomAdd = () => {
    addLanguage(customInput);
    setCustomInput('');
  };

  const handleCustomKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCustomAdd();
    }
  };

  return (
    <div className="language-tag-input">
      <div className="language-tag-input__chips">
        {value.length === 0 && (
          <span className="language-tag-input__placeholder">No languages selected yet</span>
        )}
        {value.map((language) => (
          <span key={language} className="language-tag-input__chip">
            {language}
            <button
              type="button"
              className="language-tag-input__chip-remove"
              onClick={() => removeLanguage(language)}
              aria-label={`Remove ${language}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="language-tag-input__controls">
        <select
          className="language-tag-input__preset-select"
          onChange={handlePresetSelect}
          defaultValue=""
          disabled={availablePresets.length === 0}
        >
          <option value="" disabled>
            + Add a language
          </option>
          {availablePresets.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <div className="language-tag-input__custom">
          <input
            type="text"
            placeholder="Other language..."
            value={customInput}
            onChange={(event) => setCustomInput(event.target.value)}
            onKeyDown={handleCustomKeyDown}
          />
          <button type="button" onClick={handleCustomAdd} disabled={!customInput.trim()}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default LanguageTagInput;
