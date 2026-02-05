import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import FilterBar from './FilterBar';
import MetricCard from './MetricCard';
import MetricModal from './MetricModal';
import SendReportModal from './SendReportModal';
import KPIChart from './KPIChart';
import AdvancedAnalysis from './AdvancedAnalysis';
import DataUpload from './DataUpload';
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
  const [chartType, setChartType] = useState('area');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hasData, setHasData] = useState(false);
  const [launchDate, setLaunchDate] = useState(null);
  const [totalPostDays, setTotalPostDays] = useState(0);
  const [actualPeriodDays, setActualPeriodDays] = useState(0);
  const [modalData, setModalData] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [chartTags, setChartTags] = useState([]);
  const [chartDisplayMode, setChartDisplayMode] = useState('both'); // 'both', 'ty', 'ly'
  const [eventData, setEventData] = useState([]);

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

  useEffect(() => {
    if (hasData && selectedUseCase) {
      fetchDailyData();
      fetchComparisonData();
    }
  }, [selectedKPI, fetchDailyData, fetchComparisonData, hasData, selectedUseCase]);

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
              <div className="chart-display-toggle">
                <button
                  className={`display-toggle-btn ${chartDisplayMode === 'both' ? 'active' : ''}`}
                  onClick={() => setChartDisplayMode('both')}
                  title="Show both TY and LY"
                >
                  Both
                </button>
                <button
                  className={`display-toggle-btn ${chartDisplayMode === 'ty' ? 'active' : ''}`}
                  onClick={() => setChartDisplayMode('ty')}
                  title="Show This Year only"
                >
                  TY
                </button>
                <button
                  className={`display-toggle-btn ${chartDisplayMode === 'ly' ? 'active' : ''}`}
                  onClick={() => setChartDisplayMode('ly')}
                  title="Show Last Year only"
                >
                  LY
                </button>
              </div>
              <div className="chart-type-selector">
                <button
                  className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
                  onClick={() => setChartType('line')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </button>
                <button
                  className={`chart-type-btn ${chartType === 'area' ? 'active' : ''}`}
                  onClick={() => setChartType('area')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18"></path>
                    <path d="M3 18l6-6 4 4 8-8v10H3z" fill="currentColor" opacity="0.2"></path>
                  </svg>
                </button>
                <button
                  className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
                  onClick={() => setChartType('bar')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="12" width="4" height="8"></rect>
                    <rect x="10" y="8" width="4" height="12"></rect>
                    <rect x="16" y="4" width="4" height="16"></rect>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="chart-container">
            <KPIChart
              data={dailyData}
              kpi={selectedKPI}
              chartType={chartType}
              format={kpiConfig[selectedKPI].format}
              launchDate={launchDate}
              comparisonData={comparisonData}
              chartTags={chartTags}
              onTagsChange={setChartTags}
              displayMode={chartDisplayMode}
              events={eventData}
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
        />
      )}

      <main className="dashboard-content">
        {renderContent()}
      </main>

      {modalData && (
        <MetricModal data={modalData} onClose={handleCloseModal} />
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
    </div>
  );
}

export default Dashboard;