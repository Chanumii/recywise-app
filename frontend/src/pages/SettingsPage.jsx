import React, { useState } from 'react';
import { ACTIONS_META } from '../constants';

//facility-level labour rate and time configuration per action.

const SettingsPage = ({ yardSettings, onUpdateSettings }) => {
  const [localRate, setLocalRate]   = useState(yardSettings.custom_labour_rate);
  const [localTimes, setLocalTimes] = useState({ ...yardSettings.custom_action_times });
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Parse input to integer to ensure valid payload data
  const handleTimeChange = (id, value) => {
    const val = parseInt(value, 10);
    setLocalTimes(prev => ({ ...prev, [id]: isNaN(val) ? '' : Math.max(1, val) }));
  };

  const handleReset = () => {
    setLocalRate(32.50);
    setLocalTimes({});
  };

  const handleSave = () => {
    const rate = parseFloat(localRate);
    
    // Scrub empty inputs so we only send valid overrides to the API
    const cleanTimes = {};
    Object.entries(localTimes).forEach(([id, time]) => {
      if (time !== '') cleanTimes[id] = time;
    });

    onUpdateSettings({
      custom_labour_rate: isNaN(rate) || rate <= 0 ? 32.50 : rate,
      custom_action_times: cleanTimes
    });
    
    // Provide brief visual confirmation to the user
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const hasCustomValues = (localRate !== 32.50) || Object.keys(localTimes).length > 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure facility efficiency and labour rates</p>
      </div>

      <div className="settings-explainer-card">
        <div className="settings-explainer-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="settings-explainer-text">
          <p className="settings-explainer-heading">Global Hourly Rate</p>
          <p>The cost of a technician in your facility. Applied to all calculations. Defaults to $32.50/hr.</p>
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '0.5rem', fontWeight: 600, color: '#475569' }}>$</span>
            <input type="number" step="0.50" min="1" value={localRate} 
                   onChange={e => setLocalRate(e.target.value)} 
                   className="table-input" style={{ width: '120px' }} />
            <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>USD / Hour</span>
          </div>
        </div>
      </div>

      {hasCustomValues && (
        <div className="settings-custom-badge">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 14, height: 14, marginRight: 5, flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Custom settings are currently active. Pathway profits and job timelines will be adapted.
        </div>
      )}

      <div className="table-container" style={{ marginBottom: '1.25rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="table-header">Recycling Step</th>
              <th className="table-header text-right">Estimated Time (Mins)</th>
              <th className="table-header text-right">Calculated Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            {ACTIONS_META.map(act => {
              // Fallback to default time if no override is set
              const currentMins = localTimes[act.id] !== undefined ? localTimes[act.id] : act.defaultTime;
              
              // Dynamically calculate cost for UI feedback (Cost = Time/60 * Rate)
              const estCost = ((currentMins || 0) / 60) * (parseFloat(localRate) || 0);
              
              const isModified = localTimes[act.id] !== undefined && localTimes[act.id] !== act.defaultTime;

              return (
                <tr key={act.id} className={`table-row ${isModified ? 'settings-row-modified' : ''}`}>
                  <td className="table-cell">
                    <span style={{ fontWeight: isModified ? 600 : 400 }}>{act.name}</span>
                    {isModified && <span className="settings-modified-pill" style={{ marginLeft: '0.5rem' }}>custom</span>}
                  </td>
                  <td className="table-cell text-right">
                    <input type="number" min="1" value={currentMins}
                           onChange={e => handleTimeChange(act.id, e.target.value)}
                           className="table-input" style={{ textAlign: 'right', width: '100px' }} />
                  </td>
                  <td className="table-cell text-right" style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '14px' }}>
                    ${estCost.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="settings-actions">
        <button onClick={handleReset} className="btn btn-outline">Reset to Defaults</button>
        <button onClick={handleSave} className={`btn btn-primary ${savedFeedback ? 'settings-saved-btn' : ''}`}>
          {savedFeedback ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;