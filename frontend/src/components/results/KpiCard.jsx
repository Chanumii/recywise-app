import React from 'react';

//key-performance-indicator tiles
const KpiCard = ({ label, value, sub, color }) => (
  <div className="kpi-card">
    <div className="kpi-label">{label}</div>
    <div className="kpi-value" style={{ color }}>{value}</div>
    <div className="kpi-sub">{sub}</div>
  </div>
);

export default KpiCard;