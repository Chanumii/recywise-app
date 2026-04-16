import React from 'react';

const JobTimeline = ({ pathway }) => {
  // Normalize bar widths relative to the longest estimated task
  const maxTime = Math.max(...pathway.map(s => s.estimated_time_mins));
  return (
    <div>
      {pathway.map(s => {
        const widthPct    = (s.estimated_time_mins / maxTime) * 100;
        const isLoss      = s.projected_profit < 0;
        const alpha       = isLoss ? 0.75 : Math.max(0.25, Math.min(1, s.projected_profit / 400));
        const bg          = isLoss ? `rgba(220,38,38,${alpha})` : `rgba(5,150,105,${alpha})`;
        const textColor   = isLoss ? '#7f1d1d' : '#064e3b';
        const profitColor = isLoss ? '#dc2626' : '#059669';
        
        return (
          <div key={s.sequence} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <div style={{ fontSize: 10, color: '#6b7280', width: 130, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              #{s.sequence} {s.action}
            </div>
            <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 3, height: 20 }}>
              <div style={{ width: `${widthPct}%`, height: '100%', background: bg, borderRadius: 3, display: 'flex', alignItems: 'center', paddingLeft: 4, boxSizing: 'border-box' }}>
                <span style={{ fontSize: 9, fontWeight: 500, color: textColor, whiteSpace: 'nowrap' }}>{s.estimated_time_mins}min</span>
              </div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, width: 52, flexShrink: 0, textAlign: 'right', color: profitColor }}>
              {s.projected_profit >= 0 ? '+' : ''}${s.projected_profit.toFixed(0)}
            </div>
          </div>
        );
      })}
    </div>
  );
};


export default JobTimeline;