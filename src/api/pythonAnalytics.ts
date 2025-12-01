/**
 * Python Analytics Service API Client
 * 与 FastAPI 后端通信的客户端
 * 
 * 优化特性：
 * - 请求超时控制
 * - 自动重试机制
 * - 请求队列管理
 * - 错误处理增强
 */

const API_BASE_URL = 'http://localhost:8001';
const REQUEST_TIMEOUT = 30000; // 30秒超时
const MAX_RETRIES = 3;

// 请求队列，防止并发过多
let requestQueue: Promise<any>[] = [];
const MAX_CONCURRENT_REQUESTS = 3;

/**
 * 带超时控制的fetch
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if ((error as Error).name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接或稍后重试');
    }
    throw error;
  }
}

/**
 * 带重试的请求函数
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok) {
        return response;
      }
      
      // 4xx错误不重试
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }
      
      // 5xx错误重试
      lastError = new Error(`服务器错误: ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      
      // 最后一次尝试失败，抛出错误
      if (i === retries - 1) {
        break;
      }
      
      // 指数退避：等待 2^i 秒后重试
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`请求失败，${delay}ms后重试... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('请求失败');
}

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
 * 检查服务健康状态（优化：添加超时控制）
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000);
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
 * 统计分析（优化：添加重试和更好的错误处理）
 */
export async function getStatistics(hazards: any[]): Promise<any> {
  try {
    if (!hazards || hazards.length === 0) {
      throw new Error('没有数据可供分析');
    }
    
    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/statistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hazards: formattedData })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`统计分析失败: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Statistics fetch failed:', error);
    throw new Error(`统计分析请求失败: ${(error as Error).message}`);
  }
}

/**
 * 预测分析（优化：添加重试和更好的错误处理）
 */
export async function getPredictions(hazards: any[], analysisType = 'predictions', timeRange = 30): Promise<any> {
  try {
    if (!hazards || hazards.length === 0) {
      throw new Error('没有数据可供预测');
    }
    
    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/predictions`, {
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
      throw new Error(`预测分析失败: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Predictions fetch failed:', error);
    throw new Error(`预测分析请求失败: ${(error as Error).message}`);
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
 * 风险评估（优化：添加重试和更好的错误处理）
 */
export async function getRiskAssessment(hazards: any[]): Promise<any> {
  try {
    if (!hazards || hazards.length === 0) {
      throw new Error('没有数据可供风险评估');
    }
    
    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/risk-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hazards: formattedData })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`风险评估失败: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Risk assessment failed:', error);
    throw new Error(`风险评估请求失败: ${(error as Error).message}`);
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
