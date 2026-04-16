import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import ProfitBarChart from './ProfitBarChart';
import JobTimeline    from './JobTimeline';

/**
 * Renders the ML-generated pathway table and associated charts.
 * Allows users to expand rows to read the explanation for the ranking.
 */
const PathwayPanel = ({ pathway }) => {
  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = seq => setExpandedRows(prev => ({ ...prev, [seq]: !prev[seq] }));

  return (
    <>
      <div className="alert alert-info" style={{ marginBottom: '0.875rem' }}>
        <div className="alert-flex">
          <svg className="alert-icon" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          <p>Click any row to see <strong>why</strong> the model ranked that step there.</p>
        </div>
      </div>
      <div className="table-container" style={{ marginBottom: '1rem' }}>
        <table className="data-table">
          <thead className="table-header-dark">
            <tr>
              <th className="table-header sticky-header">Seq</th>
              <th className="table-header sticky-header">Action</th>
              <th className="table-header sticky-header text-right">Profit ($)</th>
              <th className="table-header sticky-header" style={{ width: '2.5rem' }}></th>
            </tr>
          </thead>
          <tbody>
            {pathway.map(step => (
              <React.Fragment key={step.sequence}>
                <tr className="table-row pathway-main-row" onClick={() => toggleRow(step.sequence)} style={{ cursor: 'pointer' }}>
                  <td className="table-cell pathway-seq">#{step.sequence}</td>
                  <td className="table-cell">{step.action}</td>
                  <td className={`table-cell text-right ${step.projected_profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                    {step.projected_profit >= 0 ? '+' : ''}{step.projected_profit.toFixed(2)}
                  </td>
                  <td className="table-cell text-right">
                    {expandedRows[step.sequence] ? <ChevronUpIcon style={{ width: '1rem', height: '1rem', color: '#6b7280', 
                      display: 'inline' }} /> : <ChevronDownIcon style={{ width: '1rem', height: '1rem', color: '#6b7280', 
                      display: 'inline' }} />}
                  </td>
                </tr>
                {expandedRows[step.sequence] && step.explanation && (
                  <tr className="explanation-row">
                    <td colSpan={4} className="explanation-cell">
                      <div className="explanation-content">
                        <span className="explanation-label">Why this rank?</span>
                        <p className="explanation-text">{step.explanation}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="results-charts-row">
        <div className="results-chart-card">
          <p className="results-chart-title">Profit per step ($ after labour)</p>
          <ProfitBarChart pathway={pathway} />
        </div>
        <div className="results-chart-card">
          <p className="results-chart-title">Job timeline - bar width = time on job</p>
          <JobTimeline pathway={pathway} />
        </div>
      </div>
    </>
  );
};

export default PathwayPanel;