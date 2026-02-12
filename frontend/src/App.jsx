import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import './App.css';

// ====================================================================
// CONFIGURATION
// ====================================================================

/**
 * Base URL for backend API endpoints
 * @constant {string}
 */
const API_BASE_URL = "http://127.0.0.1:8000/api";

// ====================================================================
// RENDER HELPER COMPONENTS
// (Moved OUTSIDE App function to fix focus loss bug)
// ====================================================================

/**
 * Navigation bar component
 */
const Navbar = () => (
  <nav className="navbar">
    <div className="navbar-container">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <svg className="logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="navbar-title">RecyWise</span>
      </div>
    </div>
  </nav>
);

/**
 * Footer component
 */
const Footer = () => (
  <footer className="footer">
    <div className="footer-container">
      <div className="footer-copyright">
        © 2026 | 20210741 | W1953980
      </div>
      <div className="footer-links">
        <a href="#" className="footer-link">Privacy</a>
        <a href="#" className="footer-link">Terms</a>
        <a href="#" className="footer-link">Support</a>
      </div>
    </div>
  </footer>
);

/**
 * Back button component
 */
const BackButton = ({ setScreen }) => (
  <button 
    onClick={() => setScreen(prev => prev - 1)}
    className="back-button"
  >
    <ArrowLeftIcon className="back-icon" />
    <span>Back</span>
  </button>
);

/**
 * Main container component
 */
