import React, { useState, useMemo, useEffect } from "react";
import StatisticsCard from "./StatisticsCard";
import ChartsPanel from "./ChartsPanel";
import InsightsPanel from "./InsightsPanel";
import ErrorBoundary from "./ErrorBoundary";
import type { Hazard } from "../types";
import { exportToCSV, exportToJSON } from "../utils/dataExport";
import { sampleHazards, shouldSampleData, assessDataQuality } from "../utils/dataSampling";

interface AnalyticsPageProps {
  hazards: Hazard[];
  onClose: () => void;
  onRefresh?: () => void;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ hazards, onClose, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5);
  
  // Intelligent data sampling for large datasets
  const samplingInfo = useMemo(() => shouldSampleData(hazards, 1000), [hazards]);
  
  // Cache processed hazards data with useMemo
  const processedHazards = useMemo(() => {
    return samplingInfo.shouldSample ? sampleHazards(hazards, 1000) : hazards;
  }, [hazards, refreshKey, samplingInfo.shouldSample]);
  
  // Assess data quality
  const dataQuality = useMemo(() => assessDataQuality(hazards), [hazards]);
  
  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const intervalMs = autoRefreshInterval * 60 * 1000; // Convert minutes to milliseconds
    const timer = setInterval(() => {
      handleRefresh();
    }, intervalMs);
    
    return () => clearInterval(timer);
  }, [autoRefreshEnabled, autoRefreshInterval]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    
    // Call parent refresh if provided
    if (onRefresh) {
      onRefresh();
    }
    
    // Simulate refresh animation
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };
  
  const handleExportCSV = () => {
    exportToCSV(processedHazards, `hazards-${new Date().toISOString().split('T')[0]}.csv`);
    setShowExportMenu(false);
  };
  
  const handleExportJSON = () => {
    exportToJSON(processedHazards, `hazards-${new Date().toISOString().split('T')[0]}.json`);
    setShowExportMenu(false);
  };
  
  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>Data Analytics Dashboard</h1>
        <div className="header-actions">
          <div className="export-dropdown">
            <button 
              className="export-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export Data"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Export</span>
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button onClick={handleExportCSV}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export as CSV
                </button>
                <button onClick={handleExportJSON}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  Export as JSON
                </button>
              </div>
            )}
          </div>
          <button 
            className={`settings-btn ${autoRefreshEnabled ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <button 
            className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            title="Refresh Data"
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button className="close-btn" onClick={onClose}>
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>Settings</h3>
            <button onClick={() => setShowSettings(false)} className="settings-close">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="settings-content">
            <div className="setting-group">
              <div className="setting-header">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={autoRefreshEnabled}
                    onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                    className="setting-checkbox"
                  />
                  <span>Auto-refresh data</span>
                </label>
                {autoRefreshEnabled && (
                  <span className="setting-status">Active</span>
                )}
              </div>
              <p className="setting-description">
                Automatically refresh data at regular intervals
              </p>
            </div>

            {autoRefreshEnabled && (
              <div className="setting-group">
                <label className="setting-label">Refresh Interval</label>
                <div className="interval-options">
                  <button
                    className={`interval-btn ${autoRefreshInterval === 5 ? 'active' : ''}`}
                    onClick={() => setAutoRefreshInterval(5)}
                  >
                    5 min
                  </button>
                  <button
                    className={`interval-btn ${autoRefreshInterval === 10 ? 'active' : ''}`}
                    onClick={() => setAutoRefreshInterval(10)}
                  >
                    10 min
                  </button>
                  <button
                    className={`interval-btn ${autoRefreshInterval === 15 ? 'active' : ''}`}
                    onClick={() => setAutoRefreshInterval(15)}
                  >
                    15 min
                  </button>
                  <button
                    className={`interval-btn ${autoRefreshInterval === 30 ? 'active' : ''}`}
                    onClick={() => setAutoRefreshInterval(30)}
                  >
                    30 min
                  </button>
                </div>
                <p className="setting-note">
                  Next refresh in {autoRefreshInterval} minutes
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="analytics-content">
        {/* Data Sampling Notice */}
        {samplingInfo.shouldSample && (
          <div className="data-notice sampling-notice">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{samplingInfo.message}</span>
          </div>
        )}

        {/* Data Quality Alerts */}
        {dataQuality.issues.length > 0 && dataQuality.completeness < 90 && (
          <div className="data-notice quality-notice">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="quality-details">
              <span className="quality-score">Data Quality: {dataQuality.completeness}%</span>
              <ul className="quality-issues">
                {dataQuality.issues.slice(0, 2).map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <ErrorBoundary fallback={<div className="panel-error">Failed to load statistics</div>}>
          <StatisticsCard hazards={processedHazards} />
        </ErrorBoundary>
        
        <ErrorBoundary fallback={<div className="panel-error">Failed to load insights</div>}>
          <InsightsPanel hazards={processedHazards} />
        </ErrorBoundary>
        
        <ErrorBoundary fallback={<div className="panel-error">Failed to load charts</div>}>
          <ChartsPanel hazards={processedHazards} />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default AnalyticsPage;
