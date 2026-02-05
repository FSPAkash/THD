import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import './KPIChart.css';

// Preset event tags - these are for manual tagging of events NOT in the Event Tracker
// Events like Black Friday, Labor Day, etc. come from the Event Tracker automatically
const PRESET_TAGS = [
  { id: 'thanksgiving', name: 'Thanksgiving', color: '#F96302' },
  { id: 'july4th', name: '4th of July', color: '#FF3B30' },
  { id: 'tier1', name: 'Tier 1 Event', color: '#5856D6' },
  { id: 'promo', name: 'Promo', color: '#34C759' },
  { id: 'outage', name: 'Outage/Issue', color: '#FF2D55' }
];

// Chart margins matching Recharts config
const CHART_MARGINS = { top: 20, right: 20, left: 10, bottom: 20 };
const Y_AXIS_WIDTH = 60;
const CHART_HEIGHT = 320;
// Height of the actual plot area (excluding X-axis labels ~30px and Legend ~24px)
const PLOT_AREA_HEIGHT = CHART_HEIGHT - CHART_MARGINS.top - CHART_MARGINS.bottom - 54;

// Convert hex color string to rgba with given alpha
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function KPIChart({ data, kpi, chartType, format, launchDate, comparisonData, chartTags, onTagsChange, displayMode = 'both', events = [] }) {
  const { isBetaMode } = useAuth();
  const isBeta = isBetaMode();
  const chartContainerRef = useRef(null);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [customTagName, setCustomTagName] = useState('');
  const [customTagOwner, setCustomTagOwner] = useState('');
  const [customTagDescription, setCustomTagDescription] = useState('');
  const [draggedTag, setDraggedTag] = useState(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [dragPreview, setDragPreview] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [expandedTagId, setExpandedTagId] = useState(null);
  const [showSuggestedEvents, setShowSuggestedEvents] = useState(false);
  const [dismissedEvents, setDismissedEvents] = useState(() => {
    try {
      const stored = sessionStorage.getItem('dismissedEvents');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [editingEvent, setEditingEvent] = useState(null);

  // Use comparison data if available, otherwise fall back to regular data
  const rawChartData = comparisonData && comparisonData.length > 0 ? comparisonData : data;
  const hasComparison = comparisonData && comparisonData.length > 0;

  // Add displayDate field based on displayMode
  // When showing LY only, use date_ly for X-axis; otherwise use date (TY)
  const chartData = rawChartData?.map(d => ({
    ...d,
    displayDate: displayMode === 'ly' && d.date_ly ? d.date_ly : d.date
  })) || [];

  // Track container width for tag positioning
  useEffect(() => {
    const updateWidth = () => {
      if (chartContainerRef.current) {
        const width = chartContainerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    // Initial update with a slight delay to ensure DOM is ready
    updateWidth();
    const initialTimeout = setTimeout(updateWidth, 100);
    const secondTimeout = setTimeout(updateWidth, 300);

    window.addEventListener('resize', updateWidth);

    // Also observe size changes
    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to avoid layout thrashing
      requestAnimationFrame(() => {
        updateWidth();
      });
    });
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(secondTimeout);
      window.removeEventListener('resize', updateWidth);
      resizeObserver.disconnect();
    };
  }, []);

  // Force width recalculation when chartTags change (ensures tags render properly)
  useEffect(() => {
    if (chartTags && chartTags.length > 0 && chartContainerRef.current) {
      const width = chartContainerRef.current.offsetWidth;
      if (width > 0 && containerWidth !== width) {
        setContainerWidth(width);
      }
    }
  }, [chartTags, containerWidth]);

  const formatValue = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';

    if (format === 'currency') {
      if (Math.abs(val) >= 1000000) {
        return `$${(val / 1000000).toFixed(1)}M`;
      }
      if (Math.abs(val) >= 1000) {
        return `$${(val / 1000).toFixed(0)}K`;
      }
      return `$${val.toFixed(2)}`;
    }
    if (format === 'percentage') {
      return `${(val * 100).toFixed(2)}%`;
    }
    if (Math.abs(val) >= 1000000) {
      return `${(val / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(0)}K`;
    }
    return val.toLocaleString();
  };

  const formatAxisDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get container rect - always fresh to handle dynamic sizing
  const getContainerRect = useCallback(() => {
    if (!chartContainerRef.current) return null;
    return chartContainerRef.current.getBoundingClientRect();
  }, []);

  // Calculate date index from clientX position
  const getDateIndexFromX = useCallback((clientX) => {
    if (!chartData || chartData.length === 0) return -1;
    const rect = getContainerRect();
    if (!rect) return -1;

    const chartAreaLeft = Y_AXIS_WIDTH + CHART_MARGINS.left;
    const chartAreaWidth = rect.width - chartAreaLeft - CHART_MARGINS.right;

    const relativeX = clientX - rect.left - chartAreaLeft;
    const percentage = Math.max(0, Math.min(1, relativeX / chartAreaWidth));

    const dataIndex = Math.round(percentage * (chartData.length - 1));
    return Math.max(0, Math.min(dataIndex, chartData.length - 1));
  }, [chartData, getContainerRect]);

  // Get x position (relative to container) for a data index
  const getXPositionForIndex = useCallback((index) => {
    if (!chartData || chartData.length === 0 || index < 0) return 0;

    // Use containerWidth state for reliable positioning
    const width = containerWidth || (chartContainerRef.current?.offsetWidth || 0);
    if (width === 0) return 0;

    const chartAreaLeft = Y_AXIS_WIDTH + CHART_MARGINS.left;
    const chartAreaWidth = width - chartAreaLeft - CHART_MARGINS.right;

    // Handle single data point
    if (chartData.length === 1) {
      return chartAreaLeft + chartAreaWidth / 2;
    }

    const percentage = index / (chartData.length - 1);
    return chartAreaLeft + (percentage * chartAreaWidth);
  }, [chartData, containerWidth]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Find the data point to access both TY and LY dates
      const dataPoint = chartData?.find(d => d.displayDate === label);

      // Format dates based on what's being shown
      const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // Check if there's a tag for this date
      const dateTag = chartTags?.find(t => t.date === label || t.date === dataPoint?.date);

      return (
        <div className="chart-tooltip">
          {/* Show appropriate date header based on displayMode */}
          {displayMode === 'ly' ? (
            <p className="tooltip-date">{formatDate(dataPoint?.date_ly || label)}</p>
          ) : displayMode === 'both' && dataPoint?.date && dataPoint?.date_ly ? (
            <>
              <p className="tooltip-date">TY: {formatDate(dataPoint.date)}</p>
              <p className="tooltip-date tooltip-date-ly">LY: {formatDate(dataPoint.date_ly)}</p>
            </>
          ) : (
            <p className="tooltip-date">{formatDate(dataPoint?.date || label)}</p>
          )}
          {dateTag && (
            <p className="tooltip-tag">
              <span className="tooltip-tag-marker" style={{ background: dateTag.color }}></span>
              {dateTag.name}
            </p>
          )}
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              <span className="tooltip-label">{entry.name}: </span>
              {formatValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleDragStart = (e, tag) => {
    setDraggedTag(tag);
    e.dataTransfer.effectAllowed = 'copy';
    // Set a transparent drag image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (!draggedTag || !chartData || chartData.length === 0) return;

    const rect = getContainerRect();
    if (!rect) return;

    const dateIndex = getDateIndexFromX(e.clientX);
    const targetDate = chartData[dateIndex]?.date;

    // Calculate position relative to container for display
    const xPosition = getXPositionForIndex(dateIndex);

    if (targetDate && dateIndex >= 0) {
      setDragPreview({
        date: targetDate,
        formattedDate: formatFullDate(targetDate),
        x: xPosition,
        index: dateIndex,
        tag: draggedTag
      });
    }
  };

  const handleDragLeave = (e) => {
    // Only clear preview if we're actually leaving the chart area
    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right ||
          clientY < rect.top || clientY > rect.bottom) {
        setDragPreview(null);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedTag || !chartData || chartData.length === 0) return;

    const dateIndex = getDateIndexFromX(e.clientX);
    const targetDate = chartData[dateIndex]?.date;

    if (targetDate) {
      const newTag = {
        ...draggedTag,
        id: `${draggedTag.id}-${Date.now()}`,
        date: targetDate,
        dateIndex: dateIndex
      };

      if (onTagsChange) {
        onTagsChange([...(chartTags || []), newTag]);
      }
    }

    setDraggedTag(null);
    setDragPreview(null);
  };

  const handleDragEnd = () => {
    setDragPreview(null);
  };

  const handleAddCustomTag = () => {
    if (!customTagName.trim() || !customTagOwner.trim()) return;

    const newTag = {
      id: `custom-${Date.now()}`,
      name: customTagName.trim(),
      owner: customTagOwner.trim(),
      description: customTagDescription.trim() || '',
      color: '#6e6e73',
      isCustom: true
    };

    setDraggedTag(newTag);
    setCustomTagName('');
    setCustomTagOwner('');
    setCustomTagDescription('');
    setShowCustomForm(false);
  };

  const handleTagClick = (tagId) => {
    setExpandedTagId(expandedTagId === tagId ? null : tagId);
  };

  const handleRemoveTag = (tagId) => {
    if (onTagsChange) {
      onTagsChange((chartTags || []).filter(t => t.id !== tagId));
    }
  };

  // Persist dismissedEvents to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem('dismissedEvents', JSON.stringify(dismissedEvents));
    } catch { /* ignore */ }
  }, [dismissedEvents]);

  // Dismiss a suggested event (session-scoped)
  const handleDismissEvent = (eventId) => {
    setDismissedEvents(prev => [...prev, eventId]);
  };

  // Reset all dismissed events
  const handleResetDismissed = () => {
    setDismissedEvents([]);
  };

  // Get list of pinned event IDs from chartTags
  const pinnedEventIds = (chartTags || [])
    .filter(tag => tag.sourceEventId)
    .map(tag => tag.sourceEventId);

  // Year-aware event filtering: returns events adjusted to the visible chart date range
  // Excludes dismissed and pinned events
  const getFilteredEvents = useCallback(() => {
    if (!events || events.length === 0 || !chartData || chartData.length === 0) return [];

    const chartStartDate = chartData[0]?.date;
    const chartEndDate = chartData[chartData.length - 1]?.date;
    if (!chartStartDate || !chartEndDate) return [];

    const chartStart = new Date(chartStartDate + 'T00:00:00');
    const chartEnd = new Date(chartEndDate + 'T00:00:00');

    // Determine year label suffix based on displayMode
    const yearLabel = displayMode === 'ly' ? 'LY' : 'TY';

    return events
      .filter(ev => !dismissedEvents.includes(ev.id))
      .filter(ev => !pinnedEventIds.includes(ev.id)) // Exclude pinned events
      .map(ev => {
        let evStart = new Date(ev.startDate + 'T00:00:00');
        let evEnd = new Date(ev.endDate + 'T00:00:00');

        // When showing LY only, shift event dates back 365 days
        if (displayMode === 'ly') {
          evStart = new Date(evStart.getTime() - 365 * 24 * 60 * 60 * 1000);
          evEnd = new Date(evEnd.getTime() - 365 * 24 * 60 * 60 * 1000);
        }

        return { ...ev, adjustedStart: evStart, adjustedEnd: evEnd, yearLabel };
      })
      .filter(ev => {
        // Keep only events that overlap with the visible chart range
        return ev.adjustedStart <= chartEnd && ev.adjustedEnd >= chartStart;
      });
  }, [events, chartData, displayMode, dismissedEvents, pinnedEventIds]);

  // Convert a date to the nearest data index in chartData
  const getIndexForDate = useCallback((targetDate) => {
    if (!chartData || chartData.length === 0) return -1;
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < chartData.length; i++) {
      const d = new Date(chartData[i].date + 'T00:00:00');
      const diff = Math.abs(d.getTime() - targetDate.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [chartData]);

  // Helper to render a single event span (used for both suggestions and pinned)
  const renderSingleSpan = (ev, isPinned = false) => {
    const currentWidth = containerWidth || (chartContainerRef.current?.offsetWidth || 0);
    if (currentWidth === 0) return null;

    const chartAreaLeft = Y_AXIS_WIDTH + CHART_MARGINS.left;
    const chartAreaWidth = currentWidth - chartAreaLeft - CHART_MARGINS.right;

    // For pinned spans, adjustedStart/End are stored as ISO strings
    const evStart = isPinned ? new Date(ev.adjustedStart) : ev.adjustedStart;
    const evEnd = isPinned ? new Date(ev.adjustedEnd) : ev.adjustedEnd;

    const startIdx = getIndexForDate(evStart);
    const endIdx = getIndexForDate(evEnd);

    // Clamp indices to chart bounds
    const clampedStart = Math.max(0, startIdx);
    const clampedEnd = Math.min(chartData.length - 1, endIdx);

    // Calculate pixel positions
    const startPct = chartData.length === 1 ? 0.5 : clampedStart / (chartData.length - 1);
    const endPct = chartData.length === 1 ? 0.5 : clampedEnd / (chartData.length - 1);

    const leftPx = chartAreaLeft + startPct * chartAreaWidth;
    const rightPx = chartAreaLeft + endPct * chartAreaWidth;
    const widthPx = Math.max(rightPx - leftPx, 4); // minimum 4px width

    const centerPx = leftPx + widthPx / 2;

    // Solid fill with edge borders - cleaner than gradient
    const fillColor = hexToRgba(ev.color, 0.12);
    const borderColor = hexToRgba(ev.color, 0.5);

    return (
      <div
        key={ev.id}
        className={`event-span ${isPinned ? 'pinned' : ''}`}
        style={{
          left: `${leftPx}px`,
          width: `${widthPx}px`,
          background: fillColor,
          borderLeft: `2px solid ${borderColor}`,
          borderRight: `2px solid ${borderColor}`,
        }}
      >
        {/* Pill label at center */}
        <div
          className="event-span-label"
          style={{ left: `${centerPx - leftPx}px`, background: ev.color }}
          onClick={() => !isPinned && setEditingEvent(editingEvent?.id === ev.id ? null : ev)}
        >
          <span className="event-span-label-text">
            {ev.name || ev.label} ({ev.yearLabel})
          </span>
          {isPinned ? (
            <button
              className="event-span-dismiss"
              onClick={(e) => { e.stopPropagation(); handleRemoveTag(ev.id); }}
              title="Remove"
            >
              x
            </button>
          ) : (
            <button
              className="event-span-dismiss"
              onClick={(e) => { e.stopPropagation(); handleDismissEvent(ev.id); }}
              title="Dismiss"
            >
              x
            </button>
          )}
        </div>

        {/* Edit popover - only for suggestions, not pinned */}
        {!isPinned && editingEvent?.id === ev.id && (
          <div className="event-span-edit" style={{ left: `${centerPx - leftPx}px` }}>
            <div className="event-span-edit-header">
              <strong>{ev.label}</strong>
              <button className="event-span-edit-close" onClick={() => setEditingEvent(null)}>x</button>
            </div>
            <p className="event-span-edit-dates">
              {new Date(ev.adjustedStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' - '}
              {new Date(ev.adjustedEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            <p className="event-span-edit-tier">
              {ev.tier ? 'Tier 1 Event' : 'Tracked Event'}
            </p>
            <button
              className="event-span-pin-btn"
              onClick={() => {
                // Pin as a permanent span (not point marker) with full event data
                if (onTagsChange) {
                  onTagsChange([...(chartTags || []), {
                    id: `pinned-${ev.id}-${Date.now()}`,
                    name: ev.label,
                    color: ev.color,
                    // Store the original event ID to track which event was pinned
                    sourceEventId: ev.id,
                    // Store span data for rendering as a span
                    isSpan: true,
                    startDate: ev.startDate,
                    endDate: ev.endDate,
                    adjustedStart: ev.adjustedStart.toISOString(),
                    adjustedEnd: ev.adjustedEnd.toISOString(),
                    yearLabel: ev.yearLabel,
                    tier: ev.tier,
                    source: 'suggested'
                  }]);
                }
                setEditingEvent(null);
              }}
            >
              Pin to chart
            </button>
          </div>
        )}
      </div>
    );
  };

  // Get pinned span tags that overlap with current chart range
  const getPinnedSpans = useCallback(() => {
    if (!chartTags || !chartData || chartData.length === 0) return [];

    const chartStartDate = chartData[0]?.date;
    const chartEndDate = chartData[chartData.length - 1]?.date;
    if (!chartStartDate || !chartEndDate) return [];

    const chartStart = new Date(chartStartDate + 'T00:00:00');
    const chartEnd = new Date(chartEndDate + 'T00:00:00');

    return chartTags
      .filter(tag => tag.isSpan)
      .filter(tag => {
        const tagStart = new Date(tag.adjustedStart);
        const tagEnd = new Date(tag.adjustedEnd);
        return tagStart <= chartEnd && tagEnd >= chartStart;
      });
  }, [chartTags, chartData]);

  // Render gradient event spans behind the chart (both suggestions and pinned)
  const renderEventSpans = () => {
    const currentWidth = containerWidth || (chartContainerRef.current?.offsetWidth || 0);
    if (currentWidth === 0) return null;

    // Get pinned spans (always show)
    const pinnedSpans = getPinnedSpans();

    // Get suggested events (only when toggle is on)
    const suggestedEvents = showSuggestedEvents ? getFilteredEvents() : [];

    // If nothing to render, return null
    if (pinnedSpans.length === 0 && suggestedEvents.length === 0) return null;

    return (
      <>
        {/* Render pinned spans first (always visible) */}
        {pinnedSpans.map(span => renderSingleSpan(span, true))}
        {/* Render suggested events (when toggle is on) */}
        {suggestedEvents.map(ev => renderSingleSpan(ev, false))}
      </>
    );
  };

  const commonProps = {
    data: chartData,
    margin: CHART_MARGINS
  };

  const axisStyle = {
    fontSize: 11,
    fill: '#86868b',
    fontWeight: 500
  };

  // Calculate tick interval for evenly spaced X-axis labels
  // Target ~6-8 ticks for readability, ensuring even spacing
  const calculateTickInterval = () => {
    if (!chartData || chartData.length <= 1) return 0;
    const dataPoints = chartData.length;
    const targetTicks = 7; // Aim for 7 evenly spaced ticks
    const interval = Math.max(0, Math.floor((dataPoints - 1) / (targetTicks - 1)) - 1);
    return interval;
  };

  const tickInterval = calculateTickInterval();

  // Get the correct data keys based on comparison mode
  const tyDataKey = hasComparison ? `${kpi}_ty` : kpi;
  const lyDataKey = hasComparison ? `${kpi}_ly` : null;

  // Determine which lines to show based on displayMode
  const showTY = displayMode === 'both' || displayMode === 'ty';
  const showLY = displayMode === 'both' || displayMode === 'ly';

  // Render placed tags as overlay elements (point tags only, not span tags)
  const renderPlacedTags = () => {
    if (!chartTags || chartTags.length === 0 || !chartData || chartData.length === 0) return null;

    // Filter out span tags - they're rendered in renderEventSpans
    const pointTags = chartTags.filter(t => !t.isSpan);
    if (pointTags.length === 0) return null;

    // Get current width - fallback to ref if state is 0
    const currentWidth = containerWidth || (chartContainerRef.current?.offsetWidth || 0);
    if (currentWidth === 0) return null;

    // Pole extends from tag area into chart
    const poleHeight = CHART_HEIGHT - CHART_MARGINS.bottom - 40;

    return pointTags.map((tag) => {
      // Find the date index - use stored index first, then lookup by date
      let dateIndex = tag.dateIndex;
      if (dateIndex === undefined || dateIndex < 0 || dateIndex >= chartData.length) {
        dateIndex = chartData.findIndex(d => d.date === tag.date);
      }

      if (dateIndex === -1 || dateIndex >= chartData.length) return null;

      const xPos = getXPositionForIndex(dateIndex);
      if (xPos === 0 && dateIndex !== 0) return null; // Position calculation failed

      const isExpanded = expandedTagId === tag.id;
      const hasDetails = tag.owner || tag.description;

      return (
        <div
          key={tag.id}
          className={`placed-tag-container ${isExpanded ? 'expanded' : ''}`}
          style={{ left: `${xPos}px` }}
        >
          {/* Tag label - compact pill design, clickable if has details */}
          <div
            className={`tag-label ${hasDetails ? 'clickable' : ''}`}
            style={{ background: tag.color }}
            onClick={hasDetails ? () => handleTagClick(tag.id) : undefined}
          >
            <span className="tag-label-text">{tag.name}</span>
            {hasDetails && (
              <span className="tag-expand-icon">
                {isExpanded ? '−' : '+'}
              </span>
            )}
            <button
              className="tag-label-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag.id);
              }}
              title="Remove tag"
            >
              ×
            </button>
          </div>

          {/* Expanded details panel */}
          {isExpanded && hasDetails && (
            <div className="tag-details" style={{ borderColor: tag.color }}>
              {tag.description && (
                <p className="tag-description">{tag.description}</p>
              )}
              {tag.owner && (
                <p className="tag-owner-info">
                  <span className="tag-owner-label">Owner:</span> {tag.owner}
                </p>
              )}
            </div>
          )}

          {/* Vertical pole extending down */}
          <div
            className="tag-pole"
            style={{
              background: tag.color,
              height: poleHeight
            }}
          ></div>
          {/* Date at bottom */}
          <div className="tag-date" style={{ color: tag.color }}>
            {formatAxisDate(tag.date)}
          </div>
        </div>
      );
    });
  };

  // Render drag preview
  const renderDragPreview = () => {
    if (!dragPreview || dragPreview.x === 0) return null;

    const poleHeight = CHART_HEIGHT - CHART_MARGINS.bottom - 40;

    return (
      <div
        className="drag-preview-container"
        style={{ left: `${dragPreview.x}px` }}
      >
        {/* Preview tag label */}
        <div className="tag-label preview" style={{ background: dragPreview.tag.color }}>
          <span className="tag-label-text">{dragPreview.tag.name}</span>
        </div>
        {/* Preview pole - dashed */}
        <div
          className="tag-pole preview"
          style={{
            borderColor: dragPreview.tag.color,
            height: poleHeight
          }}
        ></div>
        {/* Date display */}
        <div className="tag-date preview" style={{ color: dragPreview.tag.color }}>
          {dragPreview.formattedDate}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="areaGradientTY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F96302" stopOpacity={0.25}/>
                <stop offset="100%" stopColor="#F96302" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="areaGradientLY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#86868b" stopOpacity={0.15}/>
                <stop offset="100%" stopColor="#86868b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
              tickFormatter={formatAxisDate}
              interval={tickInterval}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={Y_AXIS_WIDTH}
            />
            <Tooltip content={<CustomTooltip />} />
            {hasComparison && <Legend />}
            {launchDate && showTY && (
              <ReferenceLine
                x={launchDate}
                stroke="#F96302"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: 'Launch',
                  position: 'top',
                  fill: '#F96302',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />
            )}
            {hasComparison && lyDataKey && showLY && (
              <Area
                type="monotone"
                dataKey={lyDataKey}
                name="Last Year"
                stroke="#86868b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#areaGradientLY)"
                dot={false}
                activeDot={{ r: 4, fill: '#86868b', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
            {showTY && (
              <Area
                type="monotone"
                dataKey={tyDataKey}
                name={hasComparison ? "This Year" : kpi}
                stroke="#F96302"
                strokeWidth={2}
                fill="url(#areaGradientTY)"
                dot={false}
                activeDot={{ r: 5, fill: '#F96302', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
              tickFormatter={formatAxisDate}
              interval={tickInterval}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={Y_AXIS_WIDTH}
            />
            <Tooltip content={<CustomTooltip />} />
            {hasComparison && <Legend />}
            {launchDate && showTY && (
              <ReferenceLine
                x={launchDate}
                stroke="#F96302"
                strokeDasharray="4 4"
                strokeWidth={2}
              />
            )}
            {hasComparison && lyDataKey && showLY && (
              <Bar
                dataKey={lyDataKey}
                name="Last Year"
                fill="#d1d1d6"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
            )}
            {showTY && (
              <Bar
                dataKey={tyDataKey}
                name={hasComparison ? "This Year" : kpi}
                fill="#F96302"
                radius={[4, 4, 0, 0]}
                maxBarSize={hasComparison ? 20 : 40}
              />
            )}
          </BarChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis
              dataKey="displayDate"
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
              tickFormatter={formatAxisDate}
              interval={tickInterval}
            />
            <YAxis
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={Y_AXIS_WIDTH}
            />
            <Tooltip content={<CustomTooltip />} />
            {hasComparison && <Legend />}
            {launchDate && showTY && (
              <ReferenceLine
                x={launchDate}
                stroke="#F96302"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: 'Launch',
                  position: 'top',
                  fill: '#F96302',
                  fontSize: 11,
                  fontWeight: 600
                }}
              />
            )}
            {hasComparison && lyDataKey && showLY && (
              <Line
                type="monotone"
                dataKey={lyDataKey}
                name="Last Year"
                stroke="#86868b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, fill: '#86868b', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
            {showTY && (
              <Line
                type="monotone"
                dataKey={tyDataKey}
                name={hasComparison ? "This Year" : kpi}
                stroke="#F96302"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: '#F96302', stroke: '#fff', strokeWidth: 2 }}
              />
            )}
          </LineChart>
        );
    }
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-empty">
        <p>No data available for the selected period</p>
      </div>
    );
  }

  if (isBeta) {
    return (
      <div className="kpi-chart beta-restricted">
        <div className="chart-blur-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
        <div className="beta-overlay">
          <div className="beta-overlay-content">
            <h3>Place holder</h3>
            <p>Chart visualization</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-chart-wrapper">
      <div
        className={`kpi-chart ${draggedTag ? 'drop-active' : ''}`}
        ref={chartContainerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Tag area - space above chart for tag labels */}
        <div className="tag-area">
          {renderPlacedTags()}
          {dragPreview && renderDragPreview()}
        </div>

        {/* Suggested event spans - rendered behind the chart */}
        <div className="event-spans-layer" style={{ height: `${PLOT_AREA_HEIGHT}px` }}>
          {renderEventSpans()}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={320}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Tag Panel Toggle */}
      <div className="chart-tag-controls">
        <button
          className={`tag-panel-toggle ${showTagPanel ? 'active' : ''}`}
          onClick={() => setShowTagPanel(!showTagPanel)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>
          <span>Add Info Tag</span>
        </button>

        {/* Suggested Events Toggle */}
        <button
          className={`suggested-events-toggle ${showSuggestedEvents ? 'active' : ''}`}
          onClick={() => setShowSuggestedEvents(!showSuggestedEvents)}
        >
          <span className={`suggested-events-dot ${showSuggestedEvents ? 'on' : 'off'}`}></span>
          <span>Suggested Events</span>
        </button>

        {/* Active Tags Display - only show point tags, not span tags */}
        {chartTags && chartTags.filter(t => !t.isSpan).length > 0 && (
          <div className="active-tags">
            {chartTags.filter(t => !t.isSpan).map(tag => (
              <span
                key={tag.id}
                className="active-tag"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                <span className="tag-marker" style={{ background: tag.color }}></span>
                {tag.name}
                <span className="tag-date">{formatAxisDate(tag.date)}</span>
                <button onClick={() => handleRemoveTag(tag.id)} className="tag-remove">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tag Panel */}
      {showTagPanel && (
        <div className="tag-panel">
          <div className="tag-panel-header">
            <h4>Drag tags onto the chart</h4>
            <button className="tag-panel-close" onClick={() => setShowTagPanel(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {dismissedEvents.length > 0 && (
            <button className="reset-dismissed-btn" onClick={handleResetDismissed}>
              Reset {dismissedEvents.length} dismissed event{dismissedEvents.length !== 1 ? 's' : ''}
            </button>
          )}

          <div className="preset-tags">
            {PRESET_TAGS
              // Filter out preset tags that match pinned events by name
              .filter(tag => {
                const tagNameLower = tag.name.toLowerCase();
                // Check if this tag name matches any pinned event
                const isPinnedAlready = (chartTags || []).some(ct =>
                  ct.isSpan && ct.name.toLowerCase() === tagNameLower
                );
                return !isPinnedAlready;
              })
              .map(tag => (
              <div
                key={tag.id}
                className="draggable-tag"
                draggable
                onDragStart={(e) => handleDragStart(e, tag)}
                onDragEnd={handleDragEnd}
                style={{ borderColor: tag.color }}
              >
                <span className="tag-marker" style={{ background: tag.color }}></span>
                {tag.name}
              </div>
            ))}
          </div>

          <div className="custom-tag-section">
            {!showCustomForm ? (
              <button
                className="add-custom-tag-btn"
                onClick={() => setShowCustomForm(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Custom Tag
              </button>
            ) : (
              <div className="custom-tag-form">
                <input
                  type="text"
                  placeholder="Tag name"
                  value={customTagName}
                  onChange={(e) => setCustomTagName(e.target.value)}
                  className="custom-tag-input"
                />
                <input
                  type="text"
                  placeholder="Your name (owner)"
                  value={customTagOwner}
                  onChange={(e) => setCustomTagOwner(e.target.value)}
                  className="custom-tag-input"
                />
                <textarea
                  placeholder="Short description (optional)"
                  value={customTagDescription}
                  onChange={(e) => setCustomTagDescription(e.target.value)}
                  className="custom-tag-textarea"
                  rows={2}
                />
                <div className="custom-tag-actions">
                  <button
                    className="custom-tag-cancel"
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomTagName('');
                      setCustomTagOwner('');
                      setCustomTagDescription('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="custom-tag-create"
                    onClick={handleAddCustomTag}
                    disabled={!customTagName.trim() || !customTagOwner.trim()}
                  >
                    Create & Drag
                  </button>
                </div>
              </div>
            )}
          </div>

          {draggedTag && draggedTag.isCustom && (
            <div className="drag-instruction">
              <p>Now drag your custom tag "{draggedTag.name}" onto the chart</p>
              <div
                className="draggable-tag custom"
                draggable
                onDragStart={(e) => handleDragStart(e, draggedTag)}
                onDragEnd={handleDragEnd}
              >
                <span className="tag-marker" style={{ background: draggedTag.color }}></span>
                {draggedTag.name}
                <span className="tag-owner">by {draggedTag.owner}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KPIChart;
