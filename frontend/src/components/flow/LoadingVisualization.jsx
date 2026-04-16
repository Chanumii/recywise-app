import React from 'react';

// ═══════════════════════════════════════════════════════════════════
// LOADING VISUALISATION
// ═══════════════════════════════════════════════════════════════════

const LoadingVisualization = () => {
  // Cascading animation delays for UI feedback during heavy API calls
  const stages = [
    { label: "Checking today's metal market prices",    delay: 0   },
    { label: 'Reviewing vehicle condition details',     delay: 0.9 },
    { label: 'Calculating the best dismantling order',  delay: 1.8 },
    { label: 'Building your recycling pathway',         delay: 2.7 },
  ];
  return (
    <div className="loading-viz">
      <div className="loading-rings">
        <div className="lring lring-1"></div><div className="lring lring-2"></div><div className="lring lring-3"></div>
        <div className="lring-core">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="lring-icon">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>
      <h2 className="loading-title">Optimizing Pathway</h2>
      <p className="loading-subtitle">Please wait while RecyWise processes your vehicle</p>
      <div className="loading-stages">
        {stages.map((s, i) => (
          <div key={i} className="loading-stage" style={{ animationDelay: `${s.delay}s` }}>
            <span className="stage-dot" style={{ animationDelay: `${s.delay}s` }}></span>
            <span className="stage-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingVisualization;