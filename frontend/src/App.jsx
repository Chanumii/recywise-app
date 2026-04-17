import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import './App.css';

// Constants
import { API_BASE_URL, DEFAULT_FLAGS } from './constants';

// Auth
import AuthPage from './pages/AuthPage';

// Layout
import AppNavbar from './components/layout/AppNavbar';
import Sidebar   from './components/layout/Sidebar';
import Footer    from './components/layout/Footer';

// Flow
import FlowScreen           from './components/flow/FlowScreen';
import LoadingVisualization from './components/flow/LoadingVisualization';

// Condition assessment
import SegmentedControl from './components/flow/condition/SegmentedControl';
import ToggleFlag       from './components/flow/condition/ToggleFlag';
import CountStepper     from './components/flow/condition/CountStepper';
import ConditionSection from './components/flow/condition/ConditionSection';

// Results
import KpiCard      from './components/results/KpiCard';
import PathwayPanel from './components/results/PathwayPanel';

// Pages
import DashboardPage from './pages/DashboardPage';
import HistoryPage   from './pages/HistoryPage';
import SettingsPage  from './pages/SettingsPage';
import PrivacyPage   from './pages/static/PrivacyPage';
import TermsPage     from './pages/static/TermsPage';
import SupportPage   from './pages/static/SupportPage';


