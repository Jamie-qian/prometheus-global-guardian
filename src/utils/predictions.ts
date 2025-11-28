import type { Hazard } from '../types';

interface PredictionResult {
  type: string;
  currentTrend: 'increasing' | 'decreasing' | 'stable';
  predictedCount: number;
  confidence: number; // 0-100
  trendPercentage: number;
  recommendation: string;
}

interface AggregatedPrediction {
  nextPeriod: string;
  predictions: PredictionResult[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  totalPredicted: number;
}

/**
 * Calculate linear regression for trend prediction
 */
const linearRegression = (xValues: number[], yValues: number[]): { slope: number; intercept: number } => {
  const n = xValues.length;
  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
};

/**
 * Predict future hazard counts by type
 */
export const predictHazardTrends = (hazards: Hazard[], daysBack: number = 30): AggregatedPrediction => {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  // Filter recent hazards
  const recentHazards = hazards.filter(h => {
    try {
      const date = new Date(h.timestamp || '');
      return !isNaN(date.getTime()) && date >= cutoffDate;
    } catch {
      return false;
    }
  });

  // Group by type and calculate daily counts
  const typeData: Record<string, number[]> = {};
  const types = ['earthquake', 'volcano', 'storm', 'flood', 'wildfire'];
  
  types.forEach(type => {
    const dailyCounts: Record<string, number> = {};
    
    // Initialize all days with 0
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(cutoffDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toDateString();
      dailyCounts[dateKey] = 0;
    }
    
    // Count hazards per day
    recentHazards
      .filter(h => h.type.toLowerCase().includes(type))
      .forEach(h => {
        try {
          const date = new Date(h.timestamp || '');
          const dateKey = date.toDateString();
          if (dailyCounts[dateKey] !== undefined) {
            dailyCounts[dateKey]++;
          }
        } catch {
          // Skip invalid dates
        }
      });
    
    typeData[type] = Object.values(dailyCounts);
  });

  // Generate predictions for each type
  const predictions: PredictionResult[] = types.map(type => {
    const counts = typeData[type];
    const xValues = counts.map((_, i) => i);
    const regression = linearRegression(xValues, counts);
    
    // Predict next period (average of next 7 days)
    const nextX = counts.length;
    const predicted = Math.max(0, Math.round(regression.slope * nextX + regression.intercept));
    
    // Calculate trend
    const recentAvg = counts.slice(-7).reduce((sum, v) => sum + v, 0) / 7;
    const olderAvg = counts.slice(0, 7).reduce((sum, v) => sum + v, 0) / 7;
    const trendPercentage = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    
    let currentTrend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(trendPercentage) < 10) {
      currentTrend = 'stable';
    } else if (trendPercentage > 0) {
      currentTrend = 'increasing';
    } else {
      currentTrend = 'decreasing';
    }
    
    // Calculate confidence based on data variance
    const mean = counts.reduce((sum, v) => sum + v, 0) / counts.length;
    const variance = counts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    const confidence = Math.max(20, Math.min(95, 100 - coefficientOfVariation * 50));
    
    // Generate recommendation
    let recommendation = '';
    if (currentTrend === 'increasing' && predicted > recentAvg * 1.2) {
      recommendation = `Significant increase expected. Prepare for ${Math.round(predicted - recentAvg)} more events.`;
    } else if (currentTrend === 'increasing') {
      recommendation = `Moderate increase expected. Monitor closely.`;
    } else if (currentTrend === 'decreasing') {
      recommendation = `Trend declining. Continue monitoring.`;
    } else {
      recommendation = `Activity stable. Maintain current readiness.`;
    }
    
    return {
      type: type.charAt(0).toUpperCase() + type.slice(1),
      currentTrend,
      predictedCount: predicted,
      confidence: Math.round(confidence),
      trendPercentage: Math.round(trendPercentage * 10) / 10,
      recommendation
    };
  });

  // Calculate overall risk
  const totalPredicted = predictions.reduce((sum, p) => sum + p.predictedCount, 0);
  const currentTotal = recentHazards.length;
  const overallChange = currentTotal > 0 ? ((totalPredicted - currentTotal) / currentTotal) : 0;
  
  let overallRisk: 'low' | 'medium' | 'high' | 'critical';
  if (overallChange > 0.3 || totalPredicted > currentTotal * 1.5) {
    overallRisk = 'critical';
  } else if (overallChange > 0.15 || totalPredicted > currentTotal * 1.2) {
    overallRisk = 'high';
  } else if (overallChange > 0 || totalPredicted > currentTotal) {
    overallRisk = 'medium';
  } else {
    overallRisk = 'low';
  }

  return {
    nextPeriod: `Next 7 days`,
    predictions,
    overallRisk,
    totalPredicted
  };
};

/**
 * Generate time series forecast
 */
export const generateForecast = (hazards: Hazard[], daysToForecast: number = 7): { date: string; predicted: number; confidence: number }[] => {
  const now = new Date();
  const last30Days = hazards.filter(h => {
    try {
      const date = new Date(h.timestamp || '');
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return !isNaN(date.getTime()) && date >= cutoff;
    } catch {
      return false;
    }
  });

  // Group by day
  const dailyCounts: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000);
    dailyCounts[date.toDateString()] = 0;
  }

  last30Days.forEach(h => {
    try {
      const date = new Date(h.timestamp || '');
      const key = date.toDateString();
      if (dailyCounts[key] !== undefined) {
        dailyCounts[key]++;
      }
    } catch {
      // Skip
    }
  });

  const counts = Object.values(dailyCounts);
  const xValues = counts.map((_, i) => i);
  const regression = linearRegression(xValues, counts);
  
  // Base confidence level
  const avgConfidence = 70;

  // Generate forecast
  const forecast: { date: string; predicted: number; confidence: number }[] = [];
  for (let i = 1; i <= daysToForecast; i++) {
    const futureX = counts.length + i;
    const predicted = Math.max(0, Math.round(regression.slope * futureX + regression.intercept));
    const confidence = Math.max(30, avgConfidence - i * 5); // Confidence decreases over time
    
    const futureDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    forecast.push({
      date: futureDate.toISOString().split('T')[0],
      predicted,
      confidence
    });
  }

  return forecast;
};
