import React from 'react';
import type { Hazard } from '../types';

interface ChartDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filteredHazards: Hazard[];
  drilldownType: 'type' | 'severity' | 'source' | 'date';
  drilldownValue: string;
}

const ChartDrilldownModal: React.FC<ChartDrilldownModalProps> = ({
  isOpen,
  onClose,
  title,
  filteredHazards,
  drilldownType: _,
  drilldownValue,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const formatLocation = (hazard: Hazard) => {
    if (hazard.geometry?.coordinates) {
      const [lng, lat] = hazard.geometry.coordinates;
      return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    }
    return 'Unknown';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'extreme': return '#dc2626';
      case 'severe': return '#f97316';
      case 'moderate': return '#f59e0b';
      case 'minor': return '#eab308';
      default: return '#6b7280';
    }
  };

  return (
    <div className="chart-drilldown-overlay" onClick={onClose}>
      <div className="chart-drilldown-modal" onClick={(e) => e.stopPropagation()}>
        <div className="drilldown-header">
          <div>
            <h3>{title}</h3>
            <p className="drilldown-subtitle">
              {filteredHazards.length} {filteredHazards.length === 1 ? 'hazard' : 'hazards'} found
            </p>
          </div>
          <button className="drilldown-close-btn" onClick={onClose}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="drilldown-filter-info">
          <span className="filter-label">Filter:</span>
          <span className="filter-value">{drilldownValue.replace(/_/g, ' ')}</span>
        </div>

        <div className="drilldown-content">
          {filteredHazards.length === 0 ? (
            <div className="drilldown-empty">
              <p>No hazards match this filter</p>
            </div>
          ) : (
            <div className="drilldown-list">
              {filteredHazards.map((hazard, index) => (
                <div key={`${hazard.id}-${index}`} className="drilldown-item">
                  <div className="drilldown-item-header">
                    <h4>{hazard.title || 'Unknown Hazard'}</h4>
                    <span 
                      className="drilldown-severity-badge"
                      style={{ backgroundColor: getSeverityColor(hazard.severity || 'unknown') }}
                    >
                      {hazard.severity || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="drilldown-item-details">
                    <div className="detail-row">
                      <span className="detail-label">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Type:
                      </span>
                      <span className="detail-value">{hazard.type.replace(/_/g, ' ')}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Location:
                      </span>
                      <span className="detail-value">{formatLocation(hazard)}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Time:
                      </span>
                      <span className="detail-value">{formatDate(hazard.timestamp || '')}</span>
                    </div>

                    <div className="detail-row">
                      <span className="detail-label">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Source:
                      </span>
                      <span className="detail-value">{hazard.source || 'Unknown'}</span>
                    </div>

                    {hazard.description && (
                      <div className="detail-row description-row">
                        <span className="detail-label">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Details:
                        </span>
                        <span className="detail-value description-text">
                          {hazard.description}
                        </span>
                      </div>
                    )}

                    {hazard.magnitude && (
                      <div className="detail-row">
                        <span className="detail-label">
                          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Magnitude:
                        </span>
                        <span className="detail-value magnitude-value">
                          {hazard.magnitude.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="drilldown-footer">
          <div className="drilldown-stats">
            <div className="stat-item">
              <span className="stat-label">Total Hazards:</span>
              <span className="stat-value">{filteredHazards.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Average Severity:</span>
              <span className="stat-value">
                {filteredHazards.length > 0
                  ? (filteredHazards.reduce((acc, h) => {
                      const severity = (h.severity || '').toLowerCase();
                      if (severity === 'extreme') return acc + 4;
                      if (severity === 'severe') return acc + 3;
                      if (severity === 'moderate') return acc + 2;
                      if (severity === 'minor') return acc + 1;
                      return acc;
                    }, 0) / filteredHazards.length).toFixed(1)
                  : 'N/A'}
              </span>
            </div>
          </div>
          <button className="drilldown-action-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartDrilldownModal;
