import type { Hazard } from '../types';

/**
 * Sample large datasets intelligently to improve performance
 * Uses stratified sampling to maintain data distribution
 */
export function sampleHazards(hazards: Hazard[], maxSamples: number = 1000): Hazard[] {
  if (hazards.length <= maxSamples) {
    return hazards;
  }

  // Calculate sampling rate
  const samplingRate = maxSamples / hazards.length;

  // Group hazards by type for stratified sampling
  const byType: Record<string, Hazard[]> = {};
  hazards.forEach(hazard => {
    if (!byType[hazard.type]) {
      byType[hazard.type] = [];
    }
    byType[hazard.type].push(hazard);
  });

  // Sample from each type proportionally
  const sampledHazards: Hazard[] = [];
  
  Object.entries(byType).forEach(([, typeHazards]) => {
    const sampleSize = Math.max(1, Math.floor(typeHazards.length * samplingRate));
    
    // Use systematic sampling to ensure even distribution
    const step = typeHazards.length / sampleSize;
    for (let i = 0; i < sampleSize; i++) {
      const index = Math.floor(i * step);
      if (index < typeHazards.length) {
        sampledHazards.push(typeHazards[index]);
      }
    }
  });

  // Ensure we include the most recent and highest severity hazards
  const sortedByDate = [...hazards].sort((a, b) => {
    let dateA = 0;
    let dateB = 0;
    
    if (a.timestamp) {
      try {
        const date = new Date(a.timestamp);
        dateA = !isNaN(date.getTime()) ? date.getTime() : 0;
      } catch (e) {
        dateA = 0;
      }
    }
    
    if (b.timestamp) {
      try {
        const date = new Date(b.timestamp);
        dateB = !isNaN(date.getTime()) ? date.getTime() : 0;
      } catch (e) {
        dateB = 0;
      }
    }
    
    return dateB - dateA;
  });
  const recentHazards = sortedByDate.slice(0, Math.min(50, maxSamples * 0.1));

  const highSeverity = hazards
    .filter(h => h.severity === 'extreme' || h.severity === 'severe')
    .slice(0, Math.min(50, maxSamples * 0.1));

  // Combine sampled data with important hazards, removing duplicates
  const combined = [...sampledHazards, ...recentHazards, ...highSeverity];
  const uniqueHazards = Array.from(
    new Map(combined.map(h => [h.id, h])).values()
  );

  return uniqueHazards.slice(0, maxSamples);
}

/**
 * Check if data should be sampled and return appropriate message
 */
export function shouldSampleData(hazards: Hazard[], threshold: number = 1000): {
  shouldSample: boolean;
  message: string;
  sampledCount: number;
} {
  const shouldSample = hazards.length > threshold;
  
  if (!shouldSample) {
    return {
      shouldSample: false,
      message: '',
      sampledCount: hazards.length
    };
  }

  const sampledCount = threshold;
  const message = `Displaying ${sampledCount} of ${hazards.length} hazards for optimal performance. Key recent and severe events are prioritized.`;

  return {
    shouldSample: true,
    message,
    sampledCount
  };
}

/**
 * Calculate data quality metrics
 */
export interface DataQuality {
  completeness: number; // Percentage of complete records
  missingFields: string[];
  duplicates: number;
  timeRange: { start: Date; end: Date } | null;
  issues: string[];
}

export function assessDataQuality(hazards: Hazard[]): DataQuality {
  if (hazards.length === 0) {
    return {
      completeness: 0,
      missingFields: [],
      duplicates: 0,
      timeRange: null,
      issues: ['No data available']
    };
  }

  const issues: string[] = [];
  const missingFieldsCount: Record<string, number> = {};
  
  // Check for missing or incomplete fields
  hazards.forEach(hazard => {
    if (!hazard.title || hazard.title.trim() === '') {
      missingFieldsCount['title'] = (missingFieldsCount['title'] || 0) + 1;
    }
    if (!hazard.description || hazard.description.trim() === '') {
      missingFieldsCount['description'] = (missingFieldsCount['description'] || 0) + 1;
    }
    if (!hazard.source || hazard.source.trim() === '') {
      missingFieldsCount['source'] = (missingFieldsCount['source'] || 0) + 1;
    }
    if (!hazard.severity) {
      missingFieldsCount['severity'] = (missingFieldsCount['severity'] || 0) + 1;
    }
  });

  // Calculate completeness score
  const totalFields = hazards.length * 4; // title, description, source, severity
  const missingCount = Object.values(missingFieldsCount).reduce((a, b) => a + b, 0);
  const completeness = Math.round(((totalFields - missingCount) / totalFields) * 100);

  // Find duplicates
  const ids = hazards.map(h => h.id);
  const duplicates = ids.length - new Set(ids).size;

  // Calculate time range
  const dates = hazards
    .filter(h => h.timestamp)
    .map(h => {
      try {
        const date = new Date(h.timestamp!);
        return !isNaN(date.getTime()) ? date : null;
      } catch (e) {
        return null;
      }
    })
    .filter((d): d is Date => d !== null);
  const timeRange = dates.length > 0 ? {
    start: new Date(Math.min(...dates.map(d => d.getTime()))),
    end: new Date(Math.max(...dates.map(d => d.getTime())))
  } : null;

  // Generate issues list
  if (completeness < 80) {
    issues.push(`Data completeness is ${completeness}% (below recommended 80%)`);
  }
  
  Object.entries(missingFieldsCount).forEach(([field, count]) => {
    if (count > hazards.length * 0.1) {
      issues.push(`${field} is missing in ${count} records (${Math.round(count / hazards.length * 100)}%)`);
    }
  });

  if (duplicates > 0) {
    issues.push(`Found ${duplicates} duplicate records`);
  }

  return {
    completeness,
    missingFields: Object.keys(missingFieldsCount),
    duplicates,
    timeRange,
    issues
  };
}
