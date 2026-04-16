import React from 'react';

//shared layout wrapper for Privacy, Terms, and Support.
const StaticPage = ({ title, children }) => (
  <div className="page-content">
    <div className="page-header page-header-centered">
      <h1 className="page-title">{title}</h1>
    </div>
    <div className="static-page">{children}</div>
  </div>
);

export default StaticPage;
