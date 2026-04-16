import React from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// consistent card wrapper for all vehicle-processing screens.
 
const FlowScreen = ({ title, err, onBack, children, gradient, wide, noCard }) => (
  <div className={`flow-page${gradient ? ' flow-page-gradient' : ''}`}>

    {/* Back button — at page level, uses flow-page padding for left alignment */}
    {onBack && (
      <button onClick={onBack} className="back-button flow-back-btn">
        <ArrowLeftIcon className="back-icon" />
        <span>Back</span>
      </button>
    )}

    <div className={`flow-content-wrapper${wide ? ' flow-content-wrapper-wide' : ''}`}>
      {noCard ? children : (
        <div className="card">
          {title && <h2 className="card-title">{title}</h2>}
          {err   && <div className="error-message" style={{ marginBottom: '1rem' }}>{err}</div>}
          {children}
        </div>
      )}
    </div>

  </div>
);

export default FlowScreen;