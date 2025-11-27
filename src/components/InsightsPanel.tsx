import React from 'react';
import type { Hazard } from '../types';
import {
  calculateRiskScore,
  clusterHazards,
  getHighRiskRegions,
  predictHighActivityPeriod
} from '../utils/advancedAnalytics';
import { getTrendComparison, getStatisticalInsights } from '../utils/analytics';
import { 
  analyzeTypeSeverityCorrelation, 
  analyzeGeographicCorrelation,
  getCorrelationInsights 
} from '../utils/correlationAnalysis';

interface InsightsPanelProps {
  hazards: Hazard[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ hazards }) => {
  const riskScore = calculateRiskScore(hazards);
  const clusters = clusterHazards(hazards, 500).slice(0, 3); // Top 3 clusters
  const highRiskRegions = getHighRiskRegions(hazards).slice(0, 3); // Top 3 regions
  const activityPrediction = predictHighActivityPeriod(hazards);
  const trend = getTrendComparison(hazards, 7);
  const stats = getStatisticalInsights(hazards);
  
  // Correlation analysis
  const typeSeverityCorr = analyzeTypeSeverityCorrelation(hazards).slice(0, 3);
  const geographicCorr = analyzeGeographicCorrelation(hazards).slice(0, 3);
  const correlationInsights = getCorrelationInsights(hazards);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#f59e0b';
      case 'MODERATE': return '#3b82f6';
      case 'LOW': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#dc2626';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#3b82f6';
    return '#10b981';
  };

  if (hazards.length === 0) {
    return (
      <div className="insights-panel">
        <div className="insights-header">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3>AI Insights</h3>
        </div>
        <p className="insights-empty">No hazard data available for analysis</p>
      </div>
    );
  }

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3>AI Insights</h3>
      </div>

      {/* Risk Score */}
      <div className="insight-section">
        <h4>Overall Risk Assessment</h4>
        <div className="risk-score-container">
          <div className="risk-score-circle" style={{ borderColor: getRiskColor(riskScore.level) }}>
            <span className="risk-score-value" style={{ color: getRiskColor(riskScore.level) }}>
              {riskScore.overall}
            </span>
            <span className="risk-score-label">{riskScore.level}</span>
          </div>
          <div className="risk-breakdown">
            <div className="risk-metric">
              <span className="metric-label">Severity</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ width: `${riskScore.severity}%`, backgroundColor: getScoreColor(riskScore.severity) }}
                />
              </div>
              <span className="metric-value">{riskScore.severity}/100</span>
            </div>
            <div className="risk-metric">
              <span className="metric-label">Frequency</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ width: `${riskScore.frequency}%`, backgroundColor: getScoreColor(riskScore.frequency) }}
                />
              </div>
              <span className="metric-value">{riskScore.frequency}/100</span>
            </div>
            <div className="risk-metric">
              <span className="metric-label">Impact</span>
              <div className="metric-bar">
                <div 
                  className="metric-fill" 
                  style={{ width: `${riskScore.impact}%`, backgroundColor: getScoreColor(riskScore.impact) }}
                />
              </div>
              <span className="metric-value">{riskScore.impact}/100</span>
            </div>
          </div>
        </div>
        <p className="risk-description">{riskScore.description}</p>
      </div>

      {/* High Risk Regions */}
      {highRiskRegions.length > 0 && (
        <div className="insight-section">
          <h4>High Risk Regions</h4>
          <div className="region-list">
            {highRiskRegions.map((region, index) => (
              <div key={index} className="region-item">
                <div className="region-info">
                  <span className="region-name">{region.region}</span>
                  <span className="region-count">{region.count} hazards</span>
                </div>
                <div className="region-score" style={{ color: getScoreColor(region.score) }}>
                  {region.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clusters */}
      {clusters.length > 0 && (
        <div className="insight-section">
          <h4>Hazard Clusters</h4>
          <div className="cluster-list">
            {clusters.map((cluster, index) => (
              <div key={index} className="cluster-item">
                <div className="cluster-badge">{cluster.count}</div>
                <div className="cluster-info">
                  <span className="cluster-location">
                    {cluster.center[1].toFixed(2)}°, {cluster.center[0].toFixed(2)}°
                  </span>
                  <span className="cluster-severity">Avg: {cluster.averageSeverity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Pattern */}
      <div className="insight-section">
        <h4>Activity Pattern</h4>
        <p className="activity-info">{activityPrediction}</p>
      </div>

      {/* Trend Comparison */}
      <div className="insight-section">
        <h4>7-Day Trend</h4>
        <div className="trend-comparison">
          <div className="trend-stat">
            <span className="trend-label">Current Period</span>
            <span className="trend-value">{trend.current} hazards</span>
          </div>
          <div className="trend-arrow">
            {trend.trend === 'up' && (
              <svg width="24" height="24" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )}
            {trend.trend === 'down' && (
              <svg width="24" height="24" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            {trend.trend === 'stable' && (
              <svg width="24" height="24" fill="none" stroke="#6b7280" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14" />
              </svg>
            )}
          </div>
          <div className="trend-stat">
            <span className="trend-label">Previous Period</span>
            <span className="trend-value">{trend.previous} hazards</span>
          </div>
        </div>
        <div className="trend-summary" style={{ 
          color: trend.trend === 'up' ? '#ef4444' : trend.trend === 'down' ? '#10b981' : '#9ca3af'
        }}>
          {trend.change > 0 ? '+' : ''}{trend.change} ({trend.percentChange > 0 ? '+' : ''}{trend.percentChange}%)
        </div>
      </div>

      {/* Statistical Insights */}
      <div className="insight-section">
        <h4>Statistical Summary</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Daily Average</span>
            <span className="stat-value">{stats.mean}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Median</span>
            <span className="stat-value">{stats.median}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Std Deviation</span>
            <span className="stat-value">{stats.standardDeviation}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Anomalies</span>
            <span className="stat-value">{stats.outliers}</span>
          </div>
        </div>
      </div>

      {/* Correlation Analysis */}
      <div className="insight-section">
        <h4>Correlation Insights</h4>
        <div className="correlation-insights">
          {correlationInsights.map((insight, i) => (
            <div key={i} className="correlation-insight-item">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Type-Severity Correlation */}
      {typeSeverityCorr.length > 0 && (
        <div className="insight-section">
          <h4>Type-Severity Correlation</h4>
          <div className="correlation-list">
            {typeSeverityCorr.map((corr, i) => (
              <div key={i} className="correlation-item">
                <div className="correlation-header">
                  <span className="correlation-type">{corr.type.replace(/_/g, ' ')}</span>
                  <span className="correlation-score" style={{ 
                    color: corr.averageSeverityScore >= 3 ? '#ef4444' : 
                           corr.averageSeverityScore >= 2.5 ? '#f59e0b' : '#3b82f6' 
                  }}>
                    {corr.averageSeverityScore}/4.0
                  </span>
                </div>
                <div className="severity-breakdown">
                  {corr.severityDistribution.extreme > 0 && (
                    <span className="severity-badge extreme">Extreme: {corr.severityDistribution.extreme}</span>
                  )}
                  {corr.severityDistribution.severe > 0 && (
                    <span className="severity-badge severe">Severe: {corr.severityDistribution.severe}</span>
                  )}
                  {corr.severityDistribution.moderate > 0 && (
                    <span className="severity-badge moderate">Moderate: {corr.severityDistribution.moderate}</span>
                  )}
                  {corr.severityDistribution.minor > 0 && (
                    <span className="severity-badge minor">Minor: {corr.severityDistribution.minor}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geographic Correlation */}
      {geographicCorr.length > 0 && (
        <div className="insight-section">
          <h4>Geographic Patterns</h4>
          <div className="geo-correlation-list">
            {geographicCorr.map((geo, i) => (
              <div key={i} className="geo-correlation-item">
                <div className="geo-header">
                  <span className="geo-region">{geo.region}</span>
                  <span className="geo-count">{geo.hazardCount} events</span>
                </div>
                <div className="geo-details">
                  <span className="geo-detail">
                    <strong>Dominant:</strong> {geo.dominantType.replace(/_/g, ' ')}
                  </span>
                  <span className="geo-detail">
                    <strong>Severity:</strong> {geo.dominantSeverity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
