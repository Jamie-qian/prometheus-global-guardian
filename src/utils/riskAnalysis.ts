import type { Hazard } from '../types';
import { countBy } from 'lodash';

export interface RiskScore {
  overall: number;
  level: 'Low' | 'Moderate' | 'High' | 'Critical';
  factors: {
    frequency: number;
    severity: number;
    geographic: number;
  };
}

export interface HighRiskRegion {
  region: string;
  count: number;
  riskLevel: string;
  dominantType: string;
}

/**
 * 计算整体风险评分
 */
export function calculateRiskScore(hazards: Hazard[]): RiskScore {
  if (!hazards || hazards.length === 0) {
    return {
      overall: 0,
      level: 'Low',
      factors: {
        frequency: 0,
        severity: 0,
        geographic: 0
      }
    };
  }

  // 频率因子 (0-100)
  const frequencyScore = Math.min((hazards.length / 50) * 100, 100);

  // 严重程度因子 (0-100)
  const highSeverity = hazards.filter(h => 
    h.severity === 'WARNING' || h.severity === 'ALERT'
  ).length;
  const severityScore = Math.min((highSeverity / hazards.length) * 100, 100);

  // 地理分散因子 (0-100)
  const uniqueLocations = new Set(
    hazards.map(h => `${Math.floor(h.geometry.coordinates[0])},${Math.floor(h.geometry.coordinates[1])}`)
  ).size;
  const geographicScore = Math.min((uniqueLocations / 20) * 100, 100);

  // 综合评分
  const overall = (frequencyScore * 0.4 + severityScore * 0.4 + geographicScore * 0.2);

  let level: 'Low' | 'Moderate' | 'High' | 'Critical';
  if (overall >= 75) level = 'Critical';
  else if (overall >= 50) level = 'High';
  else if (overall >= 25) level = 'Moderate';
  else level = 'Low';

  return {
    overall: Math.round(overall),
    level,
    factors: {
      frequency: Math.round(frequencyScore),
      severity: Math.round(severityScore),
      geographic: Math.round(geographicScore)
    }
  };
}

/**
 * 获取高风险区域
 */
export function getHighRiskRegions(hazards: Hazard[]): HighRiskRegion[] {
  if (!hazards || hazards.length === 0) return [];

  // 按地理区域分组
  const regionMap = new Map<string, Hazard[]>();
  
  hazards.forEach(h => {
    const [lng, lat] = h.geometry.coordinates;
    const region = getRegionName(lng, lat);
    
    if (!regionMap.has(region)) {
      regionMap.set(region, []);
    }
    regionMap.get(region)!.push(h);
  });

  // 计算每个区域的风险
  const regions: HighRiskRegion[] = [];
  
  regionMap.forEach((regionHazards, regionName) => {
    const count = regionHazards.length;
    const highSeverity = regionHazards.filter(h => 
      h.severity === 'WARNING' || h.severity === 'ALERT'
    ).length;
    
    const riskPercentage = (highSeverity / count) * 100;
    let riskLevel: string;
    if (riskPercentage >= 50) riskLevel = 'Critical';
    else if (riskPercentage >= 30) riskLevel = 'High';
    else if (riskPercentage >= 15) riskLevel = 'Moderate';
    else riskLevel = 'Low';

    // 找出主要灾害类型
    const typeCount = countBy(regionHazards, 'type');
    const dominantType = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'UNKNOWN';

    regions.push({
      region: regionName,
      count,
      riskLevel,
      dominantType
    });
  });

  return regions.sort((a, b) => b.count - a.count);
}

/**
 * 根据经纬度获取区域名称
 */
function getRegionName(lng: number, lat: number): string {
  if (lat >= 35 && lng >= -125 && lng <= -65) return 'North America';
  if (lat <= 35 && lat >= -60 && lng >= -125 && lng <= -30) return 'South America';
  if (lat >= 35 && lng >= -15 && lng <= 60) return 'Europe';
  if (lat <= 35 && lat >= -35 && lng >= -20 && lng <= 60) return 'Africa';
  if (lat >= 10 && lng >= 60 && lng <= 150) return 'Asia';
  if (lat <= 10 && lat >= -50 && lng >= 110 && lng <= 180) return 'Oceania';
  if (lat < -60) return 'Antarctica';
  return 'Other Regions';
}

/**
 * 预测未来趋势
 */
export function predictTrend(hazards: Hazard[]): {
  trend: 'Increasing' | 'Stable' | 'Decreasing';
  confidence: number;
} {
  if (hazards.length < 10) {
    return { trend: 'Stable', confidence: 0 };
  }

  // 简单的趋势分析（实际应用中应使用更复杂的算法）
  const recent = hazards.slice(0, Math.floor(hazards.length / 3));
  const older = hazards.slice(-Math.floor(hazards.length / 3));

  const recentAvg = recent.length;
  const olderAvg = older.length;
  const difference = ((recentAvg - olderAvg) / olderAvg) * 100;

  let trend: 'Increasing' | 'Stable' | 'Decreasing';
  if (difference > 10) trend = 'Increasing';
  else if (difference < -10) trend = 'Decreasing';
  else trend = 'Stable';

  const confidence = Math.min(Math.abs(difference), 100);

  return { trend, confidence };
}
