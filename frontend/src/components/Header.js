import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

function Header({ 
  activeView, 
  setActiveView, 
  useCases, 
  selectedUseCase, 
  onUseCaseChange,
  selectedPeriod,
  onPeriodChange,
  periodOptions,
  lastUpdated,
  hasData,
  onSendReport
}) {
  const { user, logout, isDevMode, isBetaMode, canSendReport } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'analysis', label: 'Analysis' }
  ];

  // Only show Upload for dev/admin, not for beta
  if (isDevMode()) {
    navItems.push({ id: 'upload', label: 'Upload' });
  }

  const handleNavClick = (itemId) => {
    setActiveView(itemId);
  };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <div className="header-brand">
            <div className="brand-mark">
              <img src="/THD.png" alt="THD Logo" />
            </div>
          </div>

          <nav className="header-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`nav-btn ${activeView === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Beta Badge */}
          {isBetaMode() && (
            <span className="beta-badge">BETA</span>
          )}
        </div>

        <div className="header-right">
          {hasData && activeView !== 'upload' && (
            <>
              <div className="period-selector">
                {periodOptions.map(option => (
                  <button
                    key={option.value}
                    className={`period-btn ${selectedPeriod === option.value ? 'active' : ''}`}
                    onClick={() => onPeriodChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {useCases.length > 0 && (
                <div className="use-case-selector">
                  <select 
                    value={selectedUseCase} 
                    onChange={(e) => onUseCaseChange(e.target.value)}
                  >
                    {useCases.map(uc => (
                      <option key={uc} value={uc}>{uc}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Only show Send Report for non-beta users */}
              {onSendReport && canSendReport() && !isBetaMode() && (
                <button className="send-report-btn" onClick={onSendReport}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  <span>Send Report</span>
                </button>
              )}
            </>
          )}

          <div className="user-menu">
            <div className="user-avatar">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <button className="logout-btn" onClick={logout} title="Sign out">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;