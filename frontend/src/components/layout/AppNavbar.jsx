import React from 'react';
import logoIcon from '../../assets/logo-icon.png';
import logoText from '../../assets/logo-text.png';

// top navigation bar.

const AppNavbar = ({ onLogoClick, onNewVehicle }) => (
  <nav className="navbar">
    <div className="navbar-container">

      {/* Brand logo — clicking navigates to Dashboard */}
      <button className="navbar-brand-btn" onClick={onLogoClick}>
        <img src={logoIcon} alt="RecyWise icon" className="navbar-logo-img" />
        <img src={logoText} alt="RecyWise"      className="navbar-text-img" />
      </button>

      {/* Right: New Vehicle button only */}
      <div className="navbar-right">
        <button className="nav-new-vehicle-btn" onClick={onNewVehicle}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ width: 14, height: 14, marginRight: 5, verticalAlign: 'middle' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Vehicle
        </button>
      </div>

    </div>
  </nav>
);

export default AppNavbar;