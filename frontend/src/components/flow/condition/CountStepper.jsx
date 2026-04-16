import React from 'react';

//integer step counter for wheels_present (range 0–4)
const CountStepper = ({ value, onChange, min, max, label, note }) => (
  <div className="condition-flag-row">
    <div className="condition-flag-label-group">
      <span className="condition-flag-label">{label}</span>
      {note && <span className="condition-flag-note">{note}</span>}
    </div>
    <div className="count-stepper">
      <button type="button" className="count-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
      <span className="count-value">{value}</span>
      <button type="button" className="count-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  </div>
);

export default CountStepper;