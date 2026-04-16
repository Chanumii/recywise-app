import React from 'react';

// Form Input Primitives for Condition Assessment
//three-option horizontal button group

const SegmentedControl = ({ value, onChange, options, disabled }) => (
  <div className={`segmented-control ${disabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
    {options.map(opt => (
      <button key={opt.value} type="button" className={`segmented-btn ${value === opt.value ? 'active' : ''}`}
        onClick={() => !disabled && onChange(opt.value)} disabled={disabled}>
        {opt.label}
      </button>
    ))}
  </div>
);

export default SegmentedControl;