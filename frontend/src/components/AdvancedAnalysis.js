import React from 'react';
import { useAuth } from '../context/AuthContext';
import './AdvancedAnalysis.css';

function AdvancedAnalysis({ 
  analysisData, 
  useCases, 
  selectedUseCase, 
  onUseCaseChange,
  selectedPeriod,
  periodLabel,
  launchDate
}) {
  const { isBetaMode } = useAuth();
  const isBeta = isBetaMode();
  
  const formatValue = (value, kpi) => {
    if (isBeta) return '---';
    if (value === null || value === undefined || isNaN(value)) return '-';
    
    const numValue = Number(value);
    
    if (kpi === 'REVENUE') {
      if (Math.abs(numValue) >= 1000000) {
        return `$${(numValue / 1000000).toFixed(2)}M`;
      }
      if (Math.abs(numValue) >= 1000) {
        return `$${(numValue / 1000).toFixed(1)}K`;
      }
      return `$${numValue.toFixed(0)}`;
    }
    if (kpi === 'AOV' || kpi === 'RPV') {
      return `$${numValue.toFixed(2)}`;
    }
    if (kpi === 'CVR') {
      return `${(numValue * 100).toFixed(2)}%`;
    }
    if (Math.abs(numValue) >= 1000000) {
      return `${(numValue / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(numValue) >= 1000) {
      return `${(numValue / 1000).toFixed(1)}K`;
    }
    return numValue.toLocaleString();
  };

  const formatLift = (value, kpi) => {
    if (isBeta) {
      return { text: '---', className: '' };
    }
    if (value === null || value === undefined || isNaN(value)) {
      return { text: '-', className: '' };
    }
    
    const numValue = Number(value);
    const arrow = numValue > 0 ? '↑' : numValue < 0 ? '↓' : '–';
    const className = numValue > 0 ? 'positive' : numValue < 0 ? 'negative' : '';
    
    if (kpi === 'CVR') {
      return {
        text: `${arrow} ${Math.abs(numValue).toFixed(0)} bps`,
        className
      };
    }
    
    return {
      text: `${arrow} ${Math.abs(numValue).toFixed(2)}%`,
      className
    };
  };

  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <div className="header-title">
          <h1>Advanced Analysis</h1>
          <p>Pre - launch VS Post - launch comparison</p>
        </div>
        {isBeta && <span className="analysis-beta-badge">BETA</span>}
      </div>

      {launchDate && (
        <div className="analysis-meta">
          <div className="meta-item">
            <span className="meta-label">Usecase</span>
            <span className="meta-value">{selectedUseCase}</span>
          </div>
          <div className="meta-divider"></div>
          <div className="meta-item">
            <span className="meta-label">Launch Date</span>
            <span className="meta-value">
              {new Date(launchDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
          <div className="meta-divider"></div>
          <div className="meta-item">
            <span className="meta-label">Analysis Period</span>
            <span className="meta-value">{periodLabel}</span>
          </div>
        </div>
      )}



      {analysisData.length > 0 ? (
        <div className="analysis-table-wrapper">
          <div className="table-scroll">
            <table className={`analysis-table ${isBeta ? 'beta-mode' : ''}`}>
              <thead>
                <tr>
                  <th className="sticky-col">KPI</th>
                  <th>{isBeta ? 'Pre LY ' : 'Pre LY'}</th>
                  <th>{isBeta ? 'Pre TY ' : 'Pre TY'}</th>
                  <th>Pre Lift</th>
                  <th>{isBeta ? 'Post LY ' : 'Post LY'}</th>
                  <th>{isBeta ? 'Post TY ' : 'Post TY'}</th>
                  <th>Post Lift</th>
                  <th className="highlight-col">Comp Lift</th>
                </tr>
              </thead>
              <tbody>
                {analysisData.map((row, index) => {
                  const preLift = formatLift(row.pre_lift, row.kpi);
                  const postLift = formatLift(row.post_lift, row.kpi);
                  const compLift = formatLift(row.pre_post_comp_lift, row.kpi);
                  
                  return (
                    <tr key={`${row.kpi}-${index}`}>
                      <td className="sticky-col kpi-name">{row.kpi}</td>
                      <td className={isBeta ? 'beta-cell' : ''}>{formatValue(row.pre_ly, row.kpi)}</td>
                      <td className={isBeta ? 'beta-cell' : ''}>{formatValue(row.pre_ty, row.kpi)}</td>
                      <td className={`${preLift.className} ${isBeta ? 'beta-cell' : ''}`}>{preLift.text}</td>
                      <td className={isBeta ? 'beta-cell' : ''}>{formatValue(row.post_ly, row.kpi)}</td>
                      <td className={isBeta ? 'beta-cell' : ''}>{formatValue(row.post_ty, row.kpi)}</td>
                      <td className={`${postLift.className} ${isBeta ? 'beta-cell' : ''}`}>{postLift.text}</td>
                      <td className={`highlight-col ${compLift.className} ${isBeta ? 'beta-cell' : ''}`}>
                        <span className="comp-badge">{compLift.text}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-analysis">
          <p>No analysis data available for the selected period</p>
        </div>
      )}

      <div className="analysis-legend">
        <h3>Definitions</h3>
        <div className="legend-grid">
          <div className="legend-item">
            <span className="legend-term">Pre Period</span>
            <span className="legend-def">Same duration before launch date</span>
          </div>
          <div className="legend-item">
            <span className="legend-term">Post Period</span>
            <span className="legend-def">Selected period from launch date</span>
          </div>
          <div className="legend-item">
            <span className="legend-term">LY / TY</span>
            <span className="legend-def">Last Year / This Year</span>
          </div>
          <div className="legend-item">
            <span className="legend-term">Lift</span>
            <span className="legend-def">(TY - LY) / LY as percentage</span>
          </div>
          <div className="legend-item">
            <span className="legend-term">Comp Lift</span>
            <span className="legend-def">Post Lift minus Pre Lift</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedAnalysis;