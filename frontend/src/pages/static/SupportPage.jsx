import React from 'react';
import StaticPage from './StaticPage';

const SupportPage = () => (
  <StaticPage title="Support">
    <h3 className="static-section-heading">Getting help</h3>
    <p>RecyWise is an internally deployed system. For technical issues, contact the development team responsible for your installation.</p>
    <h3 className="static-section-heading">Frequently asked questions</h3>
    <div className="faq-item">
      <p className="faq-q">Hull Shredding shows a profit but always appears last, is this correct?</p>
      <p className="faq-a">Yes. Hull Shredding is always enforced as the final step regardless of profit, because the vehicle shell can only be crushed once all parts are removed.</p>
    </div>
    <div className="faq-item">
      <p className="faq-q">The catalytic converter value seems very high. Is that right?</p>
      <p className="faq-a">Cat value is based on live platinum and palladium prices. If precious metal prices are elevated, the value will be high. Set it to "Aftermarket" or "Missing" in the condition check if the OEM catalyst is not present.</p>
    </div>
    <div className="faq-item">
      <p className="faq-q">A step I expected is missing from the pathway.</p>
      <p className="faq-a">Check the Vehicle Condition flags. If a part was marked as absent, that step is removed before the pathway is built. Review the flags and regenerate.</p>
    </div>
    <div className="faq-item">
      <p className="faq-q">How do I look up a vehicle processed earlier?</p>
      <p className="faq-a">Click "Vehicle History" in the sidebar. Search by VIN, make, model, or year, then click any row to view the full pathway.</p>
    </div>
    <div className="faq-item">
      <p className="faq-q">Can I see what was processed on a past date?</p>
      <p className="faq-a">Yes, use the date picker at the top-right of the Dashboard. Select any past date to see the KPIs and activity for that day.</p>
    </div>
    <div className="faq-item">
      <p className="faq-q">Why does the history table show "Approx. weight" instead of exact weight?</p>
      <p className="faq-a">Vehicle weight is looked up from the NHTSA database or defaults to 3,500 lbs if the model is not found. It is an estimate, not a measured value, so it is labelled accordingly.</p>
    </div>
  </StaticPage>
);

export default SupportPage;