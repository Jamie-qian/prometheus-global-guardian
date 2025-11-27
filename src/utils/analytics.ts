import type { Hazard } from '../types';
import { countBy } from 'lodash';
import { formatDistanceToNow, parseISO, subDays, isAfter } from 'date-fns';

export interface HazardStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  averageMagnitude: number;
  maxMagnitude: number;
  minMagnitude: number;
  recentCount: number; // Last 7 days
  mostCommonType: string;
  highestSeverityCount: number;
}

export interface TimeSeriesData {
  date: string;
  count: number;
  earthquakes: number;
  volcanoes: number;
  storms: number;
  floods: number;
  wildfires: number;
  other: number;
}

export interface TypeDistribution {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * 计算基础统计数据
 */
export function calculateHazardStats(hazards: Hazard[]): HazardStats {
  if (!hazards || hazards.length === 0) {
    return {
      total: 0,
      byType: {},
      bySeverity: {},
      averageMagnitude: 0,
      maxMagnitude: 0,
      minMagnitude: 0,
      recentCount: 0,
      mostCommonType: 'N/A',
      highestSeverityCount: 0
    };
  }

  const byType = countBy(hazards, 'type');
  const bySeverity = countBy(hazards, 'severity');

  const magnitudes = hazards
    .filter(h => h.magnitude !== undefined && h.magnitude !== null)
    .map(h => h.magnitude!);

  const averageMagnitude = magnitudes.length > 0
    ? magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length
    : 0;

  const maxMagnitude = magnitudes.length > 0 ? Math.max(...magnitudes) : 0;
  const minMagnitude = magnitudes.length > 0 ? Math.min(...magnitudes) : 0;

  // 计算最近7天的灾害数量
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentCount = hazards.filter(h => {
    if (!h.timestamp) return false;
    try {
      const hazardDate = parseISO(h.timestamp);
      return isAfter(hazardDate, sevenDaysAgo);
    } catch {
      return false;
    }
  }).length;

  // 找出最常见的灾害类型
  const mostCommonType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // 统计高严重程度的灾害
  const highestSeverityCount = (bySeverity['WARNING'] || 0) + (bySeverity['ALERT'] || 0);

  return {
    total: hazards.length,
    byType,
    bySeverity,
    averageMagnitude,
    maxMagnitude,
    minMagnitude,
    recentCount,
    mostCommonType,
    highestSeverityCount
  };
}

/**
 * 获取类型分布数据（用于饼图）
 */
export function getTypeDistribution(hazards: Hazard[]): TypeDistribution[] {
  if (!hazards || hazards.length === 0) return [];

  const byType = countBy(hazards, 'type');
  const total = hazards.length;

  const colorMap: Record<string, string> = {
    EARTHQUAKE: '#ef4444',
    VOLCANO: '#f97316',
    STORM: '#3b82f6',
    FLOOD: '#06b6d4',
    WILDFIRE: '#dc2626',
    DROUGHT: '#f59e0b',
    TSUNAMI: '#0891b2',
    UNKNOWN: '#6b7280'
  };

  return Object.entries(byType)
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
      color: colorMap[type] || '#6b7280'
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 获取时间序列数据（用于折线图）
 */
export function getTimeSeriesData(hazards: Hazard[], days: number = 30): TimeSeriesData[] {
  const result: TimeSeriesData[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = date.toISOString().split('T')[0];

    const dayHazards = hazards.filter(h => {
      if (!h.timestamp) return false;
      try {
        const hazardDate = parseISO(h.timestamp);
        return hazardDate.toISOString().split('T')[0] === dateStr;
      } catch {
        return false;
      }
    });

    result.push({
      date: dateStr,
      count: dayHazards.length,
      earthquakes: dayHazards.filter(h => h.type === 'EARTHQUAKE').length,
      volcanoes: dayHazards.filter(h => h.type === 'VOLCANO').length,
      storms: dayHazards.filter(h => h.type === 'STORM').length,
      floods: dayHazards.filter(h => h.type === 'FLOOD').length,
      wildfires: dayHazards.filter(h => h.type === 'WILDFIRE').length,
      other: dayHazards.filter(h => !['EARTHQUAKE', 'VOLCANO', 'STORM', 'FLOOD', 'WILDFIRE'].includes(h.type)).length
    });
  }

  return result;
}

/**
 * 获取严重程度分布数据（用于柱状图）
 */
export function getSeverityDistribution(hazards: Hazard[]): Array<{ severity: string; count: number; color: string }> {
  if (!hazards || hazards.length === 0) return [];

  const bySeverity = countBy(hazards, h => h.severity || 'UNKNOWN');

  const severityOrder = ['WARNING', 'WATCH', 'ADVISORY', 'ALERT', 'UNKNOWN'];
  const colorMap: Record<string, string> = {
    WARNING: '#dc2626',
    ALERT: '#dc2626',
    WATCH: '#f59e0b',
    ADVISORY: '#3b82f6',
    UNKNOWN: '#6b7280'
  };

  return severityOrder
    .filter(severity => bySeverity[severity])
    .map(severity => ({
      severity,
      count: bySeverity[severity],
      color: colorMap[severity] || '#6b7280'
    }));
}

/**
 * 获取数据源分布
 */
export function getSourceDistribution(hazards: Hazard[]): Array<{ source: string; count: number }> {
  // 定义所有已知的数据源（按固定顺序）
  const allSources = [
    'DisasterAWARE (pmartin1)',
    'DisasterAWARE (amontoro)',
    'DisasterAWARE (achatman)',
    'DisasterAWARE (acollopy)',
    'DisasterAWARE (ssigler)',
    'DisasterAWARE (Automated)'
  ];

  if (!hazards || hazards.length === 0) {
    // 返回所有数据源，count 为 0
    return allSources.map(source => ({ source, count: 0 }));
  }

  const bySource = countBy(hazards, 'source');

  // 返回所有数据源及其计数（包括 count = 0 的）
  return allSources.map(source => ({
    source,
    count: bySource[source] || 0
  }));
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return 'Unknown';
  try {
    return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

/**
 * 计算地理区域统计
 */
export function getGeographicStats(hazards: Hazard[]): Array<{ region: string; count: number }> {
  // 简单的地理区域划分
  const regions = hazards.map(h => {
    const [lng, lat] = h.geometry.coordinates;
    
    if (lat >= 35 && lng >= -125 && lng <= -65) return 'North America';
    if (lat <= 35 && lat >= -60 && lng >= -125 && lng <= -30) return 'South America';
    if (lat >= 35 && lng >= -15 && lng <= 60) return 'Europe';
    if (lat <= 35 && lat >= -35 && lng >= -20 && lng <= 60) return 'Africa';
    if (lat >= 10 && lng >= 60 && lng <= 150) return 'Asia';
    if (lat <= 10 && lat >= -50 && lng >= 110 && lng <= 180) return 'Oceania';
    
    return 'Other';
  });

  const byRegion = countBy(regions);
  
  return Object.entries(byRegion)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate trend comparison - current period vs previous period
 */
export interface TrendComparison {
  current: number;
  previous: number;
  change: number;
  percentChange: number;
  trend: 'up' | 'down' | 'stable';
}

export function getTrendComparison(hazards: Hazard[], days: number = 7): TrendComparison {
  const now = new Date();
  const currentPeriodStart = subDays(now, days);
  const previousPeriodStart = subDays(now, days * 2);
  
  const currentPeriod = hazards.filter(h => {
    if (!h.timestamp) return false;
    try {
      const date = new Date(h.timestamp);
      return !isNaN(date.getTime()) && isAfter(date, currentPeriodStart);
    } catch (e) {
      return false;
    }
  });
  
  const previousPeriod = hazards.filter(h => {
    if (!h.timestamp) return false;
    try {
      const date = new Date(h.timestamp);
      return !isNaN(date.getTime()) && isAfter(date, previousPeriodStart) && date < currentPeriodStart;
    } catch (e) {
      return false;
    }
  });
  
  const current = currentPeriod.length;
  const previous = previousPeriod.length;
  const change = current - previous;
  const percentChange = previous === 0 ? 0 : Math.round((change / previous) * 100);
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(percentChange) >= 10) {
    trend = percentChange > 0 ? 'up' : 'down';
  }
  
  return { current, previous, change, percentChange, trend };
}

/**
 * Get statistical insights
 */
export interface StatisticalInsights {
  mean: number;
  median: number;
  mode: number;
  standardDeviation: number;
  outliers: number;
}

export function getStatisticalInsights(hazards: Hazard[]): StatisticalInsights {
  if (hazards.length === 0) {
    return { mean: 0, median: 0, mode: 0, standardDeviation: 0, outliers: 0 };
  }
  
  // Count hazards by day for statistical analysis
  const dailyCounts: Record<string, number> = {};
  hazards.forEach(h => {
    if (!h.timestamp) return;
    try {
      const date = new Date(h.timestamp);
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        const day = date.toISOString().split('T')[0];
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }
    } catch (e) {
      // Skip invalid dates
      return;
    }
  });
  
  const counts = Object.values(dailyCounts);
  
  // Return zeros if no valid dates found
  if (counts.length === 0) {
    return { mean: 0, median: 0, mode: 0, standardDeviation: 0, outliers: 0 };
  }
  
  // Calculate mean
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  
  // Calculate median
  const sorted = [...counts].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  // Calculate mode
  const frequency: Record<number, number> = {};
  counts.forEach(count => {
    frequency[count] = (frequency[count] || 0) + 1;
  });
  
  // Get mode safely
  const freqKeys = Object.keys(frequency);
  const mode = freqKeys.length > 0 
    ? parseInt(freqKeys.reduce((a, b) => 
        frequency[parseInt(a)] > frequency[parseInt(b)] ? a : b
      ))
    : 0;
  
  // Calculate standard deviation
  const variance = counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / counts.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Count outliers (values > 2 standard deviations from mean)
  const outliers = counts.filter(val => Math.abs(val - mean) > 2 * standardDeviation).length;
  
  return {
    mean: Math.round(mean * 10) / 10,
    median,
    mode,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    outliers
  };
}
