/**
 * Python Analytics Service API Client
 * 与 FastAPI 后端通信的客户端
 */

const API_BASE_URL = 'http://localhost:8001';

export interface HazardData {
  id: string;
  type: string;
  title: string;
  coordinates: number[];
  timestamp: string;
  magnitude?: number | null;
  severity?: string;
  source?: string;
  populationExposed?: number | null;
}

export interface AnalysisRequest {
  hazards: HazardData[];
  analysisType?: string;
  timeRange?: number;
}

/**
 * 检查服务健康状态
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

/**
 * 获取服务信息
 */
export async function getServiceInfo(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    if (!response.ok) throw new Error('Failed to fetch service info');
    return await response.json();
  } catch (error) {
    console.error('Service info fetch failed:', error);
    throw error;
  }
}

/**
 * 统计分析
 */
export async function getStatistics(hazards: any[]): Promise<any> {
  try {
    const formattedData = formatHazards(hazards);
    const response = await fetch(`${API_BASE_URL}/api/v1/statistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hazards: formattedData })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Statistics API failed: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Statistics fetch failed:', error);
    throw error;
  }
}

/**
 * 预测分析
 */
export async function getPredictions(hazards: any[], analysisType = 'predictions', timeRange = 30): Promise<any> {
  try {
    const formattedData = formatHazards(hazards);
    const response = await fetch(`${API_BASE_URL}/api/v1/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hazards: formattedData,
        analysisType,
        timeRange
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Predictions API failed: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Predictions fetch failed:', error);
    throw error;
  }
}

/**
 * ETL 数据处理
 */
export async function processETL(hazards: any[]): Promise<any> {
  try {
    const formattedData = formatHazards(hazards);
    const response = await fetch(`${API_BASE_URL}/api/v1/etl/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hazards: formattedData })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ETL API failed: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('ETL processing failed:', error);
    throw error;
  }
}

/**
 * 风险评估
 */
export async function getRiskAssessment(hazards: any[]): Promise<any> {
  try {
    const formattedData = formatHazards(hazards);
    const response = await fetch(`${API_BASE_URL}/api/v1/risk-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hazards: formattedData })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Risk assessment API failed: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Risk assessment failed:', error);
    throw error;
  }
}

/**
 * 综合分析
 */
export async function getComprehensiveAnalysis(hazards: any[], analysisType = 'comprehensive', timeRange = 30): Promise<any> {
  try {
    const formattedData = formatHazards(hazards);
    const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hazards: formattedData,
        analysisType,
        timeRange
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Comprehensive analysis API failed: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Comprehensive analysis failed:', error);
    throw error;
  }
}

/**
 * 格式化灾害数据为 Python API 期望的格式
 */
function formatHazards(hazards: any[]): HazardData[] {
  return hazards.map((h, idx) => ({
    id: String(h.id || `hazard-${idx}-${Date.now()}`),
    type: String(h.type || h.properties?.type || '未分类'),
    title: String(h.properties?.title || h.properties?.description || 'Unknown Event'),
    coordinates: Array.isArray(h.geometry?.coordinates) ? h.geometry.coordinates : [0, 0],
    timestamp: h.properties?.timestamp ? String(h.properties.timestamp) : new Date().toISOString(),
    magnitude: h.properties?.magnitude ? Number(h.properties.magnitude) : null,
    severity: h.properties?.severity ? String(h.properties.severity) : 'unknown',
    source: String(h.properties?.source || 'DisasterAWARE'),
    populationExposed: h.properties?.populationExposed ? Number(h.properties.populationExposed) : null
  }));
}
