import type { Hazard } from '../types';
import { getGeographicStats } from './analytics';

export interface RiskScore {
  overall: number; // 0-100
  severity: number;
  frequency: number;
  impact: number;
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface HazardCluster {
  center: [number, number];
  hazards: Hazard[];
  count: number;
  radius: number;
  averageSeverity: string;
}

export interface TrendAnalysis {
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  changePercent: number;
  prediction: string;
}

/**
 * 计算风险评分
 */
export function calculateRiskScore(hazards: Hazard[]): RiskScore {
  if (!hazards || hazards.length === 0) {
    return {
      overall: 0,
      severity: 0,
      frequency: 0,
      impact: 0,
      level: 'LOW',
      description: 'No active hazards detected'
    };
  }

  // 1. 严重程度评分 (0-100)
  const severityWeights: Record<string, number> = {
    'WARNING': 100,
    'ALERT': 100,
    'WATCH': 70,
    'ADVISORY': 40,
    'UNKNOWN': 20
  };

  const severityScore = hazards.reduce((sum, h) => {
    return sum + (severityWeights[h.severity || 'UNKNOWN'] || 20);
  }, 0) / hazards.length;

  // 2. 频率评分 (基于数量)
  const frequencyScore = Math.min(100, (hazards.length / 50) * 100);

  // 3. 影响评分 (基于震级和类型)
  const impactWeights: Record<string, number> = {
    'EARTHQUAKE': 90,
    'TSUNAMI': 95,
    'VOLCANO': 85,
    'TROPICAL_CYCLONE': 80,
    'FLOOD': 70,
    'STORM': 65,
    'WILDFIRE': 75,
    'DROUGHT': 60,
    'UNKNOWN': 50
  };

  let impactScore = hazards.reduce((sum, h) => {
    const baseScore = impactWeights[h.type] || 50;
    const magnitudeBonus = h.magnitude ? (h.magnitude / 10) * 20 : 0;
    return sum + baseScore + magnitudeBonus;
  }, 0) / hazards.length;

  impactScore = Math.min(100, impactScore);

  // 4. 综合评分
  const overall = (severityScore * 0.4 + frequencyScore * 0.3 + impactScore * 0.3);

  // 5. 风险等级
  let level: RiskScore['level'];
  let description: string;

  if (overall >= 80) {
    level = 'CRITICAL';
    description = 'Multiple high-severity hazards detected. Immediate action required.';
  } else if (overall >= 60) {
    level = 'HIGH';
    description = 'Significant hazard activity. Close monitoring recommended.';
  } else if (overall >= 40) {
    level = 'MODERATE';
    description = 'Moderate hazard activity. Stay informed and prepared.';
  } else {
    level = 'LOW';
    description = 'Low hazard activity. Continue routine monitoring.';
  }

  return {
    overall: Math.round(overall),
    severity: Math.round(severityScore),
    frequency: Math.round(frequencyScore),
    impact: Math.round(impactScore),
    level,
    description
  };
}

/**
 * 地理聚类分析
 */
export function clusterHazards(hazards: Hazard[], radiusKm: number = 500): HazardCluster[] {
  if (!hazards || hazards.length === 0) return [];

  const clusters: HazardCluster[] = [];
  const processed = new Set<string>();

  hazards.forEach(hazard => {
    if (processed.has(hazard.id)) return;

    const [lng, lat] = hazard.geometry.coordinates;
    const nearby: Hazard[] = [hazard];
    processed.add(hazard.id);

    // Find nearby hazards
    hazards.forEach(other => {
      if (processed.has(other.id)) return;
      
      const [lng2, lat2] = other.geometry.coordinates;
      const distance = calculateDistance(lat, lng, lat2, lng2);

      if (distance <= radiusKm) {
        nearby.push(other);
        processed.add(other.id);
      }
    });

    // Calculate cluster center
    const avgLng = nearby.reduce((sum, h) => sum + h.geometry.coordinates[0], 0) / nearby.length;
    const avgLat = nearby.reduce((sum, h) => sum + h.geometry.coordinates[1], 0) / nearby.length;

    // Calculate average severity
    const severityMap: Record<string, number> = {
      'WARNING': 4,
      'ALERT': 4,
      'WATCH': 3,
      'ADVISORY': 2,
      'UNKNOWN': 1
    };

    const avgSeverityValue = nearby.reduce((sum, h) => {
      return sum + (severityMap[h.severity || 'UNKNOWN'] || 1);
    }, 0) / nearby.length;

    let averageSeverity: string;
    if (avgSeverityValue >= 3.5) averageSeverity = 'WARNING';
    else if (avgSeverityValue >= 2.5) averageSeverity = 'WATCH';
    else if (avgSeverityValue >= 1.5) averageSeverity = 'ADVISORY';
    else averageSeverity = 'UNKNOWN';

    clusters.push({
      center: [avgLng, avgLat],
      hazards: nearby,
      count: nearby.length,
      radius: radiusKm,
      averageSeverity
    });
  });

  return clusters.sort((a, b) => b.count - a.count);
}

/**
 * 计算两点之间的距离 (km)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 趋势分析 (需要历史数据，这里做简化处理)
 */
export function analyzeTrend(currentHazards: Hazard[], previousCount: number = 0): TrendAnalysis {
  const currentCount = currentHazards.length;
  
  if (previousCount === 0) {
    return {
      trend: 'STABLE',
      changePercent: 0,
      prediction: 'Insufficient historical data for trend analysis'
    };
  }

  const changePercent = ((currentCount - previousCount) / previousCount) * 100;

  let trend: TrendAnalysis['trend'];
  let prediction: string;

  if (changePercent > 20) {
    trend = 'INCREASING';
    prediction = `Hazard activity increased by ${Math.abs(changePercent).toFixed(1)}%. Expect continued elevated activity.`;
  } else if (changePercent < -20) {
    trend = 'DECREASING';
    prediction = `Hazard activity decreased by ${Math.abs(changePercent).toFixed(1)}%. Conditions may be improving.`;
  } else {
    trend = 'STABLE';
    prediction = `Hazard activity is stable (${Math.abs(changePercent).toFixed(1)}% change). Continue monitoring.`;
  }

  return {
    trend,
    changePercent: Math.round(changePercent * 10) / 10,
    prediction
  };
}

/**
 * 获取最高风险区域
 */
export function getHighRiskRegions(hazards: Hazard[]): Array<{ region: string; score: number; count: number }> {
  const regions = getGeographicStats(hazards);
  
  return regions.map(r => {
    const regionHazards = hazards.filter(h => {
      const [lng, lat] = h.geometry.coordinates;
      // Simple region matching (same logic as in analytics.ts)
      if (r.region === 'North America' && lat >= 35 && lng >= -125 && lng <= -65) return true;
      if (r.region === 'South America' && lat <= 35 && lat >= -60 && lng >= -125 && lng <= -30) return true;
      if (r.region === 'Europe' && lat >= 35 && lng >= -15 && lng <= 60) return true;
      if (r.region === 'Africa' && lat <= 35 && lat >= -35 && lng >= -20 && lng <= 60) return true;
      if (r.region === 'Asia' && lat >= 10 && lng >= 60 && lng <= 150) return true;
      if (r.region === 'Oceania' && lat <= 10 && lat >= -50 && lng >= 110 && lng <= 180) return true;
      return r.region === 'Other';
    });

    const riskScore = calculateRiskScore(regionHazards);
    
    return {
      region: r.region,
      score: riskScore.overall,
      count: r.count
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * 预测高发时段 (简化版本)
 */
export function predictHighActivityPeriod(hazards: Hazard[]): string {
  const hourCounts = new Array(24).fill(0);
  
  hazards.forEach(h => {
    if (!h.timestamp) return;
    try {
      const date = new Date(h.timestamp);
      const hour = date.getHours();
      hourCounts[hour]++;
    } catch {
      // ignore invalid dates
    }
  });

  const maxCount = Math.max(...hourCounts);
  const peakHour = hourCounts.indexOf(maxCount);

  if (maxCount === 0) {
    return 'Insufficient time data for activity pattern analysis';
  }

  return `Peak activity typically occurs around ${peakHour}:00 UTC based on current data`;
}