function App() {

  // ── Auth state ─────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('recywise_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // ── Navigation & UI state ──────────────────────────────────────
  const [page,      setPage]      = useState('dashboard');
  const [screen,    setScreen]    = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  // ── Vehicle processing state ───────────────────────────────────
  const [vin,            setVin]            = useState('');
  const [vehicleData,    setVehicleData]    = useState({ year: '', make: '', model: '' });
  const [materials,      setMaterials]      = useState({ Steel: 0, Aluminum: 0, Copper: 0, Plastics: 0, Rubber: 0, Glass: 0 });
  const [pathway,        setPathway]        = useState(null);
  const [conditionFlags, setConditionFlags] = useState({ ...DEFAULT_FLAGS });

  // ── Record viewing state ───────────────────────────────────────
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordLoading,  setRecordLoading]  = useState(false);

  // ── Yard settings ─────────────────
  const [yardSettings, setYardSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('recywise_yard_settings');
      return saved ? JSON.parse(saved) : { custom_labour_rate: 32.50, custom_action_times: {} };
    } catch { return { custom_labour_rate: 32.50, custom_action_times: {} }; }
  });

  // ── Auth handlers ──────────────────────────────────────────────

  /** Called by AuthPage on successful login or signup. */
  const handleLogin = user => setCurrentUser(user);

  /** Clear the session and return to the login screen. */
  const handleLogout = () => {
    localStorage.removeItem('recywise_current_user');
    setCurrentUser(null);
    setPage('dashboard');
  };

  // If no user is logged in, render only the auth page
  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  // ── Navigation helpers ─────────────────────────────────────────
  const goTo    = p      => { setPage(p); setErrorMsg(''); };
  const setFlag = (k, v) => setConditionFlags(prev => ({ ...prev, [k]: v }));

  const handleUpdateSettings = settings => {
    setYardSettings(settings);
    try { localStorage.setItem('recywise_yard_settings', JSON.stringify(settings)); }
    catch (e) { console.warn('Could not persist yard settings:', e); }
  };

  const startNewVehicle = () => {
    setVin(''); setErrorMsg('');
    setVehicleData({ year: '', make: '', model: '' });
    setMaterials({ Steel: 0, Aluminum: 0, Copper: 0, Plastics: 0, Rubber: 0, Glass: 0 });
    setPathway(null);
    setConditionFlags({ ...DEFAULT_FLAGS });
    setScreen(2);
    goTo('new-vehicle');
  };

  const handleBack = () => {
    if (screen <= 2) { goTo('dashboard'); return; }
    setScreen(prev => prev - 1);
  };

  const handleViewRecord = async id => {
    setRecordLoading(true); goTo('record-detail');
    try {
      const r = await axios.get(`${API_BASE_URL}/api/vehicle_record/${id}`);
      setSelectedRecord(r.data);
    } catch { setSelectedRecord(null); }
    finally  { setRecordLoading(false); }
  };

  // ── VIN validation ─────────────────────────────────────────────
  const handleVinChange = e => {
    const cleaned = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 17);
    setVin(cleaned);
  };

  // Valid when exactly 17 characters 
  const isVinValid = vin.length === 17;

  // ── API handlers ───────────────────────────────────────────────
  const handleVinSubmit = async () => {
    setIsLoading(true); setErrorMsg('');
    try {
      const r = await axios.get(`${API_BASE_URL}/api/decode_vin/${vin}`);
      const data = r.data;
      setVehicleData({ year: data.year || '', make: data.make || '', model: data.model || '' });
      if (data.partial) setScreen(3); else setScreen(4);
    } catch {
      setVehicleData({ year: '', make: '', model: '' }); setScreen(3);
    } finally { setIsLoading(false); }
  };

  const handleManualVehicleSubmit = () => {
    if (!vehicleData.year || !vehicleData.make || !vehicleData.model) {
      setErrorMsg('Please fill in all fields.'); return;
    }
    setErrorMsg(''); setScreen(4);
  };

  const handleAutoEstimateMaterials = async () => {
    setIsLoading(true); setErrorMsg('');
    try {
      const r = await axios.post(`${API_BASE_URL}/api/estimate_materials`, vehicleData);
      setMaterials({
        Steel: r.data.Steel || 0, Aluminum: r.data.Aluminum || 0,
        Copper: r.data.Copper || 0, Plastics: r.data.Plastics || 0,
        Rubber: r.data.Rubber || 0, Glass: r.data.Glass || 0,
      });
      setScreen(7);
    } catch { setErrorMsg('Failed to auto-estimate. Please enter manually.'); }
    finally  { setIsLoading(false); }
  };

  const handleGeneratePathway = async () => {
    setScreen(9);
    try {
      const r = await axios.post(`${API_BASE_URL}/api/generate_pathway`, {
        vehicle:             vehicleData,
        materials,
        condition_flags:     conditionFlags,
        custom_labour_rate:  parseFloat(yardSettings.custom_labour_rate) || 32.50,
        custom_action_times: yardSettings.custom_action_times || {},
      });
      setPathway(r.data.pathway);
      setScreen(10);
      const tp  = r.data.pathway.reduce((s, x) => s + x.projected_profit, 0);
      const ttm = r.data.pathway.reduce((s, x) => s + x.estimated_time_mins, 0);
      axios.post(`${API_BASE_URL}/api/save_record`, {
        vin: vin || '', year: vehicleData.year, make: vehicleData.make, model: vehicleData.model,
        total_profit: Math.round(tp * 100) / 100, total_time_mins: ttm,
        vehicle_weight_lbs: r.data.vehicle_weight_lbs, pathway: r.data.pathway,
        condition_notes: r.data.condition_notes || [], market_prices: r.data.market_prices_used || {},
      }).catch(e => console.warn('Record save failed (non-critical):', e));
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to generate pathway.';
      setErrorMsg(typeof detail === 'object' ? JSON.stringify(detail) : detail);
      setScreen(7);
    }
  };

  // ── Vehicle wizard ─────────────────────────────────────────────
  const renderVehicleFlow = () => {
    switch (screen) {

      // Screen 2: VIN Entry
      case 2: return (
        <div className="flow-page flow-page-gradient">
          {/* Back button at page level for consistent top-left positioning */}
          <button onClick={() => goTo('dashboard')} className="back-button flow-back-btn">
            <ArrowLeftIcon className="back-icon" /><span>Back</span>
          </button>

          <div className="flow-content-wrapper">
            <div className="vin-hero">
              <div className="vin-hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h6m1-11h2.586a1 1 0
                       01.707.293l3.414 3.414a1 1 0 01.293.707V16l-2 1h-5"/>
                </svg>
              </div>
              <h1 className="vin-hero-title">Vehicle Intake</h1>
              <p className="vin-hero-sub">Enter the VIN to begin the recycling pathway optimisation</p>
            </div>

            <div className="card">
              {errorMsg && <div className="error-message" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Vehicle Identification Number</label>

                  {/* Input: invalid chars are stripped on every keystroke by handleVinChange */}
                  <input
                    type="text"
                    value={vin}
                    onChange={handleVinChange}
                    className={`form-input vin-input ${isVinValid ? 'vin-valid' : ''}`}
                    placeholder="1HGBH41JXMN109186"
                    maxLength={17}
                  />

                  {/* Live character counter with validity indicator */}
                  <div className="vin-counter">
                    <span className={isVinValid ? 'vin-counter-valid' : 'vin-counter-text'}>
                      {vin.length}/17
                    </span>
                    {isVinValid ? (
                      <span className="vin-counter-valid">Valid format</span>
                    ) : (
                      <span className="vin-counter-invalid">
                        - {17 - vin.length} more character{17 - vin.length !== 1 ? 's' : ''} needed
                      </span>
                    )}
                  </div>
                </div>

                {/* Button disabled until exactly 17 valid alphanumeric characters */}
                <button
                  onClick={handleVinSubmit}
                  disabled={isLoading || !isVinValid}
                  className="btn btn-primary btn-full"
                >
                  {isLoading ? 'Decoding VIN…' : 'Decode & Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      );

      // Screen 3: Manual entry
      case 3: return (
        <FlowScreen title="Manual Identification" onBack={handleBack} gradient>
          <div className="form-section">
            <div className="alert alert-warning"><p>VIN decode failed. Please enter vehicle details manually.</p></div>
            <div className="form-group-stack">
              {['year', 'make', 'model'].map(field => (
                <div className="form-group" key={field}>
                  <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                  <input
                    type={field === 'year' ? 'number' : 'text'}
                    placeholder={field === 'year' ? 'e.g., 2015' : field === 'make' ? 'e.g., Toyota' : 'e.g., Camry'}
                    value={vehicleData[field]}
                    onChange={e => setVehicleData({ ...vehicleData, [field]: e.target.value })}
                    className="form-input form-input-light"
                  />
                </div>
              ))}
            </div>
            {errorMsg && <div className="error-message" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}
            <button onClick={handleManualVehicleSubmit} className="btn btn-primary btn-full">Confirm Vehicle</button>
          </div>
        </FlowScreen>
      );

      // Screen 4: Confirm vehicle
      case 4: return (
        <FlowScreen err={errorMsg} onBack={handleBack} gradient>
          <div className="confirm-vehicle-content">
            <div className="confirm-vehicle-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h6m1-11h2.586a1 1 0
                     01.707.293l3.414 3.414a1 1 0 01.293.707V16l-2 1h-5"/>
              </svg>
            </div>
            <p className="confirm-vehicle-label">Is this the correct vehicle?</p>
            <div className="confirm-vehicle-box">
              <p className="confirm-vehicle-make">{vehicleData.year} {vehicleData.make}</p>
              <p className="confirm-vehicle-model">{vehicleData.model}</p>
              {vin && <p className="confirm-vehicle-vin">{vin}</p>}
            </div>
            <div className="confirm-vehicle-actions">
              <button onClick={() => setScreen(5)} className="btn btn-success btn-full">Yes, Proceed to Condition Check</button>
              <button onClick={() => { setVin(''); setScreen(2); }} className="btn btn-outline btn-full">No, Enter Different VIN</button>
            </div>
          </div>
        </FlowScreen>
      );

      // Screen 5: Condition assessment
      case 5: return (
        <FlowScreen title="Vehicle Condition Assessment" err={errorMsg} onBack={handleBack} wide>
          <div className="form-section">
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              <div className="alert-flex">
                <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p>Inspect the vehicle and set any flags that apply. Damaged or missing parts will automatically rank lower or be removed from the pathway.</p>
              </div>
            </div>

            <ConditionSection title="Powertrain"defaultOpen={true}>
              <div className="condition-flag-row">
                <div className="condition-flag-label-group">
                  <span className="condition-flag-label">Engine condition</span>
                  <span className="condition-flag-note">{conditionFlags.flood_damage ? 'Auto-set: Seized due to flood' : 'Affects engine resale value'}</span>
                </div>
                <SegmentedControl value={conditionFlags.flood_damage ? 'seized' : conditionFlags.engine_condition} onChange={v => setFlag('engine_condition', v)} disabled={conditionFlags.flood_damage} options={[{ value: 'runs', label: 'Runs' }, { value: 'cranks', label: 'Cranks' }, { value: 'seized', label: 'Seized' }]} />
              </div>
              <div className="condition-flag-row">
                <div className="condition-flag-label-group"><span className="condition-flag-label">Catalytic converter</span><span className="condition-flag-note">Aftermarket = low PGM; stolen = step removed</span></div>
                <SegmentedControl value={conditionFlags.cat_type} onChange={v => setFlag('cat_type', v)} options={[{ value: 'oem', label: 'OEM' }, { value: 'aftermarket', label: 'Aftermarket' }, { value: 'missing', label: 'Missing' }]} />
              </div>
              <ToggleFlag checked={conditionFlags.transmission_present} onChange={v => setFlag('transmission_present', v)} label="Transmission present" note="Step removed if absent" />
              <ToggleFlag checked={conditionFlags.turbo_present} onChange={v => setFlag('turbo_present', v)} label="Turbocharger present" note="Increases engine value +20%" />
              <ToggleFlag checked={conditionFlags.dpf_present} onChange={v => setFlag('dpf_present', v)} label="DPF present (diesel)" note="Adds ~$200 recovery value" />
            </ConditionSection>

            <ConditionSection title="Electrical & Fluids">
              <ToggleFlag checked={conditionFlags.battery_present} onChange={v => setFlag('battery_present', v)} label="12V battery present" note="Step removed if absent" />
              <ToggleFlag checked={conditionFlags.hybrid_battery} onChange={v => setFlag('hybrid_battery', v)} label="Hybrid / HV battery present" note="Value set to ~$500 (vs $22 for 12V)" />
              <div className="condition-flag-row">
                <div className="condition-flag-label-group"><span className="condition-flag-label">Wiring harness condition</span><span className="condition-flag-note">{conditionFlags.body_damage === 'fire' ? 'Auto-set: Burned due to fire' : 'Cut = −60% copper; burned = −90%'}</span></div>
                <SegmentedControl value={conditionFlags.body_damage === 'fire' ? 'burned' : conditionFlags.wiring_condition} onChange={v => setFlag('wiring_condition', v)} disabled={conditionFlags.body_damage === 'fire'} options={[{ value: 'intact', label: 'Intact' }, { value: 'cut', label: 'Cut' }, { value: 'burned', label: 'Burned' }]} />
              </div>
              <ToggleFlag checked={conditionFlags.ac_refrigerant_present} onChange={v => setFlag('ac_refrigerant_present', v)} label="AC refrigerant present" note="Step removed if already recovered" />
              <ToggleFlag checked={conditionFlags.fuel_in_tank} onChange={v => setFlag('fuel_in_tank', v)} label="Fuel in tank" note="Adds time to depollution step" />
              <ToggleFlag checked={conditionFlags.airbags_deployed} onChange={v => setFlag('airbags_deployed', v)} label="Airbags already deployed" note="Reduces neutralisation time" />
            </ConditionSection>

            <ConditionSection title="Body & Exterior">
              <div className="condition-flag-row">
                <div className="condition-flag-label-group"><span className="condition-flag-label">Body damage level</span><span className="condition-flag-note">Heavy: panels −50%; fire: panels −80%</span></div>
                <SegmentedControl value={conditionFlags.body_damage} onChange={v => setFlag('body_damage', v)} options={[{ value: 'minor', label: 'Minor' }, { value: 'heavy', label: 'Heavy' }, { value: 'fire', label: 'Fire' }]} />
              </div>
              <ToggleFlag checked={conditionFlags.flood_damage} onChange={v => setFlag('flood_damage', v)} label="Flood damage" note="Copper −70%, engine −80%, battery zeroed" />
              <CountStepper value={conditionFlags.wheels_present} onChange={v => setFlag('wheels_present', v)} min={0} max={4} label="Wheels present" note="Values scaled proportionally (0 = step removed)" />
              <div className="condition-flag-row">
                <div className="condition-flag-label-group"><span className="condition-flag-label">Tyre condition</span><span className="condition-flag-note">{conditionFlags.wheels_present === 0 ? 'N/A — no wheels present' : 'Resaleable = ×5 scrap value'}</span></div>
                <SegmentedControl value={conditionFlags.wheels_present === 0 ? null : conditionFlags.tyre_condition} onChange={v => setFlag('tyre_condition', v)} disabled={conditionFlags.wheels_present === 0} options={[{ value: 'resaleable', label: 'Resaleable' }, { value: 'worn', label: 'Worn' }, { value: 'flat', label: 'Flat' }]} />
              </div>
              <div className="condition-flag-row">
                <div className="condition-flag-label-group"><span className="condition-flag-label">Glass condition</span><span className="condition-flag-note">{conditionFlags.body_damage === 'fire' ? 'Auto-set: Smashed due to fire' : 'Smashed = cullet value only (15%)'}</span></div>
                <SegmentedControl value={conditionFlags.body_damage === 'fire' ? 'smashed' : conditionFlags.glass_condition} onChange={v => setFlag('glass_condition', v)} disabled={conditionFlags.body_damage === 'fire'} options={[{ value: 'intact', label: 'Intact' }, { value: 'cracked', label: 'Cracked' }, { value: 'smashed', label: 'Smashed' }]} />
              </div>
            </ConditionSection>

            <ConditionSection title="Interior">
              <ToggleFlag checked={conditionFlags.body_damage === 'fire' ? false : conditionFlags.interior_present} onChange={v => setFlag('interior_present', v)} label="Interior / seats present" note={conditionFlags.body_damage === 'fire' ? 'Auto-set: Destroyed due to fire' : 'Step removed if already stripped'} disabled={conditionFlags.body_damage === 'fire'} />
              <ToggleFlag checked={conditionFlags.flood_damage ? false : conditionFlags.ecu_present} onChange={v => setFlag('ecu_present', v)} label="ECU / electronics intact" note={conditionFlags.flood_damage ? 'Auto-set: Bricked due to flood' : 'Step removed if already harvested'} disabled={conditionFlags.flood_damage} />
            </ConditionSection>

            <div style={{ marginTop: '1.5rem' }}>
              <button onClick={() => setScreen(6)} className="btn btn-primary btn-full">Confirm Condition &amp; Continue</button>
            </div>
          </div>
        </FlowScreen>
      );

      // Screen 6: Material estimation method
      case 6: return (
        <FlowScreen title="Material Estimation" err={errorMsg} onBack={handleBack} gradient>
          <div className="form-section">
            <p className="section-description">How would you like to determine the material composition?</p>
            <div className="option-group">
              <button onClick={handleAutoEstimateMaterials} className="option-card option-ai" disabled={isLoading}>
                <p className="option-title">{isLoading ? 'Estimating…' : 'AI Auto-Estimate'}</p>
              </button>
              <div className="divider"><span>OR</span></div>
              <button onClick={() => setScreen(8)} className="btn btn-outline btn-full">Enter Composition Manually</button>
            </div>
          </div>
        </FlowScreen>
      );

      // Screen 7: Review composition
      case 7: return (
        <FlowScreen title="Review Composition" err={errorMsg} onBack={handleBack} gradient>
          <div className="form-section">
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th className="table-header">Material</th><th className="table-header text-right">Percentage</th></tr></thead>
                <tbody>{Object.entries(materials).map(([key, val]) => (<tr key={key} className="table-row"><td className="table-cell">{key}</td><td className="table-cell text-right table-value">{val}%</td></tr>))}</tbody>
              </table>
            </div>
            <div className="button-group">
              <button onClick={handleGeneratePathway} className="btn btn-primary btn-full">Generate Optimized Pathway</button>
              <button onClick={() => setScreen(8)} className="btn btn-text btn-full">Edit Values</button>
            </div>
          </div>
        </FlowScreen>
      );

      // Screen 8: Manual material entry
      case 8: return (
        <FlowScreen title="Edit Material Composition" err={errorMsg} onBack={handleBack} gradient>
          <div className="form-section">
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th className="table-header sticky-header">Material</th><th className="table-header sticky-header text-right">Percentage (%)</th></tr></thead>
                <tbody>
                  {Object.keys(materials).map(key => (
                    <tr key={key} className="table-row">
                      <td className="table-cell">{key}</td>
                      <td className="table-cell text-right">
                        <input type="number" step="0.01" min="0" max="100" value={materials[key]} className="table-input"
                          onChange={e => setMaterials(p => ({ ...p, [key]: e.target.value === '' ? '' : e.target.value }))}
                          onBlur={e => setMaterials(p => ({ ...p, [key]: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setScreen(7)} className="btn btn-primary btn-full">Save &amp; Review</button>
          </div>
        </FlowScreen>
      );

      // Screen 9: Loading
      case 9: return (
        <div className="flow-page flow-page-gradient flow-page-centered">
          <LoadingVisualization />
        </div>
      );

      // Screen 10: Results
      case 10: {
        const totalProfit   = pathway ? pathway.reduce((s, x) => s + x.projected_profit, 0) : 0;
        const totalTimeMins = pathway ? pathway.reduce((s, x) => s + x.estimated_time_mins, 0) : 0;
        const bestStep      = pathway ? [...pathway].sort((a, b) => b.projected_profit - a.projected_profit)[0] : null;
        const lossCount     = pathway ? pathway.filter(s => s.projected_profit < 0).length : 0;
        return (
          <div className="page-content">
            {/* Uses flow-back-btn for consistent positioning with all other back buttons */}
            <button onClick={() => setScreen(7)} className="back-button flow-back-btn">
              <ArrowLeftIcon className="back-icon" /><span>Back to Materials</span>
            </button>
            <div className="page-header">
              <h1 className="page-title">Optimized Recycling Pathway</h1>
              <p className="page-subtitle">{vehicleData.year} {vehicleData.make} {vehicleData.model}{vin ? ` — ${vin}` : ''}</p>
            </div>
            {errorMsg && <div className="error-message" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}
            {pathway && (
              <div className="results-kpi-row">
                <KpiCard label="Total estimated profit" value={`$${totalProfit.toFixed(0)}`} sub="after all labour costs" color="#059669" />
                <KpiCard label="Total job time" value={`${(totalTimeMins / 60).toFixed(1)}h`} sub={`${totalTimeMins} mins · ${pathway.length} steps`} color="#111827" />
                <KpiCard label="Best single step" value={`$${bestStep.projected_profit.toFixed(0)}`} sub={bestStep.action} color="#059669" />
                <KpiCard label="Loss-making steps" value={lossCount} sub="mandatory compliance steps" color="#dc2626" />
              </div>
            )}
            {pathway && <PathwayPanel pathway={pathway} />}
            <button onClick={startNewVehicle} className="btn btn-dark btn-full" style={{ marginTop: '0.5rem' }}>Process Next Vehicle</button>
          </div>
        );
      }
      default: return null;
    }
  };

  // ── Record detail view ─────────────────────────────────────────
  const renderRecordDetail = () => {
    if (recordLoading) return (
      <div className="page-content">
        <div className="flow-page flow-page-gradient flow-page-centered"><LoadingVisualization /></div>
      </div>
    );
    if (!selectedRecord) return (
      <div className="page-content"><p className="dashboard-empty">Record not found.</p></div>
    );
    const r    = selectedRecord;
    const tp   = r.pathway.reduce((s, x) => s + x.projected_profit, 0);
    const ttm  = r.pathway.reduce((s, x) => s + x.estimated_time_mins, 0);
    const best = [...r.pathway].sort((a, b) => b.projected_profit - a.projected_profit)[0];
    const lc   = r.pathway.filter(s => s.projected_profit < 0).length;
    return (
      <div className="page-content">
        {/* Consistent back button class */}
        <button onClick={() => goTo('history')} className="back-button flow-back-btn">
          <ArrowLeftIcon className="back-icon" /><span>Back to History</span>
        </button>
        <div className="page-header">
          <h1 className="page-title">{r.year} {r.make} {r.model}</h1>
          <p className="page-subtitle">
            {new Date(r.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {r.vin ? ` — ${r.vin}` : ''}
          </p>
        </div>
        <div className="results-kpi-row">
          <KpiCard label="Total estimated profit" value={`$${tp.toFixed(0)}`}       sub="after all labour costs"            color="#059669" />
          <KpiCard label="Total job time"          value={`${(ttm/60).toFixed(1)}h`} sub={`${ttm} mins · ${r.pathway.length} steps`} color="#111827" />
          <KpiCard label="Best single step"        value={`$${best.projected_profit.toFixed(0)}`} sub={best.action}             color="#059669" />
          <KpiCard label="Loss-making steps"       value={lc}                        sub="mandatory compliance steps"        color="#dc2626" />
        </div>
        <PathwayPanel pathway={r.pathway} />
      </div>
    );
  };

  // ── Page router ────────────────────────────────────────────────
  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <DashboardPage onNewVehicle={startNewVehicle} onViewRecord={handleViewRecord} />;
      case 'new-vehicle':   return renderVehicleFlow();
      case 'history':       return <HistoryPage onViewRecord={handleViewRecord} />;
      case 'record-detail': return renderRecordDetail();
      case 'settings':
        // Guard: users who somehow reach this route without admin role are blocked
        if (currentUser.role !== 'admin') {
          return (
            <div className="page-content">
              <div className="page-header"><h1 className="page-title">Settings</h1></div>
              <div className="error-message">You do not have permission to access Settings.</div>
            </div>
          );
        }
        return <SettingsPage yardSettings={yardSettings} onUpdateSettings={handleUpdateSettings} />;
      case 'privacy':  return <PrivacyPage />;
      case 'terms':    return <TermsPage />;
      case 'support':  return <SupportPage />;
      default:         return <DashboardPage onNewVehicle={startNewVehicle} onViewRecord={handleViewRecord} />;
    }
  };

  // ── Root render ────────────────────────────────────────────────
  return (
    <div className="app-root">
      {/* onSettings removed — settings is sidebar-only now */}
      <AppNavbar onLogoClick={() => goTo('dashboard')} onNewVehicle={startNewVehicle} />
      <div className="app-body">
        {/* Pass currentUser and onLogout so Sidebar can show user info and admin-only items */}
        <Sidebar
          page={page}
          onNav={goTo}
          onNewVehicle={startNewVehicle}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className="app-content">{renderPage()}</main>
      </div>
      <Footer onNav={goTo} />
    </div>
  );
}

export default App;