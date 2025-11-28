import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { Hazard } from '../types';
import ChartDrilldownModal from './ChartDrilldownModal';
import {
  getTypeDistribution,
  getSeverityDistribution,
  getTimeSeriesData,
  getSourceDistribution
} from '../utils/analytics';

interface ChartsPanelProps {
  hazards: Hazard[];
}

type ChartType = 'type' | 'severity' | 'timeline' | 'source';
type TimeRange = '24h' | '7d' | '30d' | 'all';

const ChartsPanel: React.FC<ChartsPanelProps> = ({ hazards }) => {
  const [selectedChart, setSelectedChart] = useState<ChartType>('type');
  const [isExpanded, setIsExpanded] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [drilldownData, setDrilldownData] = useState<{
    isOpen: boolean;
    title: string;
    filteredHazards: Hazard[];
    drilldownType: 'type' | 'severity' | 'source' | 'date';
    drilldownValue: string;
  }>({
    isOpen: false,
    title: '',
    filteredHazards: [],
    drilldownType: 'type',
    drilldownValue: '',
  });

  // Map time range to days
  const getDaysFromRange = (range: TimeRange): number => {
    switch (range) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case 'all': return 365; // Show up to 1 year
      default: return 7;
    }
  };

  // Cache chart data calculations with useMemo
  const typeData = useMemo(() => getTypeDistribution(hazards), [hazards]);
  const severityData = useMemo(() => getSeverityDistribution(hazards), [hazards]);
  const timelineData = useMemo(() => getTimeSeriesData(hazards, getDaysFromRange(timeRange)), [hazards, timeRange]);
  const sourceData = useMemo(() => getSourceDistribution(hazards), [hazards]);

  // Handle chart click for drill-down
  const handleChartClick = (data: any, drilldownType: 'type' | 'severity' | 'source' | 'date') => {
    if (!data || !data.activePayload?.[0]) return;

    const payload = data.activePayload[0].payload;
    let filteredHazards: Hazard[] = [];
    let title = '';
    let drilldownValue = '';

    switch (drilldownType) {
      case 'type':
        drilldownValue = payload.type;
        filteredHazards = hazards.filter(h => h.type === payload.type);
        title = `${payload.type.replace(/_/g, ' ')} Hazards`;
        break;
      case 'severity':
        drilldownValue = payload.severity;
        filteredHazards = hazards.filter(h => h.severity === payload.severity);
        title = `${payload.severity} Severity Hazards`;
        break;
      case 'source':
        drilldownValue = payload.source;
        filteredHazards = hazards.filter(h => h.source === payload.source);
        title = `Hazards from ${payload.source}`;
        break;
      case 'date':
        drilldownValue = new Date(payload.date).toLocaleDateString();
        const targetDate = new Date(payload.date).toDateString();
        filteredHazards = hazards.filter(h => {
          try {
            if (!h.timestamp) return false;
            return new Date(h.timestamp).toDateString() === targetDate;
          } catch {
            return false;
          }
        });
        title = `Hazards on ${drilldownValue}`;
        break;
    }

    setDrilldownData({
      isOpen: true,
      title,
      filteredHazards,
      drilldownType,
      drilldownValue,
    });
  };

  const closeDrilldown = () => {
    setDrilldownData(prev => ({ ...prev, isOpen: false }));
  };

  const renderChart = () => {
    if (hazards.length === 0) {
      return (
        <div className="chart-empty">
          <p>No data available to display charts</p>
        </div>
      );
    }

    switch (selectedChart) {
      case 'type':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart onClick={(data) => handleChartClick(data, 'type')}>
              <Pie
                data={typeData as any}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={2}
                label={(entry: any) => {
                  // Only show label if percentage is above 5% to avoid clutter
                  if (entry.percentage >= 5) {
                    return `${entry.type.replace(/_/g, ' ')}: ${entry.percentage}%`;
                  }
                  return '';
                }}
                labelLine={{
                  stroke: '#9ca3af',
                  strokeWidth: 1
                }}
                style={{ cursor: 'pointer' }}
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#e5e7eb'
                }}
                itemStyle={{
                  color: '#e5e7eb'
                }}
                labelStyle={{
                  color: '#f3f4f6',
                  fontWeight: '600'
                }}
                formatter={(value: any, name: string, props: any) => [
                  `${value} (${props.payload.percentage}%) - Click to view details`,
                  name.replace(/_/g, ' ')
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => value.replace(/_/g, ' ')}
                wrapperStyle={{
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'severity':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityData} onClick={(data) => handleChartClick(data, 'severity')}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="severity" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: any) => [`${value} - Click to view details`, 'Count']}
                cursor={{ fill: 'rgba(96, 165, 250, 0.1)' }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} style={{ cursor: 'pointer' }}>
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'timeline':
        return (
          <>
            <div className="time-range-selector">
              <button
                className={`time-range-btn ${timeRange === '24h' ? 'active' : ''}`}
                onClick={() => setTimeRange('24h')}
              >
                24 Hours
              </button>
              <button
                className={`time-range-btn ${timeRange === '7d' ? 'active' : ''}`}
                onClick={() => setTimeRange('7d')}
              >
                7 Days
              </button>
              <button
                className={`time-range-btn ${timeRange === '30d' ? 'active' : ''}`}
                onClick={() => setTimeRange('30d')}
              >
                30 Days
              </button>
              <button
                className={`time-range-btn ${timeRange === 'all' ? 'active' : ''}`}
                onClick={() => setTimeRange('all')}
              >
                All Time
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData} onClick={(data) => handleChartClick(data, 'date')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#e5e7eb'
                  }}
                  itemStyle={{
                    color: '#e5e7eb'
                  }}
                  labelStyle={{
                    color: '#f3f4f6',
                    fontWeight: '600'
                  }}
                  labelFormatter={(value) => `${new Date(value).toLocaleDateString()} - Click to view details`}
                  cursor={{ stroke: '#60a5fa', strokeWidth: 2 }}
                />
                <Legend />
                <Line type="monotone" dataKey="earthquakes" stroke="#ef4444" strokeWidth={2} name="Earthquakes" style={{ cursor: 'pointer' }} />
                <Line type="monotone" dataKey="volcanoes" stroke="#f97316" strokeWidth={2} name="Volcanoes" style={{ cursor: 'pointer' }} />
                <Line type="monotone" dataKey="storms" stroke="#3b82f6" strokeWidth={2} name="Storms" style={{ cursor: 'pointer' }} />
                <Line type="monotone" dataKey="floods" stroke="#06b6d4" strokeWidth={2} name="Floods" style={{ cursor: 'pointer' }} />
                <Line type="monotone" dataKey="wildfires" stroke="#dc2626" strokeWidth={2} name="Wildfires" style={{ cursor: 'pointer' }} />
              </LineChart>
            </ResponsiveContainer>
          </>
        );

      case 'source':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={sourceData} layout="vertical" margin={{ left: 20 }} onClick={(data) => handleChartClick(data, 'source')}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number" 
                stroke="#9ca3af"
                allowDecimals={false}
                domain={[0, 'dataMax']}
              />
              <YAxis 
                dataKey="source" 
                type="category" 
                stroke="#9ca3af" 
                width={180}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#e5e7eb'
                }}
                itemStyle={{
                  color: '#e5e7eb'
                }}
                labelStyle={{
                  color: '#f3f4f6',
                  fontWeight: '600'
                }}
                formatter={(value: any) => [`${value} - Click to view details`, 'Count']}
                cursor={{ fill: 'rgba(96, 165, 250, 0.1)' }}
              />
              <Bar 
                dataKey="count" 
                fill="#60a5fa" 
                radius={[0, 8, 8, 0]}
                minPointSize={3}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (!isExpanded) {
    return (
      <div className="charts-panel-collapsed">
        <button
          className="expand-button"
          onClick={() => setIsExpanded(true)}
          title="Expand Analytics"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Analytics</span>
        </button>
      </div>
    );
  }

  return (
    <div className="charts-panel">
      <div className="charts-header">
        <div className="charts-title">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          <h3>Data Analytics</h3>
        </div>
        <button
          className="collapse-button"
          onClick={() => setIsExpanded(false)}
          title="Collapse"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="chart-tabs">
        <button
          className={`chart-tab ${selectedChart === 'type' ? 'active' : ''}`}
          onClick={() => setSelectedChart('type')}
        >
          Type Distribution
        </button>
        <button
          className={`chart-tab ${selectedChart === 'severity' ? 'active' : ''}`}
          onClick={() => setSelectedChart('severity')}
        >
          Severity
        </button>
        <button
          className={`chart-tab ${selectedChart === 'timeline' ? 'active' : ''}`}
          onClick={() => setSelectedChart('timeline')}
        >
          Timeline (14d)
        </button>
        <button
          className={`chart-tab ${selectedChart === 'source' ? 'active' : ''}`}
          onClick={() => setSelectedChart('source')}
        >
          Data Sources
        </button>
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      <div className="chart-info">
        <p>Total: {hazards.length} hazards | Updated: {new Date().toLocaleTimeString()} | 💡 Click on chart elements for details</p>
      </div>

      <ChartDrilldownModal
        isOpen={drilldownData.isOpen}
        onClose={closeDrilldown}
        title={drilldownData.title}
        filteredHazards={drilldownData.filteredHazards}
        drilldownType={drilldownData.drilldownType}
        drilldownValue={drilldownData.drilldownValue}
      />
    </div>
  );
};

export default ChartsPanel;
