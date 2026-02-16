import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './Header';
import FilterBar from './FilterBar';
import MetricCard from './MetricCard';
import MetricModal from './MetricModal';
import SendReportModal from './SendReportModal';
import QueryInfoModal from './QueryInfoModal';
import KPIChart from './KPIChart';
import AdvancedAnalysis from './AdvancedAnalysis';
import DataUpload from './DataUpload';
import FeedbackButton from './FeedbackButton';
import api from '../utils/api';
import './Dashboard.css';

function Dashboard() {
  const [activeView, setActiveView] = useState('overview');
  const [analysisData, setAnalysisData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [useCases, setUseCases] = useState([]);
  const [useCaseConfigs, setUseCaseConfigs] = useState([]);
  const [selectedUseCase, setSelectedUseCase] = useState('');
  const [selectedKPI, setSelectedKPI] = useState('visits');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasData, setHasData] = useState(false);
  const [launchDate, setLaunchDate] = useState(null);
  const [totalPostDays, setTotalPostDays] = useState(0);
  const [actualPeriodDays, setActualPeriodDays] = useState(0);
  const [modalData, setModalData] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showQueryEditModal, setShowQueryEditModal] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [chartTags, setChartTags] = useState([]);
  const [chartDisplayMode, setChartDisplayMode] = useState('both'); // 'both', 'ty', 'ly'
  const [showSuggestedEvents, setShowSuggestedEvents] = useState(false);
  const [eventData, setEventData] = useState([]);
  const [showTagsResetConfirm, setShowTagsResetConfirm] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [anomalyData, setAnomalyData] = useState([]);
  const [showAnomalyInfo, setShowAnomalyInfo] = useState(false);
  const [anomalyInfoFlip, setAnomalyInfoFlip] = useState(false);
  const anomalyInfoTimer = useRef(null);
  const anomalyBtnRef = useRef(null);

  // Segment filter states
  const [businessSegment, setBusinessSegment] = useState('All');
  const [deviceType, setDeviceType] = useState('All');
  const [pageType, setPageType] = useState('All');
  const [pageTypes, setPageTypes] = useState(['All']);

  const primaryKPIs = ['visits', 'orders', 'revenue'];
  const derivedKPIs = ['cvr', 'aov', 'rpv'];

  const kpiConfig = {
    visits: { label: 'Visits', shortLabel: 'Visits', format: 'number', liftFormat: 'percentage' },
    orders: { label: 'Orders', shortLabel: 'Orders', format: 'number', liftFormat: 'percentage' },
    revenue: { label: 'Revenue', shortLabel: 'Revenue', format: 'currency', liftFormat: 'percentage' },
    cvr: { label: 'Conversion Rate', shortLabel: 'CVR', format: 'percentage', liftFormat: 'bps' },
    aov: { label: 'Avg Order Value', shortLabel: 'AOV', format: 'currency', liftFormat: 'percentage' },
    rpv: { label: 'Revenue Per Visit', shortLabel: 'RPV', format: 'currency', liftFormat: 'percentage' }
  };

  const fetchDataStatus = useCallback(async () => {
    try {
      const response = await api.get('/api/data/status');
      setHasData(response.data.has_data);
      setLastUpdated(response.data.last_updated);
      setUseCaseConfigs(response.data.configs || []);

      if (response.data.use_cases?.length > 0) {
        setUseCases(response.data.use_cases);
        if (!selectedUseCase) {
          setSelectedUseCase(response.data.use_cases[0]);
          const config = response.data.configs?.find(c => c.use_case === response.data.use_cases[0]);
          if (config) setLaunchDate(config.launch_date);
        }
      }

      // Fetch page types for dropdown
      if (response.data.has_data) {
        try {
          const pageTypesRes = await api.get('/api/segments/page-types');
          setPageTypes(pageTypesRes.data.page_types || ['All']);
        } catch (e) {
          console.error('Error fetching page types:', e);
        }
      }
    } catch (err) {
      console.error('Error fetching data status:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedUseCase]);

  const fetchAnalysisData = useCallback(async () => {
    if (!hasData || !selectedUseCase) return;
    try {
      const params = {
        use_case: selectedUseCase,
        period: selectedPeriod,
        business_segment: businessSegment !== 'All' ? businessSegment : undefined,
        device_type: deviceType !== 'All' ? deviceType : undefined,
        page_type: pageType !== 'All' ? pageType : undefined
      };
      const response = await api.get('/api/kpi/analysis', { params });
      setAnalysisData(response.data.analysis || []);
      if (response.data.analysis?.length > 0) {
        setLaunchDate(response.data.analysis[0].launch_date);
        setTotalPostDays(response.data.analysis[0].total_post_days || 0);
        setActualPeriodDays(response.data.analysis[0].period_days || 0);
      }
    } catch (err) {
      console.error('Error fetching analysis:', err);
    }
  }, [hasData, selectedUseCase, selectedPeriod, businessSegment, deviceType, pageType]);

  const fetchDailyData = useCallback(async () => {
    if (!hasData || !selectedUseCase) return;
    try {
      const params = {
        kpi: selectedKPI,
        use_case: selectedUseCase,
        period: selectedPeriod,
        business_segment: businessSegment !== 'All' ? businessSegment : undefined,
        device_type: deviceType !== 'All' ? deviceType : undefined,
        page_type: pageType !== 'All' ? pageType : undefined
      };
      const response = await api.get('/api/kpi/daily', { params });
      setDailyData(response.data.data || []);
    } catch (err) {
      console.error('Error fetching daily data:', err);
    }
  }, [hasData, selectedUseCase, selectedKPI, selectedPeriod, businessSegment, deviceType, pageType]);

  const fetchComparisonData = useCallback(async () => {
    if (!hasData || !selectedUseCase) return;
    try {
      const params = {
        kpi: selectedKPI,
        use_case: selectedUseCase,
        period: selectedPeriod,
        business_segment: businessSegment !== 'All' ? businessSegment : undefined,
        device_type: deviceType !== 'All' ? deviceType : undefined,
        page_type: pageType !== 'All' ? pageType : undefined
      };
      const response = await api.get('/api/kpi/comparison', { params });
      setComparisonData(response.data.data || []);
    } catch (err) {
      console.error('Error fetching comparison data:', err);
      setComparisonData([]);
    }
  }, [hasData, selectedUseCase, selectedKPI, selectedPeriod, businessSegment, deviceType, pageType]);

  useEffect(() => {
    fetchDataStatus();
    // Fetch event tracker data once on mount
    api.get('/api/events')
      .then(res => setEventData(res.data.events || []))
      .catch(err => console.error('Error fetching events:', err));
  }, [fetchDataStatus]);

  useEffect(() => {
    if (hasData && selectedUseCase) {
      fetchAnalysisData();
      fetchDailyData();
    }
  }, [hasData, selectedUseCase, selectedPeriod, businessSegment, deviceType, pageType, fetchAnalysisData, fetchDailyData]);

  const fetchAnomalyData = useCallback(async () => {
    if (!hasData || !selectedUseCase) return;
    try {
      const params = {
        kpi: selectedKPI,
        use_case: selectedUseCase,
        period: selectedPeriod,
        business_segment: businessSegment !== 'All' ? businessSegment : undefined,
        device_type: deviceType !== 'All' ? deviceType : undefined,
        page_type: pageType !== 'All' ? pageType : undefined
      };
      const response = await api.get('/api/anomalies', { params });
      setAnomalyData(response.data.anomalies || []);
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setAnomalyData([]);
    }
  }, [hasData, selectedUseCase, selectedKPI, selectedPeriod, businessSegment, deviceType, pageType]);

  useEffect(() => {
    if (hasData && selectedUseCase) {
      fetchDailyData();
      fetchComparisonData();
      fetchAnomalyData();
    }
  }, [selectedKPI, fetchDailyData, fetchComparisonData, fetchAnomalyData, hasData, selectedUseCase]);

  const getMetricData = (kpi) => {
    const metric = analysisData.find(d => d.kpi === kpi.toUpperCase());
    if (!metric) {
      return { 
        postLift: 0, 
        postTY: 0, 
        postLY: 0, 
        preLift: 0, 
        preTY: 0, 
        preLY: 0, 
        compLift: 0 
      };
    }
    return {
      postLift: metric.post_lift,
      postTY: metric.post_ty,
      postLY: metric.post_ly,
      preLift: metric.pre_lift,
      preTY: metric.pre_ty,
      preLY: metric.pre_ly,
      compLift: metric.pre_post_comp_lift
    };
  };

  const getPeriodLabel = () => {
    if (!launchDate) return '';
    if (selectedPeriod === 'all') return `${totalPostDays} days post-launch`;
    const periodDays = parseInt(selectedPeriod);
    if (actualPeriodDays < periodDays) return `${actualPeriodDays} of ${periodDays} days`;
    return `${periodDays} days post-launch`;
  };

  const getCardPeriodLabel = () => {
    return `${actualPeriodDays} day${actualPeriodDays !== 1 ? 's' : ''} analyzed`;
  };

  const handleDataUploaded = () => {
    setHasData(true);
    fetchDataStatus();
    // Switch to overview after successful upload
    setActiveView('overview');
  };

  const handleUseCaseChange = (useCase) => {
    setSelectedUseCase(useCase);
    const config = useCaseConfigs.find(c => c.use_case === useCase);
    if (config) setLaunchDate(config.launch_date);
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  const handleKPISelect = (kpi) => {
    setSelectedKPI(kpi);
  };

  const handleExpandMetric = (data) => {
    setModalData(data);
  };

  const handleCloseModal = () => {
    setModalData(null);
  };

  const handleOpenSendModal = () => {
    setShowSendModal(true);
  };

  const handleCloseSendModal = () => {
    setShowSendModal(false);
  };

  const handleResetFilters = () => {
    setSelectedPeriod('all');
    setBusinessSegment('All');
    setDeviceType('All');
    setPageType('All');
  };

  const renderMetricCard = (kpi) => {
    const data = getMetricData(kpi);
    return (
      <MetricCard
        key={kpi}
        kpiKey={kpi}
        label={kpiConfig[kpi].shortLabel}
        postLift={data.postLift}
        postTY={data.postTY}
        postLY={data.postLY}
        preLift={data.preLift}
        preTY={data.preTY}
        preLY={data.preLY}
        compLift={data.compLift}
        format={kpiConfig[kpi].format}
        periodLabel={getCardPeriodLabel()}
        isSelected={selectedKPI === kpi}
        onSelect={handleKPISelect}
        onExpand={handleExpandMetric}
      />
    );
  };

  // Render the main content based on activeView
  const renderContent = () => {
    // Always show DataUpload when activeView is 'upload'
    if (activeView === 'upload') {
      return <DataUpload onDataUploaded={handleDataUploaded} />;
    }

    // Show empty state if no data
    if (!hasData) {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <h2>No Data Available</h2>
          <p>Upload data using Developer Mode to view analytics</p>
        </div>
      );
    }

    // Show Analysis view
    if (activeView === 'analysis') {
      return (
        <AdvancedAnalysis 
          analysisData={analysisData} 
          useCases={useCases}
          selectedUseCase={selectedUseCase}
          onUseCaseChange={handleUseCaseChange}
          selectedPeriod={selectedPeriod}
          periodLabel={getPeriodLabel()}
          launchDate={launchDate}
        />
      );
    }

    // Default: Overview
    return (
      <>
        <section className="metrics-section">
          <div className="section-header">
            <h2>{selectedUseCase}</h2>
            {launchDate && <span className="period-badge">{getPeriodLabel()}</span>}
          </div>
          
          <div className="metrics-container">
            <div className="metrics-row">
              <span className="row-label">Primary</span>
              <div className="metrics-row-cards">
                {primaryKPIs.map(kpi => renderMetricCard(kpi))}
              </div>
            </div>
            
            <div className="metrics-row">
              <span className="row-label">Derived</span>
              <div className="metrics-row-cards">
                {derivedKPIs.map(kpi => renderMetricCard(kpi))}
              </div>
            </div>
          </div>
        </section>

        <section className="chart-section">
          <div className="chart-header">
            <div className="chart-title">
              <h2>{kpiConfig[selectedKPI].label}</h2>
            </div>
            <div className="chart-controls">
              <button
                className={`suggested-events-btn ${showSuggestedEvents ? 'active' : ''}`}
                onClick={() => setShowSuggestedEvents(!showSuggestedEvents)}
              >
                <svg className="suggested-events-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Suggested Events
                <span className="suggested-events-tooltip">
                  Auto-detected events from your data that may impact KPI trends
                </span>
              </button>
              <button
                ref={anomalyBtnRef}
                className={`suggested-events-btn anomaly-btn ${showAnomalies ? 'active' : ''}`}
                onClick={() => setShowAnomalies(!showAnomalies)}
              >
                <svg className="suggested-events-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Anomalies
                {(() => {
                  const visible = anomalyData.filter(a => !a.explained && (chartDisplayMode === 'both' || a.series === chartDisplayMode));
                  return visible.length > 0 ? <span className="anomaly-count">{visible.length}</span> : null;
                })()}
                <span
                  className="anomaly-info-btn"
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    clearTimeout(anomalyInfoTimer.current);
                    if (anomalyBtnRef.current) {
                      const rect = anomalyBtnRef.current.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom - 20;
                      setAnomalyInfoFlip(spaceBelow < 400);
                    }
                    setShowAnomalyInfo(true);
                  }}
                  onMouseLeave={() => {
                    anomalyInfoTimer.current = setTimeout(() => setShowAnomalyInfo(false), 200);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  i
                </span>
                <span className="suggested-events-tooltip">
                  Statistically significant spikes or drops detected in the data
                </span>
                {showAnomalyInfo && (
                  <div
                    className={`anomaly-info-modal ${anomalyInfoFlip ? 'flip-above' : ''}`}
                    onMouseEnter={() => clearTimeout(anomalyInfoTimer.current)}
                    onMouseLeave={() => {
                      anomalyInfoTimer.current = setTimeout(() => setShowAnomalyInfo(false), 200);
                    }}
                  >
                    <div className="anomaly-info-header">
                      <span className="anomaly-info-title">Anomaly Detection</span>
                    </div>
                    <div className="anomaly-info-body">
                      <div className="anomaly-info-section">
                        <h4>How it works</h4>
                        <p>
                          Each data point is compared against its <strong>trailing 7-day rolling average</strong>.
                          A <strong>Z-score</strong> measures how many standard deviations the current value is from that average.
                          Points with |Z| &ge; 2.0 are flagged as anomalies.
                        </p>
                      </div>
                      <div className="anomaly-info-section">
                        <h4>The math</h4>
                        <div className="anomaly-info-formula">
                          <code>Z = (x - &mu;) / &sigma;</code>
                        </div>
                        <p className="anomaly-info-legend">
                          <span><strong>x</strong> = today's value</span>
                          <span><strong>&mu;</strong> = 7-day rolling mean</span>
                          <span><strong>&sigma;</strong> = 7-day rolling std dev</span>
                        </p>
                      </div>
                      <div className="anomaly-info-section">
                        <h4>Example</h4>
                        <div className="anomaly-info-example">
                          <div className="anomaly-info-example-row">
                            <span className="anomaly-info-example-label">Last 7 days</span>
                            <span className="anomaly-info-example-value">1200, 1180, 1210, 1195, 1220, 1190, 1205</span>
                          </div>
                          <div className="anomaly-info-example-row">
                            <span className="anomaly-info-example-label">Mean (&mu;)</span>
                            <span className="anomaly-info-example-value">1,200</span>
                          </div>
                          <div className="anomaly-info-example-row">
                            <span className="anomaly-info-example-label">Std Dev (&sigma;)</span>
                            <span className="anomaly-info-example-value">13.1</span>
                          </div>
                          <div className="anomaly-info-example-row highlight-spike">
                            <span className="anomaly-info-example-label">Today (x)</span>
                            <span className="anomaly-info-example-value">1,248</span>
                          </div>
                          <div className="anomaly-info-example-row highlight-spike">
                            <span className="anomaly-info-example-label">Z-score</span>
                            <span className="anomaly-info-example-value">(1248 - 1200) / 13.1 = <strong>3.66</strong></span>
                          </div>
                          <div className="anomaly-info-example-verdict spike">Spike detected (Z &ge; 2.0)</div>
                        </div>
                      </div>
                      <div className="anomaly-info-section">
                        <h4>Additional context</h4>
                        <ul>
                          <li>TY and LY series are analyzed independently</li>
                          <li>Anomalies overlapping T1 events are marked as <strong>explained behavior</strong> instead</li>
                          <li>Spikes (Z &gt; 0) appear in red, drops (Z &lt; 0) in blue</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </button>
              <div className="chart-display-toggle">
                <button
                  className={`display-toggle-btn ${chartDisplayMode === 'both' ? 'active' : ''}`}
                  onClick={() => setChartDisplayMode('both')}
                >
                  Both
                  <span className="display-toggle-tooltip">Show both TY and LY</span>
                </button>
                <button
                  className={`display-toggle-btn ${chartDisplayMode === 'ty' ? 'active' : ''}`}
                  onClick={() => setChartDisplayMode('ty')}
                >
                  TY
                  <span className="display-toggle-tooltip">Show This Year only</span>
                </button>
                <button
                  className={`display-toggle-btn ${chartDisplayMode === 'ly' ? 'active' : ''}`}
                  onClick={() => setChartDisplayMode('ly')}
                >
                  LY
                  <span className="display-toggle-tooltip">Show Last Year only</span>
                </button>
              </div>
              {chartTags && chartTags.length > 0 && (
                <div className="chart-tags-reset-wrapper">
                  <button
                    className="chart-tags-reset-btn"
                    onClick={() => setShowTagsResetConfirm(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    <span className="chart-tags-reset-tooltip">Reset all event tags</span>
                  </button>
                  {showTagsResetConfirm && (
                    <div className="chart-tags-reset-confirm">
                      <p>Clear all event tags?</p>
                      <div className="confirm-buttons">
                        <button
                          className="confirm-yes"
                          onClick={() => {
                            setChartTags([]);
                            setShowSuggestedEvents(false);
                            setShowTagsResetConfirm(false);
                          }}
                        >
                          Yes
                        </button>
                        <button
                          className="confirm-no"
                          onClick={() => setShowTagsResetConfirm(false)}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="chart-container">
            <KPIChart
              data={dailyData}
              kpi={selectedKPI}
              chartType="area"
              format={kpiConfig[selectedKPI].format}
              launchDate={launchDate}
              comparisonData={comparisonData}
              chartTags={chartTags}
              onTagsChange={setChartTags}
              displayMode={chartDisplayMode}
              events={eventData}
              showSuggestedEvents={showSuggestedEvents}
              anomalies={anomalyData}
              showAnomalies={showAnomalies}
            />
          </div>
        </section>
      </>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        hasData={hasData}
        onSendReport={handleOpenSendModal}
        selectedUseCase={selectedUseCase}
        periodLabel={getPeriodLabel()}
        businessSegment={businessSegment}
        deviceType={deviceType}
        pageType={pageType}
      />

      {hasData && activeView !== 'upload' && (
        <FilterBar
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
          selectedUseCase={selectedUseCase}
          useCases={useCases}
          onUseCaseChange={handleUseCaseChange}
          businessSegment={businessSegment}
          onBusinessSegmentChange={setBusinessSegment}
          deviceType={deviceType}
          onDeviceTypeChange={setDeviceType}
          pageType={pageType}
          onPageTypeChange={setPageType}
          pageTypes={pageTypes}
          onReset={handleResetFilters}
          onRequestQueryEdit={() => setShowQueryEditModal(true)}
        />
      )}

      <main className="dashboard-content">
        {renderContent()}
      </main>

      {modalData && (
        <MetricModal data={modalData} onClose={handleCloseModal} />
      )}

      {showQueryEditModal && (
        <QueryInfoModal
          useCase={selectedUseCase}
          onClose={() => setShowQueryEditModal(false)}
        />
      )}

      {showSendModal && (
        <SendReportModal
          useCase={selectedUseCase}
          period={selectedPeriod}
          periodLabel={getPeriodLabel()}
          onClose={handleCloseSendModal}
          businessSegment={businessSegment}
          deviceType={deviceType}
          pageType={pageType}
          chartTags={chartTags}
          selectedKPI={selectedKPI}
        />
      )}

      <FeedbackButton useCase={selectedUseCase} />

    </div>
  );
}

export default Dashboard;