import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './QueryInfoModal.css';

function QueryInfoModal({ useCase, onClose }) {
  const [stakeholders, setStakeholders] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [customEmail, setCustomEmail] = useState('');
  const [requestText, setRequestText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [outlookStatus, setOutlookStatus] = useState(null);
  const [checkingOutlook, setCheckingOutlook] = useState(true);

  useEffect(() => {
    fetchStakeholders();
    checkOutlookStatus();
  }, [useCase]);

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

  const checkOutlookStatus = async () => {
    setCheckingOutlook(true);
    try {
      const response = await api.get('/api/email/current-user');
      setOutlookStatus(response.data);
    } catch (err) {
      console.error('Error checking Outlook status:', err);
      setOutlookStatus({
        success: false,
        message: 'Unable to connect to email service'
      });
    } finally {
      setCheckingOutlook(false);
    }
  };

  const fetchStakeholders = async () => {
    try {
      const response = await api.get('/api/stakeholders', {
        params: { use_case: useCase }
      });
      const emails = response.data.stakeholders || [];
      setStakeholders(emails);
      setSelectedRecipients(emails);
    } catch (err) {
      console.error('Error fetching stakeholders:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (email) => {
    setSelectedRecipients(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const isValidEmail = (email) => {
    return email && email.includes('@') && email.includes('.');
  };

  const addCustomEmail = () => {
    const email = customEmail.trim().toLowerCase();
    if (isValidEmail(email) && !selectedRecipients.includes(email)) {
      setSelectedRecipients(prev => [...prev, email]);
      setCustomEmail('');
      setError(null);
    } else if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
    }
  };

  const removeRecipient = (email) => {
    setSelectedRecipients(prev => prev.filter(e => e !== email));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomEmail();
    }
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      setError('Please add at least one recipient');
      return;
    }
    if (!requestText.trim()) {
      setError('Please describe the requested changes');
      return;
    }
    if (!outlookStatus?.success) {
      setError(outlookStatus?.message || 'Outlook is not ready');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await api.post('/api/report/send', {
        use_case: useCase,
        recipients: selectedRecipients,
        subject_override: `[Query Edit Request] ${useCase}`,
        body_override: requestText
      });

      if (response.data.success) {
        setSent(true);
      } else {
        setError(response.data.error || 'Failed to send request');
      }
    } catch (err) {
      console.error('Send error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to send request';
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleRetryOutlook = () => {
    setError(null);
    checkOutlookStatus();
  };

  const outlookReady = outlookStatus?.success === true;

  if (sent) {
    return (
      <div className="modal-backdrop" onClick={handleBackdropClick}>
        <div className="send-modal query-edit-modal success-state">
          <div className="success-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2>Request Sent</h2>
          <p>Your query edit request has been sent to {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}.</p>
          <div className="sent-recipients">
            {selectedRecipients.map(email => (
              <span key={email} className="sent-email">{email}</span>
            ))}
          </div>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="send-modal query-edit-modal">
        <div className="modal-header">
          <div className="header-content">
            <h2>Request Query Edit</h2>
            <p className="header-subtitle">{useCase}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {checkingOutlook ? (
            <div className="outlook-status-checking">
              <div className="loading-spinner-small"></div>
              <span>Checking Outlook status...</span>
            </div>
          ) : outlookReady ? (
            <div className="outlook-user-info outlook-ready">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Sending from: <strong>{outlookStatus.email}</strong></span>
            </div>
          ) : (
            <div className="outlook-user-info outlook-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div className="outlook-error-content">
                <span>{outlookStatus?.message || 'Unable to connect to Outlook'}</span>
                <button className="retry-btn" onClick={handleRetryOutlook}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  Retry
                </button>
              </div>
            </div>
          )}

          <div className="request-changes-section">
            <label className="section-label">Requested Changes</label>
            <textarea
              className="request-textarea"
              placeholder="Describe the changes you'd like made to the query..."
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              rows={5}
            />
          </div>

          <div className="recipients-section">
            <label className="section-label">Recipients</label>

            {loading ? (
              <div className="loading-recipients">
                <div className="loading-spinner-small"></div>
                Loading stakeholders...
              </div>
            ) : (
              <>
                {stakeholders.length > 0 && (
                  <div className="stakeholders-list">
                    <span className="list-label">Stakeholders from config:</span>
                    {stakeholders.map(email => (
                      <label key={email} className="recipient-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(email)}
                          onChange={() => toggleRecipient(email)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="recipient-email">{email}</span>
                      </label>
                    ))}
                  </div>
                )}

                {stakeholders.length === 0 && (
                  <div className="no-stakeholders">
                    No stakeholders configured. Add recipients below.
                  </div>
                )}

                <div className="add-recipient">
                  <input
                    type="email"
                    placeholder="Add email address"
                    value={customEmail}
                    onChange={(e) => {
                      setCustomEmail(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    className="add-btn"
                    onClick={addCustomEmail}
                    disabled={!customEmail.trim()}
                  >
                    Add
                  </button>
                </div>

                {selectedRecipients.length > 0 && (
                  <div className="selected-recipients">
                    <span className="list-label">Will send to ({selectedRecipients.length}):</span>
                    <div className="recipient-tags">
                      {selectedRecipients.map(email => (
                        <span key={email} className="recipient-tag">
                          {email}
                          <button onClick={() => removeRecipient(email)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSend}
            disabled={sending || selectedRecipients.length === 0 || !requestText.trim() || !outlookReady}
          >
            {sending ? (
              <>
                <span className="spinner"></span>
                Sending...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Send Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QueryInfoModal;
