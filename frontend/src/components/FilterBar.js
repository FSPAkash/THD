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
  onReset
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
    </div>
  );
}

export default FilterBar;