import React, { useState, useRef, useEffect } from 'react';
import './FilterBar.css';

function CustomSelect({ value, options, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder || value;

  return (
    <div className="custom-select" ref={selectRef}>
      <button
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{selectedLabel}</span>
        <svg
          className={`custom-select-arrow ${isOpen ? 'open' : ''}`}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
        >
          <path
            d="M1 1L5 5L9 1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBar({
  selectedPeriod,
  onPeriodChange,
  selectedUseCase,
  useCases,
  onUseCaseChange,
  businessSegment,
  onBusinessSegmentChange,
  deviceType,
  onDeviceTypeChange,
  pageType,
  onPageTypeChange,
  pageTypes = ['All'],
  onReset,
  onRequestQueryEdit
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showQueryTooltip, setShowQueryTooltip] = useState(false);
  const [queryExpanded, setQueryExpanded] = useState(false);
  const queryTooltipRef = useRef(null);

  const dummySqlQuery = `SELECT
  d.date_key,
  d.use_case,
  SUM(d.visits) AS visits,
  SUM(d.orders) AS orders,
  SUM(d.revenue) AS revenue,
  SAFE_DIVIDE(SUM(d.orders), SUM(d.visits)) AS cvr,
  SAFE_DIVIDE(SUM(d.revenue), SUM(d.orders)) AS aov,
  SAFE_DIVIDE(SUM(d.revenue), SUM(d.visits)) AS rpv
FROM analytics.daily_kpi_summary d
WHERE d.use_case = '${selectedUseCase}'
  AND d.date_key >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY d.date_key, d.use_case
ORDER BY d.date_key DESC;`;

  // Close tooltip when clicking outside (only in non-expanded mode)
  useEffect(() => {
    function handleClickOutside(event) {
      if (!queryExpanded && queryTooltipRef.current && !queryTooltipRef.current.contains(event.target)) {
        setShowQueryTooltip(false);
      }
    }
    if (showQueryTooltip && !queryExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQueryTooltip, queryExpanded]);

  // Lock body scroll when query tooltip is open
  useEffect(() => {
    if (showQueryTooltip) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      if (document.body.style.position === 'fixed') {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [showQueryTooltip]);

  // Check if any filters are non-default (excluding use case)
  const hasActiveFilters = selectedPeriod !== 'all' ||
                           businessSegment !== 'All' ||
                           deviceType !== 'All' ||
                           pageType !== 'All';

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
    setShowResetConfirm(false);
  };
  const periodOptions = [
    { value: '7', label: '7D' },
    { value: '30', label: '30D' },
    { value: '60', label: '60D' },
    { value: '90', label: '90D' },
    { value: 'all', label: 'All' }
  ];

  const businessSegmentOptions = [
    { value: 'All', label: 'All' },
    { value: 'B2B', label: 'B2B' },
    { value: 'B2C', label: 'B2C' }
  ];

  const deviceTypeOptions = [
    { value: 'All', label: 'All' },
    { value: 'MW', label: 'MW' },
    { value: 'DTW', label: 'DTW' },
    { value: 'App', label: 'App' }
  ];

  const useCaseOptions = useCases.map(uc => ({ value: uc, label: uc }));
  const pageTypeOptions = pageTypes.map(pt => ({ value: pt, label: pt }));

  return (
    <div className="filter-bar">
      <div className="filter-bar-content">
        {/* Use Case Selector */}
        <div className="filter-group">
          <label className="filter-label">Use Case</label>
          <div className="filter-select-wrapper">
            <CustomSelect
              value={selectedUseCase}
              options={useCaseOptions}
              onChange={onUseCaseChange}
            />
          </div>
        </div>

        {/* Period Selector */}
        <div className="filter-group">
          <label className="filter-label">Period</label>
          <div className="toggle-group">
            {periodOptions.map(option => (
              <button
                key={option.value}
                className={`toggle-btn ${selectedPeriod === option.value ? 'active' : ''}`}
                onClick={() => onPeriodChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Business Segment Selector */}
        <div className="filter-group">
          <label className="filter-label">Business</label>
          <div className="toggle-group">
            {businessSegmentOptions.map(option => (
              <button
                key={option.value}
                className={`toggle-btn ${businessSegment === option.value ? 'active' : ''}`}
                onClick={() => onBusinessSegmentChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Device Type Selector */}
        <div className="filter-group">
          <label className="filter-label">Device</label>
          <div className="toggle-group">
            {deviceTypeOptions.map(option => (
              <button
                key={option.value}
                className={`toggle-btn ${deviceType === option.value ? 'active' : ''}`}
                onClick={() => onDeviceTypeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Page Type Selector */}
        <div className="filter-group">
          <label className="filter-label">Page Type</label>
          <div className="filter-select-wrapper">
            <CustomSelect
              value={pageType}
              options={pageTypeOptions}
              onChange={onPageTypeChange}
            />
          </div>
        </div>

        {/* Query Info Button */}
        <div className="filter-group query-info-group" ref={queryTooltipRef}>
          <label className="filter-label">Query</label>
          <div className="filter-query-wrapper">
            <button
              className="toggle-btn query-info-btn"
              onClick={() => {
                setShowQueryTooltip(!showQueryTooltip);
                setQueryExpanded(false);
              }}
            >
              i
            </button>
            {showQueryTooltip && !queryExpanded && (
              <div className="query-tooltip">
                <div className="query-tooltip-header">
                  <span className="query-tooltip-title">SQL Query</span>
                </div>
                <pre className="query-tooltip-code">{dummySqlQuery}</pre>
                <div className="query-tooltip-footer">
                  <button
                    className="query-analyze-btn"
                    onClick={() => setQueryExpanded(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <polyline points="9 21 3 21 3 15"></polyline>
                      <line x1="21" y1="3" x2="14" y2="10"></line>
                      <line x1="3" y1="21" x2="10" y2="14"></line>
                    </svg>
                    Analyze Query
                  </button>
                  <button
                    className="query-request-edit-btn"
                    onClick={() => {
                      setShowQueryTooltip(false);
                      setQueryExpanded(false);
                      if (onRequestQueryEdit) onRequestQueryEdit();
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Request Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <div className="filter-group reset-group">
            <label className="filter-label glow">Reset</label>
            <div className="filter-reset-wrapper">
              <button
                className="filter-reset-btn"
                onClick={() => setShowResetConfirm(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span className="filter-reset-tooltip">Reset all filters</span>
              </button>
              {showResetConfirm && (
                <div className="filter-reset-confirm">
                  <p>Reset all filters?</p>
                  <div className="confirm-buttons">
                    <button
                      className="confirm-yes"
                      onClick={handleReset}
                    >
                      Yes
                    </button>
                    <button
                      className="confirm-no"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Query Modal - rendered outside filter-bar-content to avoid flex interference */}
      {showQueryTooltip && queryExpanded && (
        <div className="query-expanded-backdrop" onClick={() => { setQueryExpanded(false); setShowQueryTooltip(false); }}>
          <div className="query-expanded-modal" onClick={(e) => e.stopPropagation()}>
            <div className="query-expanded-header">
              <button
                className="query-back-btn"
                onClick={() => setQueryExpanded(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back
              </button>
              <span className="query-expanded-title">SQL Query</span>
              <button
                className="query-expanded-close"
                onClick={() => { setQueryExpanded(false); setShowQueryTooltip(false); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <pre className="query-expanded-code">{dummySqlQuery}</pre>
            <div className="query-expanded-footer">
              <button
                className="query-request-edit-btn"
                onClick={() => {
                  setShowQueryTooltip(false);
                  setQueryExpanded(false);
                  if (onRequestQueryEdit) onRequestQueryEdit();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Request Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;