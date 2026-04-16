import React from 'react';

//binary Yes / No toggle for present / absent conditions
const ToggleFlag = ({ checked, onChange, label, note, disabled }) => (
  <div className={`condition-flag-row ${disabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
    <div className="condition-flag-label-group">
      <span className="condition-flag-label">{label}</span>
      {note && <span className="condition-flag-note">{note}</span>}
    </div>
    <button type="button" className={`toggle-flag-btn ${checked ? 'active' : ''}`}
      onClick={() => !disabled && onChange(!checked)} disabled={disabled}>
      {checked ? 'Yes' : 'No'}
    </button>
  </div>
);

export default ToggleFlag;