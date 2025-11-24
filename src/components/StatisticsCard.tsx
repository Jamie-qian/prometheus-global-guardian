import React from 'react';
import type { Hazard } from '../types';
import { calculateHazardStats } from '../utils/analytics';

interface StatisticsCardProps {
  hazards: Hazard[];
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({ hazards }) => {
  const stats = calculateHazardStats(hazards);

  return (
    <div className="statistics-card">
      <div className="statistics-header">
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3>Statistics Overview</h3>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Total Hazards</div>
          <div className="stat-value">{stats.total}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Last 7 Days</div>
          <div className="stat-value stat-recent">{stats.recentCount}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">High Severity</div>
          <div className="stat-value stat-warning">{stats.highestSeverityCount}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Most Common</div>
          <div className="stat-value stat-type">{formatType(stats.mostCommonType)}</div>
        </div>

        {stats.averageMagnitude > 0 && (
          <>
            <div className="stat-item">
              <div className="stat-label">Avg Magnitude</div>
              <div className="stat-value">{stats.averageMagnitude.toFixed(1)}</div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Max Magnitude</div>
              <div className="stat-value stat-max">{stats.maxMagnitude.toFixed(1)}</div>
            </div>
          </>
        )}
      </div>

      <div className="type-breakdown">
        <h4>By Type</h4>
        <div className="type-list">
          {Object.entries(stats.byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => (
              <div key={type} className="type-row">
                <span className="type-name">{formatType(type)}</span>
                <span className="type-count">{count}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

function formatType(type: string): string {
  const typeMap: Record<string, string> = {
    'EARTHQUAKE': 'Earthquake',
    'VOLCANO': 'Volcano',
    'STORM': 'Storm',
    'FLOOD': 'Flood',
    'WILDFIRE': 'Wildfire',
    'DROUGHT': 'Drought',
    'TSUNAMI': 'Tsunami',
    'N/A': 'N/A'
  };
  return typeMap[type] || type;
}

export default StatisticsCard;
