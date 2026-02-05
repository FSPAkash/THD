import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import './KPIChart.css';

const PRESET_TAGS = [
  { id: 'thanksgiving', name: 'Thanksgiving', color: '#F96302' },
  { id: 'july4th', name: '4th of July', color: '#FF3B30' },
  { id: 'tier1', name: 'Tier 1 Event', color: '#5856D6' },
  { id: 'promo', name: 'Promo', color: '#34C759' },
  { id: 'outage', name: 'Outage/Issue', color: '#FF2D55' }
];

const CHART_MARGINS = { top: 20, right: 20, left: 10, bottom: 20 };
const Y_AXIS_WIDTH = 60;
const CHART_HEIGHT = 320;
const PLOT_AREA_HEIGHT = CHART_HEIGHT - CHART_MARGINS.top - CHART_MARGINS.bottom - 54;

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function KPIChart({ data, kpi, chartType, format, launchDate, comparisonData, chartTags, onTagsChange, displayMode = 'both', events = [], showSuggestedEvents = false }) {
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
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingTagData, setEditingTagData] = useState(null);
  const [dismissedEvents, setDismissedEvents] = useState(() => {
    try {
      const stored = sessionStorage.getItem('dismissedEvents');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [editingEvent, setEditingEvent] = useState(null);

  const rawChartData = comparisonData && comparisonData.length > 0 ? comparisonData : data;
  const hasComparison = comparisonData && comparisonData.length > 0;

  const chartData = rawChartData?.map(d => ({
    ...d,
    displayDate: displayMode === 'ly' && d.date_ly ? d.date_ly : d.date
  })) || [];

  useEffect(() => {
    const updateWidth = () => {
      if (chartContainerRef.current) {
        const width = chartContainerRef.current.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    };

    updateWidth();
    const initialTimeout = setTimeout(updateWidth, 100);
    const secondTimeout = setTimeout(updateWidth, 300);

    window.addEventListener('resize', updateWidth);

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateWidth);
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

  useEffect(() => {
    if (chartTags && chartTags.length > 0 && chartContainerRef.current) {
      const width = chartContainerRef.current.offsetWidth;
      if (width > 0 && containerWidth !== width) {
        setContainerWidth(width);
      }
    }
  }, [chartTags, containerWidth]);

  useEffect(() => {
    if (!editingTagId && !editingEvent) return;

    const handleClickOutside = (e) => {
      const clickedElement = e.target;
      
      const isInsidePopover = clickedElement.closest('.tag-edit-popover');
      const isInsideEventEdit = clickedElement.closest('.event-span-edit');
      const isTagLabel = clickedElement.closest('.tag-label');
      const isSpanLabel = clickedElement.closest('.event-span-label');
      const isActivePill = clickedElement.closest('.active-tag-pill');
      const isButton = clickedElement.closest('button');
      const isInput = clickedElement.closest('input');
      
      if (isInsidePopover || isInsideEventEdit || isTagLabel || isSpanLabel || isActivePill || isButton || isInput) {
        return;
      }

      setEditingTagId(null);
      setEditingTagData(null);
      setEditingEvent(null);
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [editingTagId, editingEvent]);

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

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getContainerRect = useCallback(() => {
    if (!chartContainerRef.current) return null;
    return chartContainerRef.current.getBoundingClientRect();
  }, []);

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

  const getXPositionForIndex = useCallback((index) => {
    if (!chartData || chartData.length === 0 || index < 0) return 0;

    const width = containerWidth || (chartContainerRef.current?.offsetWidth || 0);
    if (width === 0) return 0;

    const chartAreaLeft = Y_AXIS_WIDTH + CHART_MARGINS.left;
    const chartAreaWidth = width - chartAreaLeft - CHART_MARGINS.right;

    if (chartData.length === 1) {
      return chartAreaLeft + chartAreaWidth / 2;
    }

    const percentage = index / (chartData.length - 1);
    return chartAreaLeft + (percentage * chartAreaWidth);
  }, [chartData, containerWidth]);

  const getDateFromIndex = useCallback((index) => {
    if (!chartData || chartData.length === 0 || index < 0 || index >= chartData.length) return null;
    return chartData[index]?.date || null;
  }, [chartData]);

  const getIndexFromDate = useCallback((dateStr) => {
    if (!chartData || chartData.length === 0 || !dateStr) return -1;
    return chartData.findIndex(d => d.date === dateStr);
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = chartData?.find(d => d.displayDate === label);

      const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const dateTag = chartTags?.find(t => t.date === label || t.date === dataPoint?.date);

      return (
        <div className="chart-tooltip">
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
    const tagForDrag = {
      ...tag,
      id: tag.id.startsWith('custom-') ? tag.id : tag.id
    };
    setDraggedTag(tagForDrag);
    e.dataTransfer.effectAllowed = 'copy';
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
      const uniqueId = `${draggedTag.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newTag = {
        ...draggedTag,
        id: uniqueId,
        date: targetDate,
        startDate: targetDate,
        endDate: targetDate,
        dateIndex: dateIndex,
        startIndex: dateIndex,
        endIndex: dateIndex,
        isSpan: false,
        isManual: true,
        createdAt: new Date().toISOString()
      };

      if (onTagsChange) {
        onTagsChange([...(chartTags || []), newTag]);
      }

      setTimeout(() => {
        setEditingTagId(uniqueId);
        setEditingTagData({
          name: newTag.name,
          owner: newTag.owner || '',
          description: newTag.description || '',
          startDate: targetDate,
          endDate: targetDate,
          startIndex: dateIndex,
          endIndex: dateIndex
        });
      }, 50);
    }

    setDraggedTag(null);
    setDragPreview(null);
  };

  const handleDragEnd = () => {
    setDragPreview(null);
    setDraggedTag(null);
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

  const openTagEditor = useCallback((tagId, tag) => {
    const tagIndex = tag.startIndex !== undefined ? tag.startIndex : 
                     (tag.dateIndex !== undefined ? tag.dateIndex : getIndexFromDate(tag.date));
    const endIndex = tag.endIndex !== undefined ? tag.endIndex : tagIndex;
    
    setEditingTagId(tagId);
    setEditingTagData({
      name: tag.name || '',
      owner: tag.owner || '',
      description: tag.description || '',
      startDate: tag.startDate || tag.date,
      endDate: tag.endDate || tag.date,
      startIndex: tagIndex,
      endIndex: endIndex
    });
  }, [getIndexFromDate]);

  const closeTagEditor = useCallback(() => {
    setEditingTagId(null);
    setEditingTagData(null);
  }, []);

  const handleTagLabelClick = useCallback((e, tagId, tag) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (editingTagId === tagId) {
      return;
    }
    
    openTagEditor(tagId, tag);
  }, [editingTagId, openTagEditor]);

  const handleEditingDataChange = useCallback((field, value) => {
    setEditingTagData(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const handleStartDateChange = useCallback((newIndex) => {
    if (!editingTagData || newIndex < 0 || newIndex >= chartData.length) return;
    
    const newStartDate = getDateFromIndex(newIndex);
    if (!newStartDate) return;

    let endIndex = editingTagData.endIndex;
    if (newIndex > endIndex) {
      endIndex = newIndex;
    }

    setEditingTagData(prev => prev ? {
      ...prev,
      startDate: newStartDate,
      startIndex: newIndex,
      endDate: getDateFromIndex(endIndex) || prev.endDate,
      endIndex: endIndex
    } : null);
  }, [editingTagData, chartData.length, getDateFromIndex]);

  const handleEndDateChange = useCallback((newIndex) => {
    if (!editingTagData || newIndex < 0 || newIndex >= chartData.length) return;
    
    const newEndDate = getDateFromIndex(newIndex);
    if (!newEndDate) return;

    let startIndex = editingTagData.startIndex;
    if (newIndex < startIndex) {
      startIndex = newIndex;
    }

    setEditingTagData(prev => prev ? {
      ...prev,
      endDate: newEndDate,
      endIndex: newIndex,
      startDate: getDateFromIndex(startIndex) || prev.startDate,
      startIndex: startIndex
    } : null);
  }, [editingTagData, chartData.length, getDateFromIndex]);

  const handleSaveTagEdit = useCallback(() => {
    if (!editingTagId || !editingTagData) return;

    const isSpan = editingTagData.startIndex !== editingTagData.endIndex;

    const updatedTags = (chartTags || []).map(tag => {
      if (tag.id === editingTagId) {
        return {
          ...tag,
          name: editingTagData.name,
          owner: editingTagData.owner,
          description: editingTagData.description,
          startDate: editingTagData.startDate,
          endDate: editingTagData.endDate,
          date: editingTagData.startDate,
          startIndex: editingTagData.startIndex,
          endIndex: editingTagData.endIndex,
          dateIndex: editingTagData.startIndex,
          isSpan: isSpan,
          adjustedStart: new Date(editingTagData.startDate + 'T00:00:00').toISOString(),
          adjustedEnd: new Date(editingTagData.endDate + 'T00:00:00').toISOString(),
          yearLabel: displayMode === 'ly' ? 'LY' : 'TY',
          updatedAt: new Date().toISOString()
        };
      }
      return tag;
    });

    if (onTagsChange) {
      onTagsChange(updatedTags);
    }

    closeTagEditor();
  }, [editingTagId, editingTagData, chartTags, displayMode, onTagsChange, closeTagEditor]);

  const handleConvertToSpan = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingTagData) return;

    const currentIndex = editingTagData.startIndex;
    const defaultSpanDays = 3;
    const newEndIndex = Math.min(currentIndex + defaultSpanDays, chartData.length - 1);
    const newEndDate = getDateFromIndex(newEndIndex);

    setEditingTagData(prev => prev ? {
      ...prev,
      endDate: newEndDate || prev.endDate,
      endIndex: newEndIndex
    } : null);
  }, [editingTagData, chartData.length, getDateFromIndex]);

  const handleConvertToPoint = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!editingTagData) return;

    const startDate = editingTagData.startDate;
    const startIndex = editingTagData.startIndex;

    setEditingTagData(prev => prev ? {
      ...prev,
      endDate: startDate,
      endIndex: startIndex
    } : null);
  }, [editingTagData]);

  const handleRemoveTag = useCallback((tagId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (onTagsChange) {
      onTagsChange((chartTags || []).filter(t => t.id !== tagId));
    }
    if (editingTagId === tagId) {
      closeTagEditor();
    }
  }, [chartTags, editingTagId, onTagsChange, closeTagEditor]);

  useEffect(() => {
    try {
      sessionStorage.setItem('dismissedEvents', JSON.stringify(dismissedEvents));
    } catch { }
  }, [dismissedEvents]);

  const handleDismissEvent = (eventId) => {
    setDismissedEvents(prev => [...prev, eventId]);
  };

  const handleResetDismissed = () => {
    setDismissedEvents([]);
  };

  const pinnedEventIds = (chartTags || [])
    .filter(tag => tag.sourceEventId)
    .map(tag => tag.sourceEventId);

  const getFilteredEvents = useCallback(() => {
    if (!events || events.length === 0 || !chartData || chartData.length === 0) return [];

    const chartStartDate = chartData[0]?.date;
    const chartEndDate = chartData[chartData.length - 1]?.date;
    if (!chartStartDate || !chartEndDate) return [];

    const chartStart = new Date(chartStartDate + 'T00:00:00');
    const chartEnd = new Date(chartEndDate + 'T00:00:00');

    const yearLabel = displayMode === 'ly' ? 'LY' : 'TY';

    return events
      .filter(ev => !dismissedEvents.includes(ev.id))
      .filter(ev => !pinnedEventIds.includes(ev.id))
      .map(ev => {
        let evStart = new Date(ev.startDate + 'T00:00:00');
        let evEnd = new Date(ev.endDate + 'T00:00:00');

        if (displayMode === 'ly') {
          evStart = new Date(evStart.getTime() - 365 * 24 * 60 * 60 * 1000);
          evEnd = new Date(evEnd.getTime() - 365 * 24 * 60 * 60 * 1000);
        }

        return { ...ev, adjustedStart: evStart, adjustedEnd: evEnd, yearLabel };
      })
      .filter(ev => ev.adjustedStart <= chartEnd && ev.adjustedEnd >= chartStart);
  }, [events, chartData, displayMode, dismissedEvents, pinnedEventIds]);

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

  const renderCompactEditPopover = (tag, isInSpanLayer = false) => {
    if (editingTagId !== tag.id || !editingTagData) return null;

    const isSpan = editingTagData.startIndex !== editingTagData.endIndex;
    const dayCount = editingTagData.endIndex - editingTagData.startIndex + 1;

    const handlePopoverClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handlePopoverMouseMove = (e) => {
      e.stopPropagation();
    };

    return (
      <div
        className={`tag-edit-popover compact ${isInSpanLayer ? 'in-span-layer' : ''}`}
        style={{ borderColor: tag.color }}
        onClick={handlePopoverClick}
        onMouseDown={handlePopoverClick}
        onMouseMove={handlePopoverMouseMove}
        onMouseEnter={handlePopoverClick}
      >
        <div className="edit-popover-header">
          <input
            type="text"
            className="edit-name-input"
            value={editingTagData.name}
            onChange={(e) => handleEditingDataChange('name', e.target.value)}
            placeholder="Event name"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <button 
            className="edit-popover-close" 
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              closeTagEditor(); 
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="edit-row">
          <input
            type="text"
            className="edit-field-small"
            value={editingTagData.owner}
            onChange={(e) => handleEditingDataChange('owner', e.target.value)}
            placeholder="Owner"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <input
            type="text"
            className="edit-field-small"
            value={editingTagData.description}
            onChange={(e) => handleEditingDataChange('description', e.target.value)}
            placeholder="Note"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="edit-date-row" onClick={handlePopoverClick} onMouseDown={handlePopoverClick}>
          <div className="date-control">
            <button 
              className="date-btn"
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                handleStartDateChange(editingTagData.startIndex - 1); 
              }}
              disabled={editingTagData.startIndex <= 0}
            >-</button>
            <span className="date-value">{formatShortDate(editingTagData.startDate)}</span>
            <button 
              className="date-btn"
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                handleStartDateChange(editingTagData.startIndex + 1); 
              }}
              disabled={editingTagData.startIndex >= chartData.length - 1}
            >+</button>
          </div>
          
          <span className="date-separator">to</span>
          
          <div className="date-control">
            <button 
              className="date-btn"
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                handleEndDateChange(editingTagData.endIndex - 1); 
              }}
              disabled={editingTagData.endIndex <= 0}
            >-</button>
            <span className="date-value">{formatShortDate(editingTagData.endDate)}</span>
            <button 
              className="date-btn"
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                handleEndDateChange(editingTagData.endIndex + 1); 
              }}
              disabled={editingTagData.endIndex >= chartData.length - 1}
            >+</button>
          </div>
          
          <span className="day-count">{dayCount}d</span>
        </div>

        <div className="edit-actions-row" onClick={handlePopoverClick} onMouseDown={handlePopoverClick}>
          {!isSpan ? (
            <button 
              className="action-btn secondary"
              onClick={(e) => handleConvertToSpan(e)}
            >
              Make Span
            </button>
          ) : (
            <button 
              className="action-btn secondary"
              onClick={(e) => handleConvertToPoint(e)}
            >
              Single Day
            </button>
          )}
          <button 
            className="action-btn danger"
            onClick={(e) => handleRemoveTag(tag.id, e)}
          >
            Delete
          </button>
          <button 
            className="action-btn primary"
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              handleSaveTagEdit(); 
            }}
          >
            Save
          </button>
        </div>
      </div>
    );
  };

  const renderSingleSpan = (ev, isPinned = false, isManualSpan = false) => {
    const currentWidth = containerWidth || (chartContainerRef.current?.offsetWidth || 0);
    if (currentWidth === 0) return null;

    const chartAreaLeft = Y_AXIS_WIDTH + CHART_MARGINS.left;
    const chartAreaWidth = currentWidth - chartAreaLeft - CHART_MARGINS.right;

    let evStart, evEnd;
    
    if (isManualSpan) {
      evStart = new Date(ev.startDate + 'T00:00:00');
      evEnd = new Date(ev.endDate + 'T00:00:00');
    } else {
      evStart = isPinned ? new Date(ev.adjustedStart) : ev.adjustedStart;
      evEnd = isPinned ? new Date(ev.adjustedEnd) : ev.adjustedEnd;
    }

    const startIdx = isManualSpan ? ev.startIndex : getIndexForDate(evStart);
    const endIdx = isManualSpan ? ev.endIndex : getIndexForDate(evEnd);

    const clampedStart = Math.max(0, startIdx);
    const clampedEnd = Math.min(chartData.length - 1, endIdx);

    const startPct = chartData.length === 1 ? 0.5 : clampedStart / (chartData.length - 1);
    const endPct = chartData.length === 1 ? 0.5 : clampedEnd / (chartData.length - 1);

    const leftPx = chartAreaLeft + startPct * chartAreaWidth;
    const rightPx = chartAreaLeft + endPct * chartAreaWidth;
    const widthPx = Math.max(rightPx - leftPx, 4);
    const centerPx = leftPx + widthPx / 2;

    const fillColor = hexToRgba(ev.color, 0.12);
    const borderColor = hexToRgba(ev.color, 0.5);

    const isBeingEdited = editingTagId === ev.id;
    const spanLabel = ev.name || ev.label;
    const yearLabel = ev.yearLabel || (displayMode === 'ly' ? 'LY' : 'TY');

    const handleSpanClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    return (
      <div
        key={ev.id}
        className={`event-span ${isPinned || isManualSpan ? 'pinned' : ''} ${isBeingEdited ? 'editing' : ''}`}
        style={{
          left: `${leftPx}px`,
          width: `${widthPx}px`,
          background: fillColor,
          borderLeft: `2px solid ${borderColor}`,
          borderRight: `2px solid ${borderColor}`,
        }}
      >
        <div
          className="event-span-label"
          style={{ left: `${centerPx - leftPx}px`, background: ev.color }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isManualSpan) {
              if (editingTagId !== ev.id) {
                openTagEditor(ev.id, ev);
              }
            } else if (!isPinned) {
              setEditingEvent(editingEvent?.id === ev.id ? null : ev);
            }
          }}
          onMouseDown={handleSpanClick}
        >
          <span className="event-span-label-text">
            {spanLabel} ({yearLabel})
          </span>
          <button
            className="event-span-dismiss"
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              if (isPinned || isManualSpan) {
                handleRemoveTag(ev.id, e);
              } else {
                handleDismissEvent(ev.id);
              }
            }}
            title={isPinned || isManualSpan ? "Remove" : "Dismiss"}
          >
            x
          </button>
        </div>

        {isManualSpan && isBeingEdited && renderCompactEditPopover(ev, true)}

        {!isPinned && !isManualSpan && editingEvent?.id === ev.id && (
          <div
            className="event-span-edit"
            style={{ left: `${centerPx - leftPx}px` }}
            onClick={handleSpanClick}
            onMouseDown={handleSpanClick}
            onMouseMove={handleSpanClick}
            onMouseEnter={handleSpanClick}
          >
            <div className="event-span-edit-header">
              <strong>{ev.label}</strong>
              <button 
                className="event-span-edit-close" 
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingEvent(null); 
                }}
              >
                x
              </button>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onTagsChange) {
                  onTagsChange([...(chartTags || []), {
                    id: `pinned-${ev.id}-${Date.now()}`,
                    name: ev.label,
                    color: ev.color,
                    sourceEventId: ev.id,
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

  const getPinnedSpans = useCallback(() => {
    if (!chartTags || !chartData || chartData.length === 0) return [];

    const chartStartDate = chartData[0]?.date;
    const chartEndDate = chartData[chartData.length - 1]?.date;
    if (!chartStartDate || !chartEndDate) return [];

    const chartStart = new Date(chartStartDate + 'T00:00:00');
    const chartEnd = new Date(chartEndDate + 'T00:00:00');

    return chartTags
      .filter(tag => tag.isSpan && !tag.isManual)
      .filter(tag => {
        const tagStart = new Date(tag.adjustedStart);
        const tagEnd = new Date(tag.adjustedEnd);
        return tagStart <= chartEnd && tagEnd >= chartStart;
      });
  }, [chartTags, chartData]);

  const getManualSpans = useCallback(() => {
    if (!chartTags || !chartData || chartData.length === 0) return [];
    return chartTags.filter(tag => tag.isSpan && tag.isManual);
  }, [chartTags, chartData]);

  const renderEventSpans = () => {
    const currentWidth = containerWidth || (chartContainerRef.current?.offsetWidth || 0);
    if (currentWidth === 0) return null;

    const pinnedSpans = getPinnedSpans();
    const manualSpans = getManualSpans();
    const suggestedEvents = showSuggestedEvents ? getFilteredEvents() : [];

    if (pinnedSpans.length === 0 && suggestedEvents.length === 0 && manualSpans.length === 0) return null;

    return (
      <>
        {pinnedSpans.map(span => renderSingleSpan(span, true, false))}
        {manualSpans.map(span => renderSingleSpan(span, false, true))}
        {suggestedEvents.map(ev => renderSingleSpan(ev, false, false))}
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

  const calculateTickInterval = () => {
    if (!chartData || chartData.length <= 1) return 0;
    const dataPoints = chartData.length;
    const targetTicks = 7;
    const interval = Math.max(0, Math.floor((dataPoints - 1) / (targetTicks - 1)) - 1);
    return interval;
  };

  const tickInterval = calculateTickInterval();

  const tyDataKey = hasComparison ? `${kpi}_ty` : kpi;
  const lyDataKey = hasComparison ? `${kpi}_ly` : null;

  const showTY = displayMode === 'both' || displayMode === 'ty';
  const showLY = displayMode === 'both' || displayMode === 'ly';

  const renderPlacedTags = () => {
    if (!chartTags || chartTags.length === 0 || !chartData || chartData.length === 0) return null;

    const pointTags = chartTags.filter(t => !t.isSpan);
    if (pointTags.length === 0) return null;

    const currentWidth = containerWidth || (chartContainerRef.current?.offsetWidth || 0);
    if (currentWidth === 0) return null;

    const poleHeight = CHART_HEIGHT - CHART_MARGINS.bottom - 40;

    return pointTags.map((tag) => {
      let dateIndex = tag.dateIndex;
      if (dateIndex === undefined || dateIndex < 0 || dateIndex >= chartData.length) {
        dateIndex = chartData.findIndex(d => d.date === tag.date);
      }

      if (dateIndex === -1 || dateIndex >= chartData.length) return null;

      const xPos = getXPositionForIndex(dateIndex);
      if (xPos === 0 && dateIndex !== 0) return null;

      const isEditing = editingTagId === tag.id;
      const yearLabel = tag.yearLabel || (displayMode === 'ly' ? 'LY' : 'TY');

      return (
        <div
          key={tag.id}
          className={`placed-tag-container ${isEditing ? 'editing' : ''}`}
          style={{ left: `${xPos}px` }}
        >
          <div
            className="tag-label clickable"
            style={{ background: tag.color }}
            onClick={(e) => handleTagLabelClick(e, tag.id, tag)}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <span className="tag-label-text">{tag.name} ({yearLabel})</span>
            <button
              className="tag-label-remove"
              onClick={(e) => handleRemoveTag(tag.id, e)}
              title="Remove tag"
            >
              x
            </button>
          </div>

          {isEditing && renderCompactEditPopover(tag, false)}

          <div
            className="tag-pole"
            style={{
              background: tag.color,
              height: poleHeight
            }}
          ></div>
          <div className="tag-date" style={{ color: tag.color }}>
            {formatAxisDate(tag.date)}
          </div>
        </div>
      );
    });
  };

  const renderDragPreview = () => {
    if (!dragPreview || dragPreview.x === 0) return null;

    const poleHeight = CHART_HEIGHT - CHART_MARGINS.bottom - 40;

    return (
      <div
        className="drag-preview-container"
        style={{ left: `${dragPreview.x}px` }}
      >
        <div className="tag-label preview" style={{ background: dragPreview.tag.color }}>
          <span className="tag-label-text">{dragPreview.tag.name}</span>
        </div>
        <div
          className="tag-pole preview"
          style={{
            borderColor: dragPreview.tag.color,
            height: poleHeight
          }}
        ></div>
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

  const isEditingActive = editingTagId || editingEvent;

  return (
    <div className="kpi-chart-wrapper">
      <div
        className={`kpi-chart ${draggedTag ? 'drop-active' : ''} ${isEditingActive ? 'editing-active' : ''}`}
        ref={chartContainerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="tag-area">
          {renderPlacedTags()}
          {dragPreview && renderDragPreview()}
        </div>

        <div
          className={`event-spans-layer ${isEditingActive ? 'has-editing' : ''}`}
          style={{ height: `${PLOT_AREA_HEIGHT}px` }}
        >
          {renderEventSpans()}
        </div>

        {isEditingActive && (
          <div
            className="chart-interaction-blocker"
            onClick={(e) => { e.stopPropagation(); }}
            onMouseMove={(e) => { e.stopPropagation(); }}
          />
        )}

        <ResponsiveContainer width="100%" height={320}>
          {renderChart()}
        </ResponsiveContainer>
      </div>

      <div className="chart-tag-controls">
        <button
          className={`tag-panel-toggle ${showTagPanel ? 'active' : ''}`}
          onClick={() => setShowTagPanel(!showTagPanel)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
            <line x1="7" y1="7" x2="7.01" y2="7"></line>
          </svg>
          <span>Add Tag</span>
        </button>

        {chartTags && chartTags.length > 0 && (() => {
          const pinnedEvents = chartTags.filter(tag => tag.source === 'suggested');
          const manualTags = chartTags.filter(tag => tag.source !== 'suggested');

          const renderPill = (tag) => (
            <span
              key={tag.id}
              className={`active-tag-pill ${editingTagId === tag.id ? 'editing' : ''}`}
              style={{ '--tag-color': tag.color }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openTagEditor(tag.id, tag);
              }}
            >
              <span className="pill-dot" style={{ background: tag.color }}></span>
              <span className="pill-name">{tag.name}</span>
              {tag.isSpan && (
                <span className="pill-range">
                  {formatShortDate(tag.startDate)}-{formatShortDate(tag.endDate)}
                </span>
              )}
              {!tag.isSpan && (
                <span className="pill-date">{formatShortDate(tag.date)}</span>
              )}
              <button
                className="pill-remove"
                onClick={(e) => handleRemoveTag(tag.id, e)}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </span>
          );

          return (
            <div className="active-tags-list">
              {pinnedEvents.length > 0 && (
                <>
                  <span className="tags-section-label pinned">Suggested Events</span>
                  {pinnedEvents.map(renderPill)}
                </>
              )}
              {pinnedEvents.length > 0 && manualTags.length > 0 && (
                <span className="tags-separator"></span>
              )}
              {manualTags.length > 0 && (
                <>
                  <span className="tags-section-label manual">User Added</span>
                  {manualTags.map(renderPill)}
                </>
              )}
            </div>
          );
        })()}
      </div>

      {showTagPanel && (
        <div className="tag-panel">
          <div className="tag-panel-header">
            <h4>Add Event Tag</h4>
            <button className="tag-panel-close" onClick={() => setShowTagPanel(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <p className="tag-panel-hint">
            Drag a tag onto the chart. Click to edit dates and convert to a span.
          </p>

          {dismissedEvents.length > 0 && (
            <button className="reset-dismissed-btn" onClick={handleResetDismissed}>
              Restore {dismissedEvents.length} dismissed
            </button>
          )}

          <div className="preset-tags">
            {PRESET_TAGS.map(tag => (
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
                Custom Tag
              </button>
            ) : (
              <div className="custom-tag-form">
                <div className="custom-form-row">
                  <input
                    type="text"
                    placeholder="Tag name"
                    value={customTagName}
                    onChange={(e) => setCustomTagName(e.target.value)}
                    className="custom-tag-input"
                  />
                  <input
                    type="text"
                    placeholder="Owner"
                    value={customTagOwner}
                    onChange={(e) => setCustomTagOwner(e.target.value)}
                    className="custom-tag-input"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={customTagDescription}
                  onChange={(e) => setCustomTagDescription(e.target.value)}
                  className="custom-tag-input full"
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
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>

          {draggedTag && draggedTag.isCustom && (
            <div className="drag-instruction">
              <p>Drag "{draggedTag.name}" onto the chart:</p>
              <div
                className="draggable-tag custom"
                draggable
                onDragStart={(e) => handleDragStart(e, draggedTag)}
                onDragEnd={handleDragEnd}
              >
                <span className="tag-marker" style={{ background: draggedTag.color }}></span>
                {draggedTag.name}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KPIChart;
