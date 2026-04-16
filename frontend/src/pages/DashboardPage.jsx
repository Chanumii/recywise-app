import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, getLocalDateStr } from '../constants';

//daily activity summary with date navigation.

const DashboardPage = ({ onNewVehicle, onViewRecord }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());

  // Fetch all historical records on component mount
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/vehicle_history`)
      .then(r => setRecords(r.data))
      .catch(e => console.warn('Dashboard history fetch failed:', e))
      .finally(() => setLoading(false));
  }, []);

  // Compute metrics for the selected date
  const dateRecords = records.filter(r => r.timestamp.startsWith(selectedDate));
  const totalProfit = dateRecords.reduce((s, r) => s + r.total_profit, 0);
  const avgProfit = dateRecords.length > 0 ? totalProfit / dateRecords.length : 0;
  const recentRecords = records.slice(0, 8);
  const isToday = selectedDate === getLocalDateStr();

  const formatDateTime = ts => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page-content">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {isToday && <span className="today-badge">Today</span>}
          </p>
        </div>
        <div className="date-picker-wrapper">
          <label className="date-picker-label">View date</label>
          <input type="date" value={selectedDate} max={getLocalDateStr()} onChange={e => setSelectedDate(e.target.value)} className="dashboard-date-picker" />
        </div>
      </div>
      <div className="dashboard-kpi-row">
        <div className="dashboard-kpi-card dashboard-kpi-blue">
          <div className="dashboard-kpi-label">Vehicles processed</div>
          <div className="dashboard-kpi-value" style={{ color: '#1d4ed8' }}>{loading ? '—' : dateRecords.length}</div>
          <div className="dashboard-kpi-sub">{isToday ? 'today so far' : 'on this date'}</div>
        </div>
        <div className="dashboard-kpi-card dashboard-kpi-green">
          <div className="dashboard-kpi-label">Total profit</div>
          <div className="dashboard-kpi-value" style={{ color: '#059669' }}>{loading ? '—' : `$${totalProfit.toFixed(0)}`}</div>
          <div className="dashboard-kpi-sub">estimated after labour</div>
        </div>
        <div className="dashboard-kpi-card dashboard-kpi-slate">
          <div className="dashboard-kpi-label">Average per vehicle</div>
          <div className="dashboard-kpi-value" style={{ color: '#374151' }}>{loading ? '—' : (dateRecords.length > 0 ? `$${avgProfit.toFixed(0)}` : '—')}</div>
          <div className="dashboard-kpi-sub">profit per vehicle</div>
        </div>
        <div className="dashboard-kpi-card dashboard-kpi-slate">
          <div className="dashboard-kpi-label">All-time records</div>
          <div className="dashboard-kpi-value" style={{ color: '#374151' }}>{loading ? '—' : records.length}</div>
          <div className="dashboard-kpi-sub">total vehicles processed</div>
        </div>
      </div>
      <div className="dashboard-action-row">
        <button onClick={onNewVehicle} className="btn btn-primary dashboard-new-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 16, height: 16, marginRight: 7 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Process New Vehicle
        </button>
      </div>
      <div className="dashboard-section">
        <h2 className="dashboard-section-title">Recent Activity</h2>
        {loading ? <p className="dashboard-empty">Loading records...</p> : recentRecords.length === 0 ? (
          <div className="dashboard-empty-state">
            <p className="dashboard-empty">No vehicles processed yet.</p>
            <p className="dashboard-empty-sub">Click "Process New Vehicle" above to get started.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="table-header">Vehicle</th><th className="table-header">Date &amp; Time</th><th className="table-header text-right">Profit</th><th className="table-header text-right">Time</th><th className="table-header"></th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map(r => (
                  <tr key={r.id} className="table-row dashboard-record-row" onClick={() => onViewRecord(r.id)} style={{ cursor: 'pointer' }}>
                    <td className="table-cell"><span className="record-vehicle">{r.year} {r.make} {r.model}</span>{r.vin && <span className="record-vin">{r.vin}</span>}</td>
                    <td className="table-cell record-date">{formatDateTime(r.timestamp)}</td>
                    <td className={`table-cell text-right ${r.total_profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>{r.total_profit >= 0 ? '+' : ''}${r.total_profit.toFixed(0)}</td>
                    <td className="table-cell text-right record-time">{(r.total_time_mins / 60).toFixed(1)}h</td>
                    <td className="table-cell text-right"><span className="record-view-link">View →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;