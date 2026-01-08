import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './MetricModal.css';

function MetricModal({ data, onClose }) {
  const { isBetaMode } = useAuth();
  const isBeta = isBetaMode();
  
  const {
    label,
    kpiKey,
    postLift,
    postTY,
    postLY,
    preLift,
    preTY,
    preLY,
    compLift,
    format,
    isBpsKpi
  } = data;

  const useBps = isBpsKpi || kpiKey === 'cvr';

  const isPositive = (val) => val > 0;
  const isNegative = (val) => val < 0;

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const formatValue = (value) => {
    if (isBeta) return '---';
    if (value === null || value === undefined || isNaN(value)) return '-';
    
    if (format === 'currency') {
      if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
      }
      if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
      }
      return `$${value.toFixed(2)}`;
    }
    if (format === 'percentage') {
      return `${(value * 100).toFixed(2)}%`;
    }
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const formatLift = (value) => {
    if (isBeta) return '---';
    if (value === null || value === undefined || isNaN(value)) {
      return useBps ? '0 bps' : '0%';
    }
    
    if (useBps) {
      return `${Math.abs(value).toFixed(0)} bps`;
    }
    
    return `${Math.abs(value).toFixed(2)}%`;
  };

  const getLiftClass = (value) => {
    if (isBeta) return '';
    if (isPositive(value)) return 'positive';
    if (isNegative(value)) return 'negative';
    return '';
  };

  const getArrow = (value) => {
    if (isBeta) return '--';
    if (isPositive(value)) return '↑';
    if (isNegative(value)) return '↓';
    return '–';
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2>{label}</h2>
          {useBps && !isBeta && <span className="modal-unit-badge">BPS</span>}
          {isBeta && <span className="modal-beta-badge">BETA</span>}
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="period-section">
            <div className="period-header">
              <h3>Post-Launch</h3>
              <span className={`period-lift ${getLiftClass(postLift)}`}>
                <span className="lift-arrow">{getArrow(postLift)}</span>
                <span className="lift-value">{formatLift(postLift)}</span>
              </span>
            </div>
            <div className="period-data">
              <div className="data-item">
                <span className="data-label">{isBeta ? `Placeholder for TY ${label}` : 'This Year'}</span>
                <span className={`data-value ${isBeta ? 'beta-placeholder' : ''}`}>{formatValue(postTY)}</span>
              </div>
              <div className="data-item">
                <span className="data-label">{isBeta ? `Placeholder for LY ${label}` : 'Last Year'}</span>
                <span className={`data-value muted ${isBeta ? 'beta-placeholder' : ''}`}>{formatValue(postLY)}</span>
              </div>
            </div>
          </div>

          <div className="period-section">
            <div className="period-header">
              <h3>Pre-Launch</h3>
              <span className={`period-lift ${getLiftClass(preLift)}`}>
                <span className="lift-arrow">{getArrow(preLift)}</span>
                <span className="lift-value">{formatLift(preLift)}</span>
              </span>
            </div>
            <div className="period-data">
              <div className="data-item">
                <span className="data-label">{isBeta ? `Placeholder for TY ${label}` : 'This Year'}</span>
                <span className={`data-value ${isBeta ? 'beta-placeholder' : ''}`}>{formatValue(preTY)}</span>
              </div>
              <div className="data-item">
                <span className="data-label">{isBeta ? `Placeholder for LY ${label}` : 'Last Year'}</span>
                <span className={`data-value muted ${isBeta ? 'beta-placeholder' : ''}`}>{formatValue(preLY)}</span>
              </div>
            </div>
          </div>

          <div className="comp-section">
            <div className="comp-header">
              <h3>Incremental Impact</h3>
            </div>
            <div className={`comp-result ${getLiftClass(compLift)}`}>
              <span className="comp-arrow">{getArrow(compLift)}</span>
              <span className="comp-value">{formatLift(compLift)}</span>
            </div>
            <p className="comp-explanation">
              {isBeta 
                ? 'Detailed metrics will be available in the full release.'
                : 'Difference between Post Lift and Pre Lift, measuring the change attributable to the launch.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetricModal;