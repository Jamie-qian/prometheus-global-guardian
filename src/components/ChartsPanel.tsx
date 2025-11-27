import React, { useState } from 'react';
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

const ChartsPanel: React.FC<ChartsPanelProps> = ({ hazards }) => {
  const [selectedChart, setSelectedChart] = useState<ChartType>('type');
  const [isExpanded, setIsExpanded] = useState(true);

  const typeData = getTypeDistribution(hazards);
  const severityData = getSeverityDistribution(hazards);
  const timelineData = getTimeSeriesData(hazards, 14); // Last 14 days
  const sourceData = getSourceDistribution(hazards);

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
            <PieChart>
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
                  `${value} (${props.payload.percentage}%)`,
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
            <BarChart data={severityData}>
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
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'timeline':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
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
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <Legend />
              <Line type="monotone" dataKey="earthquakes" stroke="#ef4444" strokeWidth={2} name="Earthquakes" />
              <Line type="monotone" dataKey="volcanoes" stroke="#f97316" strokeWidth={2} name="Volcanoes" />
              <Line type="monotone" dataKey="storms" stroke="#3b82f6" strokeWidth={2} name="Storms" />
              <Line type="monotone" dataKey="floods" stroke="#06b6d4" strokeWidth={2} name="Floods" />
              <Line type="monotone" dataKey="wildfires" stroke="#dc2626" strokeWidth={2} name="Wildfires" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'source':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sourceData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number" 
                stroke="#9ca3af"
                allowDecimals={false}
                domain={[0, 'dataMax']}
                tickCount={6}
              />
              <YAxis dataKey="source" type="category" stroke="#9ca3af" width={180} />
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
                formatter={(value: any) => [`${value}`, 'Count']}
              />
              <Bar dataKey="count" fill="#60a5fa" radius={[0, 8, 8, 0]} />
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
        <p>Total: {hazards.length} hazards | Updated: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default ChartsPanel;
