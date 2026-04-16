import React from 'react';
import StaticPage from './StaticPage';

const TermsPage = () => (
  <StaticPage title="Terms of Use">
    <p className="static-last-updated">Last updated: March 2026</p>
    <h3 className="static-section-heading">Purpose</h3>
    <p>RecyWise is a practical tool designed to assist recycling facility technicians in planning efficient ELV dismantling pathways. It uses a trained model to suggest pathways based on vehicle details, and it is intended to support day-to-day operational decisions along with technicians' expertise.</p>
    <h3 className="static-section-heading">Estimates, not guarantees</h3>
    <p>All profit figures and rankings are <strong>estimates only</strong>. Actual results depend on real vehicle condition, market demand, and technician efficiency. RecyWise supports decision-making but does not replace professional judgement.</p>
    <h3 className="static-section-heading">Safety compliance</h3>
    <p>Safe Depollution and Airbag Neutralization are always placed first as mandatory steps, in line with EU ELV Directive obligations. It remains the user’s responsibility to follow all local laws, safety procedures, and environmental regulations applicable to their facility.</p>
    <h3 className="static-section-heading">Limitation of liability</h3>
    <p>The developers of RecyWise accept no liability for financial loss, regulatory non-compliance, or operational decisions made solely on the basis of this system's outputs. Final decisions on dismantling, resale, or recycling should always be made based on your professional judgement and on-site conditions.</p>
  </StaticPage>
);

export default TermsPage;

