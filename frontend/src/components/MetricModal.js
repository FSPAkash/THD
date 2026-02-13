import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './MetricModal.css';

const PANEL_WIDTH = 340;
const PANEL_GAP = 32;
const HEADER_HEIGHT = 80;

function MetricModal({ data, onClose }) {
  const { isBetaMode } = useAuth();
  const isBeta = isBetaMode();
  const [panelStyle, setPanelStyle] = useState({});

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
    isBpsKpi,
    cardRect
  } = data;

  const useBps = isBpsKpi || kpiKey === 'cvr';

  const isPositive = (val) => val > 0;
  const isNegative = (val) => val < 0;

  // Card clone visual helpers
  const cardIsPositive = postLift > 0;
  const cardIsNegative = postLift < 0;

  const radius = 90;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const maxLift = isBpsKpi ? 100 : 50;
  const normalizedLift = Math.min(Math.abs(postLift || 0), maxLift);
  const strokeDashoffset = circumference - (normalizedLift / maxLift) * circumference;

  const formatCardLift = (value) => {
    if (value === null || value === undefined || isNaN(value)) return isBpsKpi ? '0 bps' : '0%';
    if (isBpsKpi) return `${Math.abs(value).toFixed(0)} bps`;
    return `${Math.abs(value).toFixed(1)}%`;
  };

  const formatCardChange = () => {
    if (postTY === null || postLY === null || isNaN(postTY) || isNaN(postLY)) return '-';
    const change = postTY - postLY;
    const prefix = change >= 0 ? '+' : '';
    if (format === 'currency') {
      if (Math.abs(change) >= 1000000) return `${prefix}$${(change / 1000000).toFixed(1)}M`;
      if (Math.abs(change) >= 1000) return `${prefix}$${(change / 1000).toFixed(0)}K`;
      return `${prefix}$${change.toFixed(0)}`;
    }
    if (format === 'percentage') {
      if (isBpsKpi) return `${prefix}${(change * 10000).toFixed(0)} bps`;
      return `${prefix}${change.toFixed(2)}pp`;
    }
    if (Math.abs(change) >= 1000000) return `${prefix}${(change / 1000000).toFixed(1)}M`;
    if (Math.abs(change) >= 1000) return `${prefix}${(change / 1000).toFixed(0)}K`;
    return `${prefix}${Math.round(change).toLocaleString()}`;
  };

  const getCardArrow = () => {
    if (cardIsPositive) return '\u2191';
    if (cardIsNegative) return '\u2193';
    return '\u2013';
  };

  // Calculate panel position
  const calculatePanelPosition = useCallback(() => {
    if (!cardRect) return {};

    const cardCenterY = cardRect.top + cardRect.height / 2;
    const availableHeight = window.innerHeight - HEADER_HEIGHT;
    const panelHeight = Math.min(460, availableHeight - 48);

    // Try right side first
    let left = cardRect.right + PANEL_GAP;
    if (left + PANEL_WIDTH > window.innerWidth - 24) {
      // Fall back to left side
      left = cardRect.left - PANEL_WIDTH - PANEL_GAP;
    }
    // If still overflows, center it
    if (left < 24) {
      left = Math.max(24, (window.innerWidth - PANEL_WIDTH) / 2);
    }

    // Vertically center on the card, but clamp within viewport
    let top = cardCenterY - panelHeight / 2;
    top = Math.max(HEADER_HEIGHT + 16, Math.min(top, window.innerHeight - panelHeight - 16));

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${PANEL_WIDTH}px`,
      maxHeight: `${panelHeight}px`
    };
  }, [cardRect]);

  useEffect(() => {
    setPanelStyle(calculatePanelPosition());
  }, [calculatePanelPosition]);

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
      if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
      if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
      return `$${value.toFixed(2)}`;
    }
    if (format === 'percentage') return `${(value * 100).toFixed(2)}%`;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const formatLift = (value) => {
    if (isBeta) return '---';
    if (value === null || value === undefined || isNaN(value)) {
      return useBps ? '0 bps' : '0%';
    }
    if (useBps) return `${Math.abs(value).toFixed(0)} bps`;
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
    if (isPositive(value)) return '\u2191';
    if (isNegative(value)) return '\u2193';
    return '\u2013';
  };

  const liftColor = cardIsPositive ? 'var(--positive)' : cardIsNegative ? 'var(--negative)' : 'var(--neutral)';

  return (
    <>
      {/* Blur overlay - covers everything below header */}
      <div className="metric-modal-overlay" onClick={onClose} />

      {/* Card clone at original position */}
      {cardRect && (
        <div
          className="metric-modal-card-clone"
          style={{
            position: 'fixed',
            top: `${cardRect.top}px`,
            left: `${cardRect.left}px`,
            width: `${cardRect.width}px`,
            height: `${cardRect.height}px`
          }}
        >
          <div className="clone-circle">
            <svg className="clone-progress-ring" width={radius * 2} height={radius * 2}>
              <circle
                cx={radius}
                cy={radius}
                r={normalizedRadius}
                strokeWidth={strokeWidth}
                fill="none"
                stroke="rgba(0, 0, 0, 0.04)"
              />
              <circle
                cx={radius}
                cy={radius}
                r={normalizedRadius}
                strokeWidth={strokeWidth}
                fill="none"
                stroke={liftColor}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            </svg>
            <div className="clone-content">
              <span className="clone-label">{label}</span>
              <div className="clone-main">
                <span className="clone-arrow" style={{ color: liftColor }}>{getCardArrow()}</span>
                <span className="clone-percent" style={{ color: liftColor }}>{formatCardLift(postLift)}</span>
              </div>
              <span className="clone-change" style={{ color: liftColor }}>{formatCardChange()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info panel */}
      <div className="metric-modal-panel" style={panelStyle}>
        <div className="modal-header">
          <h2>{label}</h2>
          {useBps && !isBeta && <span className="modal-unit-badge">BPS</span>}
          {isBeta && <span className="modal-beta-badge">BETA</span>}
          <button className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    </>
  );
}

export default MetricModal;
