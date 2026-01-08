import React from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import './KPIChart.css';

function KPIChart({ data, kpi, chartType, format, launchDate }) {
  const { isBetaMode } = useAuth();
  const isBeta = isBetaMode();
  
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-date">
            {new Date(label).toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
          <p className="tooltip-value">{formatValue(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const commonProps = {
    data: data,
    margin: { top: 20, right: 20, left: 10, bottom: 20 }
  };

  const axisStyle = {
    fontSize: 11,
    fill: '#86868b',
    fontWeight: 500
  };

  const renderChart = () => {
    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F96302" stopOpacity={0.25}/>
                <stop offset="100%" stopColor="#F96302" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
              tickFormatter={formatAxisDate}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            {launchDate && (
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
            <Area 
              type="monotone" 
              dataKey={kpi} 
              stroke="#F96302" 
              strokeWidth={2}
              fill="url(#areaGradient)"
              dot={false}
              activeDot={{ r: 5, fill: '#F96302', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
              tickFormatter={formatAxisDate}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            {launchDate && (
              <ReferenceLine 
                x={launchDate} 
                stroke="#F96302" 
                strokeDasharray="4 4"
                strokeWidth={2}
              />
            )}
            <Bar 
              dataKey={kpi} 
              fill="#F96302"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        );
      
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={axisStyle}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
              tickFormatter={formatAxisDate}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            {launchDate && (
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
            <Line 
              type="monotone" 
              dataKey={kpi} 
              stroke="#F96302" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#F96302', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        );
    }
  };

  if (!data || data.length === 0) {
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
    <div className="kpi-chart">
      <ResponsiveContainer width="100%" height={320}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

export default KPIChart;