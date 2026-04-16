import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../constants';

//searchable list of all vehicle records.
//search filters across VIN, make, model, and year.

const HistoryPage = ({ onViewRecord }) => {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/vehicle_history`)
      .then(r => setRecords(r.data))
      .catch(e => console.warn('Vehicle history fetch failed:', e))
      .finally(() => setLoading(false));
  }, []);

  // Client-side filtering across multiple relevant fields
  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return r.make.toLowerCase().includes(q) || r.model.toLowerCase().includes(q) || (r.vin || '').toLowerCase().includes(q) || r.year.toString().includes(q);
  });

  const formatDate = ts => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="page-content">
      <div className="page-header history-header-row">
        <div>
          <h1 className="page-title">Vehicle History</h1>
          <p className="page-subtitle">{records.length} vehicles processed in total</p>
        </div>
        <input type="text" placeholder="Search by VIN, make, model or year…" value={search} onChange={e => setSearch(e.target.value)} className="history-search" />
      </div>
      {loading ? <p className="dashboard-empty">Loading records…</p> : filtered.length === 0 ? (
        <div className="dashboard-empty-state"><p className="dashboard-empty">{search ? 'No records match your search.' : 'No vehicles processed yet.'}</p></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="table-header">Date</th><th className="table-header">VIN</th><th className="table-header">Vehicle</th><th className="table-header text-right">Profit</th><th className="table-header text-right">Job Time</th><th className="table-header text-right">Approx. weight</th><th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="table-row dashboard-record-row" onClick={() => onViewRecord(r.id)} style={{ cursor: 'pointer' }}>
                  <td className="table-cell record-date">{formatDate(r.timestamp)}</td>
                  <td className="table-cell"><span className="record-vin-large">{r.vin || '—'}</span></td>
                  <td className="table-cell record-vehicle">{r.year} {r.make} {r.model}</td>
                  <td className={`table-cell text-right ${r.total_profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>{r.total_profit >= 0 ? '+' : ''}${r.total_profit.toFixed(0)}</td>
                  <td className="table-cell text-right record-time">{(r.total_time_mins / 60).toFixed(1)}h</td>
                  <td className="table-cell text-right record-time">{r.vehicle_weight_lbs ? `${r.vehicle_weight_lbs.toFixed(0)} lbs` : '—'}</td>
                  <td className="table-cell text-right"><span className="record-view-link">View →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
