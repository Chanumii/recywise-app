import React from 'react';
import StaticPage from './StaticPage';

const PrivacyPage = () => (

  <StaticPage title="Privacy Policy">
    <p className="static-last-updated">Last updated: March 2026</p>
    <h3 className="static-section-heading">What data RecyWise collects</h3>
    <p>RecyWise stores vehicle processing records on your facility's own server. Each record includes the VIN, year, make, model, and the generated recycling pathway with estimated profit figures. No personal data about staff is collected.</p>
    <p>While processing a vehicle, RecyWise contacts three trusted external services: <strong>NHTSA vPIC</strong> for vehicle specifications, <strong>Yahoo Finance</strong> for metal prices, and <strong>Google Gemini AI</strong> for material estimates. Only make, model, and year are shared. The VIN is never sent to external services.</p>
    <h3 className="static-section-heading">How your data is stored</h3>
    <p>All records are saved in a local database file on your own system inside your facility's network. This data is not accessible from outside unless explicitly configured.</p>
    <h3 className="static-section-heading">How long data is kept</h3>
    <p>RecyWise keeps all records until they are manually removed.</p>
  </StaticPage>
);

export default PrivacyPage;