const Container = ({ children, title, screen, setScreen, errorMsg }) => (
  <div className="page-wrapper">
    <Navbar />
    <main className="main-content">
      <div className="content-container-fullscreen">
        {/* Show back button on all screens except first */}
        {screen > 1 && <BackButton setScreen={setScreen} />}
        
        <div className="card">
          {/* Render title if provided */}
          {title && <h1 className="card-title">{title}</h1>}
          
          {/* Main content */}
          {children}
          
          {/* Error message display */}
          {errorMsg && (
            <div className="error-message">
              <p>{errorMsg}</p>
            </div>
          )}
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

// ====================================================================
// MAIN APPLICATION COMPONENT
// ====================================================================

function App() {
  
  // ================================================================
  // STATE MANAGEMENT
  // ================================================================
  
  const [screen, setScreen] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [vin, setVin] = useState('');
  
  const [vehicleData, setVehicleData] = useState({ 
    year: '', 
    make: '', 
    model: '' 
  });
  
  const [materials, setMaterials] = useState({
    "Steel": 0,
    "Aluminum": 0,
    "Copper": 0,
    "Plastics": 0,
    "Rubber": 0,
    "Glass": 0,
  });
  
  const [pathway, setPathway] = useState(null);

  // ================================================================
  // API HANDLER FUNCTIONS
  // ================================================================

  const handleVinSubmit = async () => {
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      // API call to decode VIN
      const response = await axios.get(`${API_BASE_URL}/decode_vin/${vin}`);
      
      setVehicleData({
        year: response.data.year,
        make: response.data.make,
        model: response.data.model
      });
      
      setScreen(4);
      
    } catch (error) {
      console.error("VIN Decode Failed:", error);
      setScreen(3);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualVehicleSubmit = () => {
    if (!vehicleData.year || !vehicleData.make || !vehicleData.model) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    setErrorMsg('');
    setScreen(4);
  };

  const handleSaveManualMaterials = () => {
    setScreen(6);
  };

  const handleGeneratePathway = async () => {
    setScreen(8);
    
    try {
      const payload = {
        vehicle: vehicleData,
        materials: materials
      };
      
      const response = await axios.post(`${API_BASE_URL}/generate_pathway`, payload);
      setPathway(response.data.pathway);
      setScreen(9);
      
    } catch (error) {
      console.error("Pathway generation failed:", error);
      setErrorMsg("Failed to generate pathway.");
      setScreen(6);
    }
  };

  // ================================================================
  // SCREEN RENDERING LOGIC
  // ================================================================

  const renderScreen = () => {
    switch (screen) {
      
      // SCREEN 01: Landing Page
      case 1:
        return (
          <div className="landing-page">
            <Navbar />
            <main className="landing-main">
              <div className="landing-content">
                <div className="landing-logo">
                  <span>RW</span>
                </div>
                
                <div className="landing-text">
                  <h1 className="landing-title">RecyWise</h1>
                  <p className="landing-subtitle">Smart Vehicle Recycling</p>
                  <p className="landing-description"> Optimization Platform for Recycling with Intelligence</p>
                </div>
                
                <button 
                  onClick={() => setScreen(2)}
                  className="btn btn-primary btn-large"
                >
                  Start Optimization
                </button>
              </div>
            </main>
            <Footer />
          </div>
        );

      // SCREEN 02: VIN Entry
      case 2:
        return (
          <Container title="Smart Vehicle Recycling" screen={screen} setScreen={setScreen} errorMsg={errorMsg}>
            <div className="form-section">
              <div className="form-group">
                <label className="form-label">Enter VIN</label>
                <input 
                  type="text" 
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  className="form-input vin-input"
                  placeholder="1HGBH41JXMN109186"
                  maxLength={17}
                />
                <p className="form-hint">17-character Vehicle Identification Number</p>
              </div>
              
              <button 
                onClick={handleVinSubmit}
                disabled={isLoading || vin.length < 5}
                className="btn btn-secondary btn-full"
              >
                {isLoading ? 'Processing...' : 'Proceed'}
              </button>
            </div>
          </Container>
        );

      // SCREEN 03: Manual Vehicle Entry (Fallback)
      case 3:
        return (
          <Container title="Manual Identification" screen={screen} setScreen={setScreen} errorMsg={errorMsg}>
            <div className="form-section">
              <div className="alert alert-warning">
                <p>VIN decode failed. Please enter vehicle details manually.</p>
              </div>
              
              <div className="form-group-stack">
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input 
                    type="number" 
                    placeholder="e.g., 2015"
                    value={vehicleData.year}
                    onChange={(e) => setVehicleData({...vehicleData, year: e.target.value})}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Make</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Toyota"
                    value={vehicleData.make}
                    onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Model</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Camry"
                    value={vehicleData.model}
                    onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>
              
              <button 
                onClick={handleManualVehicleSubmit}
                className="btn btn-primary btn-full"
              >
                Confirm Vehicle
              </button>
            </div>
          </Container>
        );

      // SCREEN 04: Vehicle Confirmation
      case 4:
        return (
          <Container title="Confirm Vehicle" screen={screen} setScreen={setScreen} errorMsg={errorMsg}>
            <div className="form-section">
              <div className="vehicle-display">
                <p className="vehicle-name">
                  {vehicleData.year} {vehicleData.make}
                </p>
                <p className="vehicle-model">{vehicleData.model}</p>
              </div>
              
              <div className="button-group">
                <button 
                  onClick={() => setScreen(5)}
                  className="btn btn-success btn-full"
                >
                  Yes, Proceed to Materials
                </button>
                
                <button 
                  onClick={() => { setVin(''); setScreen(2); }}
                  className="btn btn-outline btn-full"
                >
                  No, Enter Different VIN
                </button>
              </div>
            </div>
          </Container>
        );

      // SCREEN 05: Material Estimation Options
      case 5:
        return (
          <Container title="Material Estimation" screen={screen} setScreen={setScreen} errorMsg={errorMsg}>
            <div className="form-section">
              <p className="section-description">
                How would you like to determine the material composition?
              </p>
              
              <div className="option-group">
                <button 
                  onClick={() => {}} 
                  className="option-card option-ai"
                >
                  <p className="option-title">AI Auto-Estimate</p>
                  
                </button>
                
                <div className="divider">
                  <span>OR</span>
                </div>

                <button 
                  onClick={() => setScreen(7)}
                  className="btn btn-outline btn-full"
                >
                  Enter Composition Manually
                </button>
              </div>
            </div>
          </Container>
        );

      // SCREEN 06: Review Material Composition
      case 6:
        return (
          <Container title="Review Composition" screen={screen} setScreen={setScreen} errorMsg={errorMsg}>
            <div className="form-section">
              <div className="alert alert-info">
                <div className="alert-flex">
                  <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p>Review these estimates. Ensure they sum to approximately 100%.</p>
                </div>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="table-header">Material</th>
                      <th className="table-header text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(materials).map(([key, val]) => (
                      <tr key={key} className="table-row">
                        <td className="table-cell">{key}</td>
                        <td className="table-cell text-right table-value">{val}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="button-group">
                <button 
                  onClick={handleGeneratePathway}
                  className="btn btn-primary btn-full"
                >
                  Generate Optimized Pathway
                </button>
                
                <button 
                  onClick={() => setScreen(7)}
                  className="btn btn-text btn-full"
                >
                  Edit Values
                </button>
              </div>
            </div>
          </Container>
        );

      // SCREEN 07: Manual Material Composition Entry
      case 7:
        return (
          <Container title="Edit Material Composition" screen={screen} setScreen={setScreen} errorMsg={errorMsg}>
            <div className="form-section">
              <div className="table-container table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="table-header sticky-header">Material</th>
                      <th className="table-header sticky-header text-right">Percentage (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(materials).map((key) => (
                      <tr key={key} className="table-row">
                        <td className="table-cell">{key}</td>
                        <td className="table-cell text-right">
                          <input 
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={materials[key]}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : e.target.value;
                              setMaterials(prev => ({ ...prev, [key]: value }));
                            }}
                            onBlur={(e) => {
                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              setMaterials(prev => ({ ...prev, [key]: value }));
                            }}
                            className="table-input"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <button 
                onClick={handleSaveManualMaterials}
                className="btn btn-primary btn-full"
              >
                Save & Review
              </button>
            </div>
          </Container>
        );

      // SCREEN 08: Loading Screen
      case 8:
        return (
          <Container screen={screen} setScreen={setScreen}>
            <div className="loading-container">
              <div className="spinner-wrapper">
                <div className="spinner"></div>
                <div className="spinner-center"></div>
              </div>
              
              <h2 className="loading-title">Optimizing Pathway</h2>
              <p className="loading-text">Analyzing market data and ML models...</p>
            </div>
          </Container>
        );

      // SCREEN 09: Optimized Pathway Results
      case 9:
        return (
          <Container title="Optimized Recycling Pathway" screen={screen} setScreen={setScreen} errorMsg={errorMsg}>
            <div className="form-section">
              <div className="table-container table-scroll">
                <table className="data-table">
                  <thead className="table-header-dark">
                    <tr>
                      <th className="table-header sticky-header">Seq</th>
                      <th className="table-header sticky-header">Action</th>
                      <th className="table-header sticky-header text-right">Profit ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pathway && pathway.map((step) => (
                      <tr key={step.sequence} className="table-row">
                        <td className="table-cell pathway-seq">#{step.sequence}</td>
                        <td className="table-cell">{step.action}</td>
                        <td className={`table-cell text-right ${
                          step.projected_profit >= 0 ? 'profit-positive' : 'profit-negative'
                        }`}>
                          {step.projected_profit >= 0 ? '+' : ''}{step.projected_profit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="profit-summary">
                <span className="profit-label">Total Estimated Net Profit:</span>
                <span className="profit-value">
                  ${pathway ? pathway.reduce((sum, step) => sum + step.projected_profit, 0).toFixed(2) : "0.00"}
                </span>
              </div>

              <button 
                onClick={() => setScreen(1)}
                className="btn btn-dark btn-full"
              >
                Process Next Vehicle
              </button>
            </div>
          </Container>
        );

      default:
        return <div>Error: Screen not found</div>;
    }
  };

  return renderScreen();
}

export default App;
