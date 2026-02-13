import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import './FeedbackButton.css';

const FEEDBACK_TOPICS = [
  { id: 'metrics', label: 'Metric Cards', description: 'KPI values, lift calculations, formatting' },
  { id: 'chart', label: 'Chart & Trends', description: 'Daily chart, event tags, display modes' },
  { id: 'filters', label: 'Filters & Controls', description: 'Period, segments, device, page type' },
  { id: 'analysis', label: 'Advanced Analysis', description: 'Pre/post comparison table' },
  { id: 'reports', label: 'Reports & Email', description: 'PDF reports, email sending' },
  { id: 'general', label: 'General', description: 'Overall experience, bugs, suggestions' },
];

// Mini visual previews for each topic
function TopicPreview({ topicId }) {
  switch (topicId) {
    case 'metrics':
      return (
        <div className="topic-preview">
          <div className="preview-label">Metric Cards</div>
          <div className="preview-metrics">
            {[
              { name: 'VISITS', lift: '19.4%', change: '+2.4M', pct: 75 },
              { name: 'ORDERS', lift: '14.8%', change: '+40K', pct: 60 },
              { name: 'REVENUE', lift: '13.6%', change: '+$41.9M', pct: 55 },
            ].map((m) => (
              <div key={m.name} className="preview-metric-circle-card">
                <div className="preview-circle-ring">
                  <svg viewBox="0 0 44 44" className="preview-circle-svg">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="3" />
                    <circle cx="22" cy="22" r="18" fill="none" stroke="#34C759" strokeWidth="3"
                      strokeDasharray={`${m.pct * 1.13} 113`}
                      strokeLinecap="round"
                      transform="rotate(-90 22 22)" />
                  </svg>
                  <div className="preview-circle-inner">
                    <span className="preview-circle-kpi">{m.name}</span>
                    <span className="preview-circle-lift">{m.lift}</span>
                    <span className="preview-circle-change">{m.change}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'chart':
      return (
        <div className="topic-preview">
          <div className="preview-label">Daily KPI Chart</div>
          <div className="preview-chart">
            <div className="preview-chart-header">
              <span className="preview-chart-title">Revenue</span>
              <div className="preview-chart-legend">
                <span className="preview-legend-dot ty" /> TY
                <span className="preview-legend-dot ly" /> LY
              </div>
            </div>
            <div className="preview-chart-area">
              <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="preview-chart-svg">
                <polyline points="0,40 25,35 50,30 75,25 100,28 125,20 150,22 175,15 200,18" fill="none" stroke="rgba(238,113,37,0.8)" strokeWidth="2" />
                <polyline points="0,45 25,42 50,38 75,40 100,36 125,33 150,35 175,30 200,32" fill="none" stroke="rgba(238,113,37,0.3)" strokeWidth="1.5" strokeDasharray="4,3" />
                <line x1="100" y1="0" x2="100" y2="60" stroke="rgba(238,113,37,0.4)" strokeWidth="1" strokeDasharray="3,3" />
              </svg>
              <div className="preview-chart-tag" style={{ left: '48%' }}>Launch</div>
            </div>
          </div>
        </div>
      );
    case 'filters':
      return (
        <div className="topic-preview">
          <div className="preview-label">Filter Controls</div>
          <div className="preview-filters-v2">
            <div className="preview-filter-col">
              <span className="preview-filter-heading">PERIOD</span>
              <div className="preview-toggle-group-v2">
                <span className="preview-toggle-v2">7D</span>
                <span className="preview-toggle-v2">30D</span>
                <span className="preview-toggle-v2">60D</span>
                <span className="preview-toggle-v2">90D</span>
                <span className="preview-toggle-v2 active">All</span>
              </div>
            </div>
            <div className="preview-filter-col">
              <span className="preview-filter-heading">BUSINESS</span>
              <div className="preview-toggle-group-v2">
                <span className="preview-toggle-v2 active">All</span>
                <span className="preview-toggle-v2">B2B</span>
                <span className="preview-toggle-v2">B2C</span>
              </div>
            </div>
            <div className="preview-filter-col">
              <span className="preview-filter-heading">DEVICE</span>
              <div className="preview-toggle-group-v2">
                <span className="preview-toggle-v2 active">All</span>
                <span className="preview-toggle-v2">MW</span>
                <span className="preview-toggle-v2">DTW</span>
                <span className="preview-toggle-v2">App</span>
              </div>
            </div>
          </div>
        </div>
      );
    case 'analysis':
      return (
        <div className="topic-preview">
          <div className="preview-label">Pre/Post Comparison</div>
          <div className="preview-table">
            <div className="preview-table-header">
              <span className="preview-th kpi">KPI</span>
              <span className="preview-th">Pre Lift</span>
              <span className="preview-th">Post Lift</span>
              <span className="preview-th highlight">Comp</span>
            </div>
            <div className="preview-table-row">
              <span className="preview-td kpi">Visits</span>
              <span className="preview-td green">+2.1%</span>
              <span className="preview-td green">+4.8%</span>
              <span className="preview-td highlight green">+2.7%</span>
            </div>
            <div className="preview-table-row">
              <span className="preview-td kpi">Orders</span>
              <span className="preview-td red">-0.5%</span>
              <span className="preview-td green">+1.2%</span>
              <span className="preview-td highlight green">+1.7%</span>
            </div>
            <div className="preview-table-row">
              <span className="preview-td kpi">Revenue</span>
              <span className="preview-td green">+3.4%</span>
              <span className="preview-td green">+6.1%</span>
              <span className="preview-td highlight green">+2.7%</span>
            </div>
          </div>
        </div>
      );
    case 'reports':
      return (
        <div className="topic-preview">
          <div className="preview-label">Report & Email</div>
          <div className="preview-report">
            <div className="preview-report-modal">
              <div className="preview-report-header">
                <div className="preview-report-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(238,113,37,0.8)" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </div>
                <span>Send Report</span>
              </div>
              <div className="preview-report-recipients">
                <div className="preview-recipient-chip">stakeholder@thd.com</div>
                <div className="preview-recipient-chip">team@thd.com</div>
              </div>
              <div className="preview-report-btn">Send via Outlook</div>
            </div>
          </div>
        </div>
      );
    case 'general':
      return (
        <div className="topic-preview">
          <div className="preview-label">Full Dashboard</div>
          <div className="preview-dashboard">
            <div className="preview-dash-header">
              <div className="preview-dash-logo" />
              <div className="preview-dash-nav">
                <span className="preview-dash-tab active" />
                <span className="preview-dash-tab" />
              </div>
            </div>
            <div className="preview-dash-filters">
              <span className="preview-dash-pill" />
              <span className="preview-dash-pill active" />
              <span className="preview-dash-pill" />
              <span className="preview-dash-pill" />
            </div>
            <div className="preview-dash-cards">
              <span className="preview-dash-card" />
              <span className="preview-dash-card" />
              <span className="preview-dash-card" />
            </div>
            <div className="preview-dash-chart-area" />
          </div>
        </div>
      );
    default:
      return null;
  }
}

function FeedbackButton({ useCase }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [previewTopic, setPreviewTopic] = useState(null);
  const [previewPos, setPreviewPos] = useState(null);
  const popupRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isOpen &&
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        handleClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Lock body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    // Reset after animation
    setTimeout(() => {
      setSelectedTopic(null);
      setFeedbackText('');
      setRating(null);
      setSent(false);
      setError(null);
    }, 200);
  };

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setError(null);
  };

  const handleBack = () => {
    setSelectedTopic(null);
    setFeedbackText('');
    setRating(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      setError('Please enter your feedback');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await api.post('/api/feedback', {
        topic: selectedTopic.id,
        topic_label: selectedTopic.label,
        feedback: feedbackText.trim(),
        rating: rating,
        use_case: useCase || 'N/A',
      });

      if (response.data.success) {
        setSent(true);
      } else {
        setError(response.data.error || 'Failed to save feedback');
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
      setError(err.response?.data?.error || 'Failed to save feedback');
    } finally {
      setSending(false);
    }
  };

  const renderContent = () => {
    if (sent) {
      return (
        <div className="feedback-success">
          <div className="feedback-success-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3>Thank you</h3>
          <p>Your feedback has been recorded.</p>
          <button className="feedback-done-btn" onClick={handleClose}>Done</button>
        </div>
      );
    }

    if (selectedTopic) {
      return (
        <div className="feedback-form">
          <div className="feedback-form-header">
            <button className="feedback-back-btn" onClick={handleBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="feedback-form-title">
              <span className="feedback-topic-tag">{selectedTopic.label}</span>
            </div>
          </div>

          <div className="feedback-rating-section">
            <span className="feedback-rating-label">How would you rate this area?</span>
            <div className="feedback-rating-options">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  className={`feedback-rating-btn ${rating === val ? 'active' : ''}`}
                  onClick={() => setRating(val)}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="feedback-rating-labels">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>

          <textarea
            className="feedback-textarea"
            placeholder="Share your thoughts, suggestions, or issues..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={4}
            autoFocus
          />

          {error && (
            <div className="feedback-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            className="feedback-submit-btn"
            onClick={handleSubmit}
            disabled={sending || !feedbackText.trim()}
          >
            {sending ? (
              <>
                <span className="feedback-spinner"></span>
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="feedback-topics">
        <div className="feedback-popup-header">
          <h3>Share Feedback</h3>
          <p>Select an area of the dashboard</p>
        </div>
        <div className="feedback-topic-grid">
          {FEEDBACK_TOPICS.map((topic) => (
            <button
              key={topic.id}
              className="feedback-topic-card"
              onClick={() => handleTopicSelect(topic)}
            >
              <span className="feedback-topic-label">{topic.label}</span>
              <span className="feedback-topic-desc">{topic.description}</span>
              <div
                className="feedback-topic-info-wrapper"
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPreviewPos({ left: rect.right + 12, centerY: rect.top + rect.height / 2 });
                  setPreviewTopic(topic.id);
                }}
                onMouseLeave={() => { setPreviewTopic(null); setPreviewPos(null); }}
              >
                <span
                  className="feedback-topic-info-btn"
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (previewTopic === topic.id) {
                      setPreviewTopic(null);
                      setPreviewPos(null);
                    } else {
                      const rect = e.currentTarget.parentElement.getBoundingClientRect();
                      setPreviewPos({ left: rect.right + 12, centerY: rect.top + rect.height / 2 });
                      setPreviewTopic(topic.id);
                    }
                  }}
                >
                  i
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        className={`feedback-floating-btn ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      {isOpen && (
        <div ref={popupRef} className="feedback-popup">
          {renderContent()}
        </div>
      )}

      {previewTopic && previewPos && (
        <div
          className="feedback-preview-tooltip"
          style={{
            position: 'fixed',
            left: previewPos.left,
            top: Math.max(12, Math.min(previewPos.centerY, window.innerHeight - 12)),
            transform: 'translateY(-50%)',
          }}
        >
          <TopicPreview topicId={previewTopic} />
        </div>
      )}
    </>
  );
}

export default FeedbackButton;
