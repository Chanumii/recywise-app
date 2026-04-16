import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

//collapsible accordion section for condition flags.
const ConditionSection = ({ title, icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="condition-section">
      <button type="button" className="condition-section-header" onClick={() => setOpen(o => !o)}>
        <span className="condition-section-title"><span className="condition-section-icon">{icon}</span>{title}</span>
        {open ? <ChevronUpIcon style={{ width: 16, height: 16 }} /> : <ChevronDownIcon style={{ width: 16, height: 16 }} />}
      </button>
      {open && <div className="condition-section-body">{children}</div>}
    </div>
  );
};

export default ConditionSection;