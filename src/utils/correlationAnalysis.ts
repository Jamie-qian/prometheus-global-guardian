import type { Hazard } from '../types';

/**
 * Correlation between hazard types and severity
 */
export interface TypeSeverityCorrelation {
  type: string;
  severityDistribution: {
    extreme: number;
    severe: number;
    moderate: number;
    minor: number;
  };
  averageSeverityScore: number;
}

/**
 * Geographic correlation analysis
 */
export interface GeographicCorrelation {
  region: string;
  dominantType: string;
  dominantSeverity: string;
  hazardCount: number;
  coordinates: { lat: number; lng: number };
}

/**
 * Temporal patterns
 */
export interface TemporalPattern {
  period: string;
  averageCount: number;
  peakType: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Analyze correlation between hazard types and severity levels
 */
export function analyzeTypeSeverityCorrelation(hazards: Hazard[]): TypeSeverityCorrelation[] {
  const typeMap: Record<string, { extreme: number; severe: number; moderate: number; minor: number }> = {};
  
  hazards.forEach(hazard => {
    const type = hazard.type;
    const severity = hazard.severity?.toLowerCase() || 'moderate';
    
    if (!typeMap[type]) {
      typeMap[type] = { extreme: 0, severe: 0, moderate: 0, minor: 0 };
    }
    
    if (severity.includes('extreme')) {
      typeMap[type].extreme++;
    } else if (severity.includes('severe') || severity.includes('high')) {
      typeMap[type].severe++;
    } else if (severity.includes('minor') || severity.includes('low')) {
      typeMap[type].minor++;
    } else {
      typeMap[type].moderate++;
    }
  });
  
  return Object.entries(typeMap).map(([type, distribution]) => {
    const total = distribution.extreme + distribution.severe + distribution.moderate + distribution.minor;
    const score = (
      distribution.extreme * 4 + 
      distribution.severe * 3 + 
      distribution.moderate * 2 + 
      distribution.minor * 1
    ) / total;
    
    return {
      type,
      severityDistribution: distribution,
      averageSeverityScore: Math.round(score * 10) / 10
    };
  }).sort((a, b) => b.averageSeverityScore - a.averageSeverityScore);
}

/**
 * Analyze geographic patterns and correlations
 */
export function analyzeGeographicCorrelation(hazards: Hazard[]): GeographicCorrelation[] {
  const regionMap: Record<string, {
    types: Record<string, number>;
    severities: Record<string, number>;
    coordinates: { lat: number; lng: number; count: number };
  }> = {};
  
  hazards.forEach(hazard => {
    const [lng, lat] = hazard.geometry.coordinates;
    
    // Determine region
    let region = 'Other';
    if (lat >= 35 && lng >= -125 && lng <= -65) region = 'North America';
    else if (lat <= 35 && lat >= -60 && lng >= -125 && lng <= -30) region = 'South America';
    else if (lat >= 35 && lng >= -15 && lng <= 60) region = 'Europe';
    else if (lat <= 35 && lat >= -35 && lng >= -20 && lng <= 60) region = 'Africa';
    else if (lat >= 10 && lng >= 60 && lng <= 150) region = 'Asia';
    else if (lat <= 10 && lat >= -50 && lng >= 110 && lng <= 180) region = 'Oceania';
    
    if (!regionMap[region]) {
      regionMap[region] = {
        types: {},
        severities: {},
        coordinates: { lat: 0, lng: 0, count: 0 }
      };
    }
    
    // Track types
    regionMap[region].types[hazard.type] = (regionMap[region].types[hazard.type] || 0) + 1;
    
    // Track severities
    const severity = hazard.severity || 'moderate';
    regionMap[region].severities[severity] = (regionMap[region].severities[severity] || 0) + 1;
    
    // Average coordinates
    regionMap[region].coordinates.lat += lat;
    regionMap[region].coordinates.lng += lng;
    regionMap[region].coordinates.count++;
  });
  
  return Object.entries(regionMap).map(([region, data]) => {
    const dominantType = Object.entries(data.types)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    
    const dominantSeverity = Object.entries(data.severities)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'moderate';
    
    return {
      region,
      dominantType,
      dominantSeverity,
      hazardCount: data.coordinates.count,
      coordinates: {
        lat: data.coordinates.lat / data.coordinates.count,
        lng: data.coordinates.lng / data.coordinates.count
      }
    };
  }).sort((a, b) => b.hazardCount - a.hazardCount);
}

/**
 * Analyze temporal patterns
 */
export function analyzeTemporalPatterns(hazards: Hazard[]): TemporalPattern[] {
  const now = new Date();
  const patterns: TemporalPattern[] = [];
  
  // Analyze different time periods
  const periods = [
    { name: 'Last 7 days', days: 7 },
    { name: 'Last 30 days', days: 30 },
    { name: 'Last 90 days', days: 90 }
  ];
  
  periods.forEach(({ name, days }) => {
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - days);
    
    const periodHazards = hazards.filter(h => {
      if (!h.timestamp) return false;
      try {
        const date = new Date(h.timestamp);
        return !isNaN(date.getTime()) && date >= periodStart;
      } catch (e) {
        return false;
      }
    });
    
    const typeCount: Record<string, number> = {};
    periodHazards.forEach(h => {
      typeCount[h.type] = (typeCount[h.type] || 0) + 1;
    });
    
    const peakType = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
    
    // Calculate trend (simplified)
    const firstHalf = periodHazards.filter((_, i) => i < periodHazards.length / 2).length;
    const secondHalf = periodHazards.length - firstHalf;
    const trendValue = secondHalf - firstHalf;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (trendValue > periodHazards.length * 0.1) trend = 'increasing';
    else if (trendValue < -periodHazards.length * 0.1) trend = 'decreasing';
    
    patterns.push({
      period: name,
      averageCount: Math.round((periodHazards.length / days) * 10) / 10,
      peakType,
      trend
    });
  });
  
  return patterns;
}

/**
 * Get correlation insights summary
 */
export function getCorrelationInsights(hazards: Hazard[]): string[] {
  const insights: string[] = [];
  
  const typeSeverity = analyzeTypeSeverityCorrelation(hazards);
  const geographic = analyzeGeographicCorrelation(hazards);
  const temporal = analyzeTemporalPatterns(hazards);
  
  // Type-Severity insights
  if (typeSeverity.length > 0) {
    const highestRisk = typeSeverity[0];
    insights.push(
      `${highestRisk.type.replace(/_/g, ' ')} shows the highest severity correlation (${highestRisk.averageSeverityScore}/4.0)`
    );
  }
  
  // Geographic insights
  if (geographic.length > 0) {
    const mostActive = geographic[0];
    insights.push(
      `${mostActive.region} is most affected with ${mostActive.hazardCount} events, dominated by ${mostActive.dominantType.replace(/_/g, ' ')}`
    );
  }
  
  // Temporal insights
  if (temporal.length > 0) {
    const recent = temporal[0];
    insights.push(
      `Recent trend is ${recent.trend} with an average of ${recent.averageCount} events per day`
    );
  }
  
  return insights;
}
