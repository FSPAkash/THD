import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './MetricCard.css';

function MetricCard({ 
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
  periodLabel,
  isSelected,
  onSelect,
  onExpand
}) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const { isBetaMode } = useAuth();
  
  const isBeta = isBetaMode();
  const isPositive = postLift > 0;
  const isNegative = postLift < 0;
  
  // Check if this KPI uses BPS for lift display
  const isBpsKpi = kpiKey === 'cvr';
  
  // Derived KPIs that should show placeholder in Beta mode
  const isDerivedKpi = ['cvr', 'aov', 'rpv'].includes(kpiKey);
  const showBetaPlaceholder = isBeta && isDerivedKpi;

  const formatValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    
    if (format === 'currency') {
      if (Math.abs(value) >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      }
      if (Math.abs(value) >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      }
      return `$${value.toFixed(0)}`;
    }
    if (format === 'percentage') {
      return `${(value * 100).toFixed(2)}%`;
    }
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return Math.round(value).toLocaleString();
  };

  const formatLift = (value) => {
    if (value === null || value === undefined || isNaN(value)) return isBpsKpi ? '0 bps' : '0%';
    
    if (isBpsKpi) {
      return `${Math.abs(value).toFixed(0)} bps`;
    }
    
    return `${Math.abs(value).toFixed(1)}%`;
  };

  const formatChange = () => {
    if (postTY === null || postLY === null || isNaN(postTY) || isNaN(postLY)) return '-';
    
    const change = postTY - postLY;
    const prefix = change >= 0 ? '+' : '';
    
    if (format === 'currency') {
      if (Math.abs(change) >= 1000000) {
        return `${prefix}$${(change / 1000000).toFixed(1)}M`;
      }
      if (Math.abs(change) >= 1000) {
        return `${prefix}$${(change / 1000).toFixed(0)}K`;
      }
      return `${prefix}$${change.toFixed(0)}`;
    }
    if (format === 'percentage') {
      if (isBpsKpi) {
        const bpsChange = change * 10000;
        return `${prefix}${bpsChange.toFixed(0)} bps`;
      }
      return `${prefix}${change.toFixed(2)}pp`;
    }
    if (Math.abs(change) >= 1000000) {
      return `${prefix}${(change / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(change) >= 1000) {
      return `${prefix}${(change / 1000).toFixed(0)}K`;
    }
    return `${prefix}${Math.round(change).toLocaleString()}`;
  };

  const getArrow = () => {
    if (isPositive) return '↑';
    if (isNegative) return '↓';
    return '–';
  };

  const radius = 90;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  
  const maxLift = isBpsKpi ? 100 : 50;
  const normalizedLift = Math.min(Math.abs(postLift || 0), maxLift);
  const strokeDashoffset = circumference - (normalizedLift / maxLift) * circumference;

  const handleCardClick = () => {
    if (showBetaPlaceholder) return;
    if (onSelect) onSelect(kpiKey);
  };

  const handleInfoClick = (e) => {
    e.stopPropagation();
    if (showBetaPlaceholder) return;
    if (onExpand) {
      const cardRect = cardRef.current?.getBoundingClientRect();
      onExpand({
        label, kpiKey, postLift, postTY, postLY,
        preLift, preTY, preLY, compLift, format,
        isBpsKpi,
        cardRect: cardRect ? { top: cardRect.top, left: cardRect.left, width: cardRect.width, height: cardRect.height, right: cardRect.right, bottom: cardRect.bottom } : null
      });
    }
  };

  // Beta placeholder for derived KPIs
  if (showBetaPlaceholder) {
    return (
      <div className="metric-card beta-placeholder">
        <div className="card-circle beta-circle">
          <div className="beta-placeholder-content">

            <span className="beta-placeholder-label">{label}</span>
            <span className="beta-placeholder-text">Placeholder</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`metric-card ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-circle">
        <svg className="progress-ring" width={radius * 2} height={radius * 2}>
          <circle
            className="progress-bg"
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="progress-bar"
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        <div className={`card-content ${isHovered ? 'hidden' : ''}`}>
          <span className="card-label">{label}</span>
          <div className="metric-main">
            <span className={`metric-arrow ${isPositive ? 'up' : ''} ${isNegative ? 'down' : ''}`}>
              {getArrow()}
            </span>
            <span className="metric-percent">{formatLift(postLift)}</span>
          </div>
          <span className="metric-change">{formatChange()}</span>
        </div>

        <div className={`card-hover-content ${isHovered ? 'visible' : ''}`}>
          <div className="hover-row">
            <span className="hover-label">TY</span>
            <span className="hover-value">{formatValue(postTY)}</span>
          </div>
          <div className="hover-row">
            <span className="hover-label">LY</span>
            <span className="hover-value">{formatValue(postLY)}</span>
          </div>
          <div className="hover-period">{periodLabel}</div>
        </div>

        <button className="info-button" onClick={handleInfoClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default MetricCard;