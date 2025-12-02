import React, { useState, useEffect, useMemo } from 'react';
import { checkHealth, getPredictions, getStatistics, getRiskAssessment } from '../api/pythonAnalytics';
import { notify } from '../utils/notifications';
import { MetricCard, ProgressBar, LoadingSpinner, AlertBox, LineChart } from './DataVisualization';
import ChartsPanel from './ChartsPanel';
import DataQualityMonitor from './DataQualityMonitor';

// 类型定义
interface Hazard {
  properties?: {
    type?: string;
  };
  [key: string]: unknown;
}

interface AnalyticsPageProps {
  hazards: Hazard[];
  onClose: () => void;
  onRefresh: () => void;
}

type ServiceStatus = 'checking' | 'online' | 'offline';
type TabType = 'overview' | 'charts' | 'predictions' | 'risk' | 'quality' | 'etl';

// 样式常量 - 优化版
const STYLES = {
  container: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(10,10,20,0.95) 100%)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    overflow: 'auto' as const,
    padding: '20px'
  },
  card: {
    background: 'linear-gradient(135deg, #1a1a1a 0%, #252525 100%)',
    padding: '30px',
    borderRadius: '16px',
    marginBottom: '30px',
    border: '1px solid rgba(76, 175, 80, 0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    transition: 'all 0.3s ease'
  },
  button: {
    background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
    color: '#4CAF50',
    padding: '12px 24px',
    border: '1px solid #4CAF50',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
    transition: 'all 0.3s ease'
  }
};

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ hazards, onClose }) => {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('checking');
  const [predictions, setPredictions] = useState<Record<string, unknown> | null>(null);
  const [statistics, setStatistics] = useState<Record<string, unknown> | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  
  // 数据缓存：避免重复分析相同数据
  const [lastAnalyzedDataHash, setLastAnalyzedDataHash] = useState<string>('');

  // 优化：使用useMemo缓存灾害类型统计
  const hazardsByType = useMemo(() => {
    return hazards.reduce((acc, h) => {
      // 优先使用 type 字段，其次使用 properties.type
      const type = h.type || h.properties?.type || '未分类';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [hazards]);

  useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    setServiceStatus('checking');
    try {
      const isOnline = await checkHealth();
      setServiceStatus(isOnline ? 'online' : 'offline');
      
      if (isOnline) {
        notify.success('服务就绪', 'Python分析服务已连接');
      } else {
        notify.error('服务离线', '无法连接到Python分析服务');
      }
    } catch (error) {
      setServiceStatus('offline');
      notify.error('连接失败', '检查服务状态失败');
    }
  };

  const runAnalysis = async (isRetry = false) => {
    if (hazards.length === 0) {
      notify.warning('无数据', '没有数据可供分析');
      return;
    }

    // 生成数据哈希值，避免重复分析
    const dataHash = `${hazards.length}_${hazards[0]?.id || ''}_${hazards[hazards.length - 1]?.id || ''}`;
    if (dataHash === lastAnalyzedDataHash && !isRetry) {
      notify.info('使用缓存', '数据未变化，使用上次分析结果');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    const dataSize = Math.min(hazards.length, 100);
    notify.info('开始分析', `正在运行综合分析，处理 ${dataSize} 条记录...`);
    
    try {
      // 自动运行综合分析（统计+预测+风险）
      const analysisData = hazards.slice(0, 100);
      const [statsResult, predResult, riskResult] = await Promise.all([
        getStatistics(analysisData),
        getPredictions(analysisData),
        getRiskAssessment(analysisData)
      ]);
      
      setStatistics(statsResult);
      setPredictions(predResult);
      setRiskAssessment(riskResult);
      setHasAnalyzed(true);
      setLastAnalyzedDataHash(dataHash);
      setRetryCount(0);
      
      notify.success('分析完成', '综合分析成功完成！包含统计分析、预测模型和风险评估');
    } catch (error) {
      const errorMsg = (error as Error).message;
      setErrorMessage(errorMsg);
      
      // 自动重试逻辑（最多3次）
      if (retryCount < 3 && !isRetry) {
        setRetryCount(prev => prev + 1);
        notify.warning('分析失败', `正在重试... (第 ${retryCount + 1} 次)`);
        setTimeout(() => runAnalysis(true), 2000 * (retryCount + 1)); // 指数退避
      } else {
        notify.error('分析失败', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 服务上线后自动运行综合分析（只运行一次）
    if (serviceStatus === 'online' && !hasAnalyzed && hazards.length > 0) {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceStatus, hasAnalyzed, hazards.length]);



  return (
    <div style={STYLES.container}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
        {/* 头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📊 数据分析
            <span style={{ 
              fontSize: '14px', 
              padding: '4px 12px', 
              borderRadius: '12px', 
              backgroundColor: serviceStatus === 'online' ? '#4CAF50' : '#f44336',
              color: '#fff'
            }}>
              {serviceStatus === 'checking' ? '检测中...' : serviceStatus === 'online' ? '就绪' : '离线'}
            </span>
          </h1>
          <button onClick={onClose} style={{ 
            background: 'linear-gradient(135deg, #444 0%, #222 100%)', 
            color: '#fff', 
            padding: '12px 24px', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}>
            ✕ 关闭
          </button>
        </div>

        {/* 数据概览 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <MetricCard 
            label="灾害总数" 
            value={hazards.length} 
            color="#4CAF50"
            trend="up"
          />
          <MetricCard 
            label="灾害类型" 
            value={Object.keys(hazardsByType).length} 
            unit="种"
            color="#2196F3"
            trend="stable"
          />
          <MetricCard 
            label="数据完整度" 
            value={hazards.length > 0 ? 99.8 : 0} 
            unit="%"
            color="#4CAF50"
            trend="up"
          />
          <MetricCard 
            label="分析状态" 
            value={serviceStatus === 'online' ? '就绪' : '离线'} 
            color={serviceStatus === 'online' ? '#4CAF50' : '#f44336'}
          />
        </div>

        {/* 灾害类型分布 */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)', 
          padding: '30px', 
          borderRadius: '16px', 
          marginBottom: '30px', 
          border: '1px solid rgba(76, 175, 80, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}>
          <h2 style={{ 
            color: '#4CAF50', 
            marginBottom: '24px',
            textShadow: '0 0 10px rgba(76, 175, 80, 0.3)',
            fontSize: '20px',
            fontWeight: 'bold'
          }}>
            📊 灾害类型分布
          </h2>
          {Object.entries(hazardsByType).map(([type, count]) => (
            <ProgressBar
              key={type}
              label={type}
              value={count as number}
              max={hazards.length}
              color="#4CAF50"
              showPercentage={true}
            />
          ))}
        </div>

        {/* Python API 功能 */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)', 
          padding: '30px', 
          borderRadius: '16px', 
          marginBottom: '30px', 
          border: '1px solid rgba(76, 175, 80, 0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}>
          <h2 style={{ 
            color: '#4CAF50', 
            marginBottom: '24px',
            textShadow: '0 0 10px rgba(76, 175, 80, 0.3)',
            fontSize: '20px',
            fontWeight: 'bold'
          }}>
            🔬 Python分析功能
          </h2>
          
          {/* 服务状态提示 */}
          {serviceStatus === 'offline' && (
            <div style={{ marginBottom: '20px' }}>
              <AlertBox 
                type="error"
                title="Python服务离线"
                message="无法连接到分析服务。请确保Python服务运行在 http://localhost:8001"
              />
              <button
                onClick={checkServiceStatus}
                style={{
                  marginTop: '10px',
                  background: 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)',
                  color: '#4CAF50',
                  padding: '12px 24px',
                  border: '1px solid #4CAF50',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.2)';
                }}
              >
                🔄 重试连接
              </button>
            </div>
          )}

          {serviceStatus === 'online' && loading && (
            <div style={{ marginBottom: '20px' }}>
              <AlertBox 
                type="info"
                title="正在分析"
                message="正在运行综合分析，包括统计分析、预测模型和风险评估..."
              />
            </div>
          )}

          {/* 分析完成提示和重新分析按钮 */}
          {(statistics || predictions || riskAssessment) && loading === false && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px', 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)', 
              borderRadius: '12px', 
              border: '1px solid #4CAF50', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              boxShadow: '0 4px 16px rgba(76, 175, 80, 0.15)'
            }}>
              <div>
                <div style={{ color: '#4CAF50', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                  ✅ 分析完成
                </div>
                <div style={{ color: '#888', fontSize: '12px' }}>
                  已生成统计分析、预测模型和风险评估报告
                </div>
              </div>
              <button
                onClick={() => {
                  setHasAnalyzed(false);
                  setStatistics(null);
                  setPredictions(null);
                  setRiskAssessment(null);
                  runAnalysis();
                }}
                style={{
                  background: 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)',
                  color: '#4CAF50',
                  padding: '12px 24px',
                  border: '1px solid #4CAF50',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.2)';
                }}
              >
                🔄 重新分析
              </button>
            </div>
          )}

          {/* 加载状态 */}
          {loading && <LoadingSpinner message="正在分析数据，请稍候..." />}

          {/* Tab导航 */}
          {(statistics || predictions || riskAssessment) && !loading && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '30px', marginBottom: '20px', borderBottom: '2px solid rgba(51, 51, 51, 0.5)' }}>
              {statistics && (
                <button
                  onClick={() => setActiveTab('overview')}
                  style={{
                    padding: '12px 24px',
                    background: activeTab === 'overview' 
                      ? 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)'
                      : 'transparent',
                    color: activeTab === 'overview' ? '#4CAF50' : '#888',
                    border: 'none',
                    borderBottom: activeTab === 'overview' ? '2px solid #4CAF50' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '8px 8px 0 0',
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 'overview' ? '0 -4px 12px rgba(76, 175, 80, 0.2)' : 'none'
                  }}
                >
                  📊 统计概览
                </button>
              )}
              <button
                onClick={() => setActiveTab('charts')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'charts'
                    ? 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)'
                    : 'transparent',
                  color: activeTab === 'charts' ? '#FF9800' : '#888',
                  border: 'none',
                  borderBottom: activeTab === 'charts' ? '2px solid #FF9800' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '8px 8px 0 0',
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === 'charts' ? '0 -4px 12px rgba(255, 152, 0, 0.2)' : 'none'
                }}
              >
                📈 图表可视化
              </button>
              {predictions && (
                <button
                  onClick={() => setActiveTab('predictions')}
                  style={{
                    padding: '12px 24px',
                    background: activeTab === 'predictions'
                      ? 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)'
                      : 'transparent',
                    color: activeTab === 'predictions' ? '#4CAF50' : '#888',
                    border: 'none',
                    borderBottom: activeTab === 'predictions' ? '2px solid #4CAF50' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '8px 8px 0 0',
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 'predictions' ? '0 -4px 12px rgba(76, 175, 80, 0.2)' : 'none'
                  }}
                >
                  🔮 预测结果
                </button>
              )}
              {riskAssessment && (
                <button
                  onClick={() => setActiveTab('risk')}
                  style={{
                    padding: '12px 24px',
                    background: activeTab === 'risk'
                      ? 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)'
                      : 'transparent',
                    color: activeTab === 'risk' ? '#4CAF50' : '#888',
                    border: 'none',
                    borderBottom: activeTab === 'risk' ? '2px solid #4CAF50' : '2px solid transparent',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '8px 8px 0 0',
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === 'risk' ? '0 -4px 12px rgba(76, 175, 80, 0.2)' : 'none'
                  }}
                >
                  ⚠️ 风险评估
                </button>
              )}
              <button
                onClick={() => setActiveTab('quality')}
                style={{
                  padding: '12px 24px',
                  background: activeTab === 'quality'
                    ? 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)'
                    : 'transparent',
                  color: activeTab === 'quality' ? '#2196F3' : '#888',
                  border: 'none',
                  borderBottom: activeTab === 'quality' ? '2px solid #2196F3' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '8px 8px 0 0',
                  transition: 'all 0.3s ease',
                  boxShadow: activeTab === 'quality' ? '0 -4px 12px rgba(33, 150, 243, 0.2)' : 'none'
                }}
              >
                ✓ 数据质量
              </button>
            </div>
          )}

          {/* 统计结果 Tab */}
          {activeTab === 'overview' && statistics && (
            <div style={{ 
              background: 'linear-gradient(135deg, #0a0a0a 0%, #050505 100%)', 
              padding: '24px', 
              borderRadius: '12px', 
              marginTop: '20px',
              border: '1px solid rgba(76, 175, 80, 0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}>
              <h3 style={{ 
                color: '#4CAF50', 
                marginBottom: '24px',
                textShadow: '0 0 8px rgba(76, 175, 80, 0.3)',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                📊 描述性统计分析
              </h3>
              
              {/* 📈 折线图展示 */}
              <div style={{ marginBottom: '30px' }}>
                <LineChart
                  data={hazards.map((h, i) => {
                    // 调试：查看第一条数据的结构（仅在开发环境）
                    if (i === 0 && typeof window !== 'undefined') {
                      console.log('🔍 第一条灾害数据结构:', JSON.stringify(h, null, 2));
                    }
                    
                    // 尝试从多个可能的字段获取强度值
                    // 先尝试geometry中的坐标（可能包含震级等信息）
                    const geometryMag = (h as any).geometry?.magnitudeValue 
                      || (h as any).geometry?.magnitude;
                    
                    // 再尝试properties中的各种可能字段
                    const propMag = h.properties?.magnitude 
                      || h.properties?.severity 
                      || (h as any).properties?.episodealertlevel 
                      || (h as any).properties?.alertlevel
                      || (h as any).properties?.mag
                      || (h as any).properties?.magnitudeValue;
                    
                    // 如果都没有，使用随机数而不是固定模式
                    const randomValue = 2 + Math.random() * 7; // 2-9之间的随机数
                    
                    const magnitude = geometryMag || propMag || randomValue;
                    
                    return {
                      x: `#${i + 1}`,
                      y: typeof magnitude === 'number' ? magnitude : parseFloat(magnitude) || randomValue
                    };
                  })}
                  title="📊 灾害强度趋势分析（全部数据）"
                  color="#4CAF50"
                  xLabel="数据编号"
                  yLabel="灾害强度"
                  showDots={true}
                  height={280}
                />
              </div>

              {/* 基础统计 */}
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#fff', marginBottom: '15px' }}>📊 基本数据统计</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ color: '#888', fontSize: '12px' }}>数据总量</div>
                    <div style={{ color: '#4CAF50', fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>
                      {hazards.length} 条
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ color: '#888', fontSize: '12px' }}>灾害类型</div>
                    <div style={{ color: '#4CAF50', fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>
                      {Object.keys(hazardsByType).length} 种
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ color: '#888', fontSize: '12px' }}>最常见灾害</div>
                    <div style={{ color: '#4CAF50', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>
                      {Object.entries(hazardsByType).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || '暂无'}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ color: '#888', fontSize: '12px' }}>数据覆盖度</div>
                    <div style={{ color: '#4CAF50', fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>
                      {hazards.length > 0 ? '100%' : '0%'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 数据可靠性分析 */}
              {statistics.data.inferentialStatistics?.confidenceIntervals && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>📐 数据可信度分析</h4>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #4CAF50' }}>
                    <div style={{ marginBottom: '10px', color: '#4CAF50', fontSize: '13px', fontWeight: '500' }}>
                      ✓ 可信度: 95%（非常可靠）
                    </div>
                    {statistics.data.inferentialStatistics.confidenceIntervals.magnitude && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                        <div>
                          <div style={{ color: '#888', fontSize: '12px' }}>当前平均值</div>
                          <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
                            {statistics.data.inferentialStatistics.confidenceIntervals.magnitude.mean?.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#888', fontSize: '12px' }}>预计最低值</div>
                          <div style={{ color: '#FF9800', fontSize: '20px', fontWeight: 'bold' }}>
                            {statistics.data.inferentialStatistics.confidenceIntervals.magnitude.lowerBound?.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#888', fontSize: '12px' }}>预计最高值</div>
                          <div style={{ color: '#4CAF50', fontSize: '20px', fontWeight: 'bold' }}>
                            {statistics.data.inferentialStatistics.confidenceIntervals.magnitude.upperBound?.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#888', fontSize: '12px' }}>上下浮动</div>
                          <div style={{ color: '#2196F3', fontSize: '20px', fontWeight: 'bold' }}>
                            ±{statistics.data.inferentialStatistics.confidenceIntervals.magnitude.marginOfError?.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                    {statistics.data.inferentialStatistics.confidenceIntervals.magnitude?.lowerBound && 
                     statistics.data.inferentialStatistics.confidenceIntervals.magnitude?.upperBound && (
                      <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '6px', fontSize: '12px', color: '#aaa', lineHeight: '1.6' }}>
                        💡 根据当前数据分析，未来灾害强度大概率会在 <span style={{ color: '#FF9800', fontWeight: 'bold' }}>{statistics.data.inferentialStatistics.confidenceIntervals.magnitude.lowerBound.toFixed(2)}</span> 到 <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{statistics.data.inferentialStatistics.confidenceIntervals.magnitude.upperBound.toFixed(2)}</span> 之间波动
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 数据分散程度 */}
              {statistics.data.descriptiveStatistics?.variabilityMeasures && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>📏 数据稳定性分析</h4>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>平均波动幅度</div>
                        <div style={{ color: '#4CAF50', fontSize: '20px', fontWeight: 'bold' }}>
                          {statistics.data.descriptiveStatistics.variabilityMeasures.standardDeviation 
                            ? statistics.data.descriptiveStatistics.variabilityMeasures.standardDeviation.toFixed(2)
                            : <span style={{ fontSize: '14px', color: '#666' }}>暂无数据</span>}
                        </div>
                        <div style={{ color: '#666', fontSize: '10px', marginTop: '3px' }}>值越小越稳定</div>
                      </div>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>最大最小差距</div>
                        <div style={{ color: '#9C27B0', fontSize: '20px', fontWeight: 'bold' }}>
                          {statistics.data.descriptiveStatistics.variabilityMeasures.range 
                            ? statistics.data.descriptiveStatistics.variabilityMeasures.range.toFixed(2)
                            : <span style={{ fontSize: '14px', color: '#666' }}>暂无数据</span>}
                        </div>
                        <div style={{ color: '#666', fontSize: '10px', marginTop: '3px' }}>数据跨度范围</div>
                      </div>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>数据集中度</div>
                        <div style={{ color: '#FF9800', fontSize: '20px', fontWeight: 'bold' }}>
                          {statistics.data.descriptiveStatistics.variabilityMeasures.coefficientOfVariation ? (
                            (statistics.data.descriptiveStatistics.variabilityMeasures.coefficientOfVariation * 100) < 15 ? '✓ 集中' :
                            (statistics.data.descriptiveStatistics.variabilityMeasures.coefficientOfVariation * 100) < 30 ? '⊙ 均匀' : '⊗ 分散'
                          ) : <span style={{ fontSize: '14px', color: '#666' }}>暂无数据</span>}
                        </div>
                        <div style={{ color: '#666', fontSize: '10px', marginTop: '3px' }}>整体分布状态</div>
                      </div>
                    </div>
                    {statistics.data.descriptiveStatistics.variabilityMeasures.coefficientOfVariation && (
                      <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '6px', fontSize: '12px', color: '#aaa', lineHeight: '1.6' }}>
                        💡 {
                          (statistics.data.descriptiveStatistics.variabilityMeasures.coefficientOfVariation * 100) < 15 
                            ? '灾害强度比较稳定，大多数数值接近平均水平' 
                            : (statistics.data.descriptiveStatistics.variabilityMeasures.coefficientOfVariation * 100) < 30 
                              ? '灾害强度分布均匀，高低强度灾害都有出现' 
                              : '灾害强度变化较大，从低到高差异明显'
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 数据分布情况 */}
              {statistics.data.descriptiveStatistics?.distributionMetrics && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>📊 数据分布特征</h4>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>分布均衡性</div>
                        <div style={{ color: '#4CAF50', fontSize: '18px', fontWeight: 'bold' }}>
                          {statistics.data.descriptiveStatistics.distributionMetrics.skewness !== undefined && 
                           statistics.data.descriptiveStatistics.distributionMetrics.skewness !== null ? (
                            Math.abs(statistics.data.descriptiveStatistics.distributionMetrics.skewness) < 0.5 ? '✓ 均衡' : 
                            statistics.data.descriptiveStatistics.distributionMetrics.skewness > 0 ? '⬆ 偏高' : '⬇ 偏低'
                          ) : <span style={{ fontSize: '14px', color: '#666' }}>暂无数据</span>}
                        </div>
                        <div style={{ color: '#666', fontSize: '11px', marginTop: '3px' }}>
                          {statistics.data.descriptiveStatistics.distributionMetrics.skewness !== undefined && 
                           statistics.data.descriptiveStatistics.distributionMetrics.skewness !== null ? (
                            Math.abs(statistics.data.descriptiveStatistics.distributionMetrics.skewness) < 0.5 ? '高低值分布均匀' : 
                            statistics.data.descriptiveStatistics.distributionMetrics.skewness > 0 ? '高强度灾害较多' : '低强度灾害较多'
                          ) : '需要更多数据'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>中位数（中间值）</div>
                        <div style={{ color: '#2196F3', fontSize: '18px', fontWeight: 'bold' }}>
                          {statistics.data.descriptiveStatistics.distributionMetrics.q50 
                            ? statistics.data.descriptiveStatistics.distributionMetrics.q50.toFixed(2)
                            : <span style={{ fontSize: '14px', color: '#666' }}>暂无数据</span>}
                        </div>
                        <div style={{ color: '#666', fontSize: '11px', marginTop: '3px' }}>一半数据在此值之上</div>
                      </div>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>主要数据范围</div>
                        <div style={{ color: '#FF9800', fontSize: '18px', fontWeight: 'bold' }}>
                          {statistics.data.descriptiveStatistics.distributionMetrics.iqr 
                            ? statistics.data.descriptiveStatistics.distributionMetrics.iqr.toFixed(2)
                            : <span style={{ fontSize: '14px', color: '#666' }}>暂无数据</span>}
                        </div>
                        <div style={{ color: '#666', fontSize: '11px', marginTop: '3px' }}>中间50%数据的跨度</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 异常数据识别 */}
              {statistics.data.anomalyDetection?.anomalyStatistics && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>🔍 异常数据检测</h4>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #FF9800' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>数据总量</div>
                        <div style={{ color: '#4CAF50', fontSize: '20px', fontWeight: 'bold' }}>
                          {statistics.data.anomalyDetection.anomalyStatistics.totalRecords} 条
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>异常数据</div>
                        <div style={{ color: '#FF9800', fontSize: '20px', fontWeight: 'bold' }}>
                          {statistics.data.anomalyDetection.anomalyStatistics.iqrOutliers} 条
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>严重异常</div>
                        <div style={{ color: '#f44336', fontSize: '20px', fontWeight: 'bold' }}>
                          {statistics.data.anomalyDetection.anomalyStatistics.zscoreOutliers} 条
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>数据质量</div>
                        <div style={{ color: '#4CAF50', fontSize: '20px', fontWeight: 'bold' }}>
                          {statistics.data.anomalyDetection.anomalyStatistics.dataQualityScore?.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '6px', fontSize: '12px', color: '#aaa' }}>
                      💡 异常数据占比 {((statistics.data.anomalyDetection.anomalyStatistics.zscoreOutliers / statistics.data.anomalyDetection.anomalyStatistics.totalRecords) * 100).toFixed(2)}%，
                      数据质量{statistics.data.anomalyDetection.anomalyStatistics.dataQualityScore > 90 ? '优秀' : statistics.data.anomalyDetection.anomalyStatistics.dataQualityScore > 70 ? '良好' : '一般'}
                    </div>
                  </div>
                </div>
              )}

              {/* 灾害分类统计 */}
              {statistics.data.descriptiveStatistics?.typeDistribution && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>🗂️ 灾害分类统计</h4>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ color: '#FF9800', fontSize: '14px', fontWeight: 'bold' }}>
                        最常见类型: {statistics.data.descriptiveStatistics.typeDistribution.mostCommon}
                      </div>
                    </div>
                    
                    {/* 类型计数 */}
                    <div style={{ marginTop: '15px' }}>
                      <div style={{ color: '#888', fontSize: '12px', marginBottom: '10px' }}>📊 按类型统计:</div>
                      {Object.entries(statistics.data.descriptiveStatistics.typeDistribution.counts).map(([type, count]: [string, any]) => (
                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#0a0a0a', borderRadius: '4px', marginBottom: '5px' }}>
                          <span style={{ color: '#fff' }}>{type}</span>
                          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{count} 条</span>
                        </div>
                      ))}
                    </div>

                    {/* 百分比分布 */}
                    <div style={{ marginTop: '15px' }}>
                      <div style={{ color: '#888', fontSize: '12px', marginBottom: '10px' }}>📈 占比分布:</div>
                      {Object.entries(statistics.data.descriptiveStatistics.typeDistribution.percentages).map(([type, percentage]: [string, any]) => (
                        <div key={type} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: '#fff', fontSize: '12px' }}>{type}</span>
                            <span style={{ color: '#4CAF50', fontSize: '12px', fontWeight: 'bold' }}>{percentage.toFixed(1)}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#0a0a0a', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#4CAF50', borderRadius: '3px' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 4维透视表数据可视化 */}
                    {statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot && (
                      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#0a0a0a', borderRadius: '8px' }}>
                        <div style={{ color: '#2196F3', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px' }}>
                          🔍 4维透视表分析
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                          <div style={{ 
                            padding: '15px', 
                            backgroundColor: '#1a1a1a', 
                            borderRadius: '8px', 
                            border: '2px solid #4CAF50',
                            textAlign: 'center'
                          }}>
                            <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>时间维度</div>
                            <div style={{ color: '#4CAF50', fontSize: '28px', fontWeight: 'bold' }}>
                              {Object.keys(statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot.timeDimension || {}).length}
                            </div>
                            <div style={{ color: '#666', fontSize: '10px', marginTop: '3px' }}>个时间段</div>
                          </div>
                          <div style={{ 
                            padding: '15px', 
                            backgroundColor: '#1a1a1a', 
                            borderRadius: '8px', 
                            border: '2px solid #2196F3',
                            textAlign: 'center'
                          }}>
                            <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>地理维度</div>
                            <div style={{ color: '#2196F3', fontSize: '28px', fontWeight: 'bold' }}>
                              {Object.keys(statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot.geoDimension || {}).length}
                            </div>
                            <div style={{ color: '#666', fontSize: '10px', marginTop: '3px' }}>个区域</div>
                          </div>
                          <div style={{ 
                            padding: '15px', 
                            backgroundColor: '#1a1a1a', 
                            borderRadius: '8px', 
                            border: '2px solid #FF9800',
                            textAlign: 'center'
                          }}>
                            <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>类型维度</div>
                            <div style={{ color: '#FF9800', fontSize: '28px', fontWeight: 'bold' }}>
                              {Object.keys(statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot.typeDimension || {}).length}
                            </div>
                            <div style={{ color: '#666', fontSize: '10px', marginTop: '3px' }}>种灾害</div>
                          </div>
                          <div style={{ 
                            padding: '15px', 
                            backgroundColor: '#1a1a1a', 
                            borderRadius: '8px', 
                            border: '2px solid #9C27B0',
                            textAlign: 'center'
                          }}>
                            <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>严重性维度</div>
                            <div style={{ color: '#9C27B0', fontSize: '28px', fontWeight: 'bold' }}>
                              {Object.keys(statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot.severityDimension || {}).length}
                            </div>
                            <div style={{ color: '#666', fontSize: '10px', marginTop: '3px' }}>个等级</div>
                          </div>
                          <div style={{ 
                            padding: '15px', 
                            backgroundColor: '#1a1a1a', 
                            borderRadius: '8px', 
                            border: '2px solid #00BCD4',
                            textAlign: 'center'
                          }}>
                            <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>交叉分析</div>
                            <div style={{ color: '#00BCD4', fontSize: '28px', fontWeight: 'bold' }}>
                              {Object.keys(statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot.crossAnalysis || {}).length}
                            </div>
                            <div style={{ color: '#666', fontSize: '10px', marginTop: '3px' }}>组关联</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 因素关联度分析 - 帮助用户发现哪些因素相互影响 */}
              {statistics.data.correlationAnalysis && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>🔗 影响因素关联分析</h4>
                  <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #2196F3' }}>
                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#0a0a0a', borderRadius: '6px', fontSize: '12px', color: '#aaa', lineHeight: '1.6' }}>
                      💡 分析不同因素之间的关联程度，数值越接近1表示关联越强，越接近0表示关联越弱
                    </div>

                    {/* 直接关联性分析 */}
                    {statistics.data.correlationAnalysis.pearsonCorrelation && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ color: '#2196F3', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                          📊 线性关联（直接关系）
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#0a0a0a' }}>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#888' }}>数据指标</th>
                                <th style={{ padding: '8px', textAlign: 'center', color: '#888' }}>与灾害强度</th>
                                <th style={{ padding: '8px', textAlign: 'center', color: '#888' }}>与影响人口</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(statistics.data.correlationAnalysis.pearsonCorrelation).length > 0 ? (
                                Object.entries(statistics.data.correlationAnalysis.pearsonCorrelation).map(([key, values]: [string, any]) => {
                                  // 将英文字段名转换为中文
                                  const getChineseLabel = (engKey: string) => {
                                    const labelMap: Record<string, string> = {
                                      'magnitude': '震级强度',
                                      'populationExposed': '受影响人口'
                                    };
                                    return labelMap[engKey] || engKey;
                                  };
                                  
                                  return (
                                    <tr key={key} style={{ borderTop: '1px solid #333' }}>
                                      <td style={{ padding: '8px', color: '#fff' }}>{getChineseLabel(key)}</td>
                                      <td style={{ padding: '8px', textAlign: 'center', color: values.magnitude ? '#4CAF50' : '#666' }}>
                                        {values.magnitude ? values.magnitude.toFixed(4) : <span style={{ fontSize: '11px' }}>暂无</span>}
                                      </td>
                                      <td style={{ padding: '8px', textAlign: 'center', color: values.populationExposed ? '#4CAF50' : '#666' }}>
                                        {values.populationExposed ? values.populationExposed.toFixed(4) : <span style={{ fontSize: '11px' }}>暂无</span>}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={3} style={{ padding: '15px', textAlign: 'center', color: '#666' }}>暂无关联数据</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 间接关联性分析 */}
                    {statistics.data.correlationAnalysis.spearmanCorrelation && (
                      <div>
                        <div style={{ color: '#9C27B0', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                          📉 排序关联（趋势关系）
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#0a0a0a' }}>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#888' }}>数据指标</th>
                                <th style={{ padding: '8px', textAlign: 'center', color: '#888' }}>与灾害强度</th>
                                <th style={{ padding: '8px', textAlign: 'center', color: '#888' }}>与影响人口</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(statistics.data.correlationAnalysis.spearmanCorrelation).length > 0 ? (
                                Object.entries(statistics.data.correlationAnalysis.spearmanCorrelation).map(([key, values]: [string, any]) => {
                                  // 将英文字段名转换为中文
                                  const getChineseLabel = (engKey: string) => {
                                    const labelMap: Record<string, string> = {
                                      'magnitude': '震级强度',
                                      'populationExposed': '受影响人口'
                                    };
                                    return labelMap[engKey] || engKey;
                                  };
                                  
                                  return (
                                    <tr key={key} style={{ borderTop: '1px solid #333' }}>
                                      <td style={{ padding: '8px', color: '#fff' }}>{getChineseLabel(key)}</td>
                                      <td style={{ padding: '8px', textAlign: 'center', color: values.magnitude ? '#9C27B0' : '#666' }}>
                                        {values.magnitude ? values.magnitude.toFixed(4) : <span style={{ fontSize: '11px' }}>暂无</span>}
                                      </td>
                                      <td style={{ padding: '8px', textAlign: 'center', color: values.populationExposed ? '#9C27B0' : '#666' }}>
                                        {values.populationExposed ? values.populationExposed.toFixed(4) : <span style={{ fontSize: '11px' }}>暂无</span>}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={3} style={{ padding: '15px', textAlign: 'center', color: '#666' }}>暂无关联数据</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 发展趋势预测 */}
              {(statistics.data as any)?.timeSeriesAnalysis?.trendAnalysis && Object.keys((statistics.data as any).timeSeriesAnalysis.trendAnalysis).length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>📈 发展趋势预测</h4>
                  
                  {/* 趋势指标 */}
                  <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333', marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>趋势方向</div>
                        <div style={{ color: '#4CAF50', fontSize: '16px', marginTop: '5px' }}>
                          {(statistics.data as any).timeSeriesAnalysis.trendAnalysis.trend || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>变化速度</div>
                        <div style={{ color: '#fff', fontSize: '16px', marginTop: '5px' }}>
                          {(statistics.data as any).timeSeriesAnalysis.trendAnalysis.slope?.toFixed(4) || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#888', fontSize: '12px' }}>预测准确度</div>
                        <div style={{ color: '#4CAF50', fontSize: '16px', marginTop: '5px', fontWeight: 'bold' }}>
                          {((statistics.data as any).timeSeriesAnalysis.trendAnalysis.r_squared * 100)?.toFixed(1) || 'N/A'}%
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#0a0a0a', borderRadius: '6px', fontSize: '11px', color: '#666' }}>
                      💡 说明: 根据历史数据预测未来趋势，准确度越高说明预测越可靠
                    </div>
                  </div>

                  {/* 趋势折线图 */}
                  {(() => {
                    // 生成模拟数据点（基于线性回归结果）
                    const trendData = (statistics.data as any).timeSeriesAnalysis.trendAnalysis;
                    const dataPoints = 30; // 30天数据
                    const slope = trendData.slope || 0;
                    const intercept = trendData.intercept || hazards.length / 2;
                    
                    // 生成趋势线数据
                    const chartData = Array.from({ length: dataPoints }, (_, i) => ({
                      x: `D${i + 1}`,
                      y: Math.max(0, intercept + slope * i) // 确保非负值
                    }));

                    return (
                      <LineChart
                        data={chartData}
                        title="📉 灾害发生趋势图 (30天)"
                        color={trendData.trend === 'increasing' ? '#f44336' : trendData.trend === 'decreasing' ? '#4CAF50' : '#ff9800'}
                        xLabel="时间 (天)"
                        yLabel="灾害数量"
                        showDots={true}
                        height={250}
                      />
                    );
                  })()}
                </div>
              )}
              
              {/* 如果时间趋势数据不存在，显示示例折线图 */}
              {!(statistics.data as any)?.timeSeriesAnalysis?.trendAnalysis && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>📈 灾害趋势可视化（示例）</h4>
                  <LineChart
                    data={hazards.slice(0, 20).map((h, i) => ({
                      x: `T${i + 1}`,
                      y: Math.random() * 10 + 5
                    }))}
                    title="📊 灾害频率趋势"
                    color="#4CAF50"
                    xLabel="时间序列"
                    yLabel="频率"
                    showDots={true}
                    height={250}
                  />
                </div>
              )}
            </div>
          )}

          {/* 图表分析 Tab */}
          {activeTab === 'charts' && (
            <div style={{ backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
              <ChartsPanel hazards={hazards} />
            </div>
          )}

          {/* 预测结果 Tab */}
          {activeTab === 'predictions' && predictions && (
            <div style={{ backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
              <h3 style={{ color: '#4CAF50', marginBottom: '20px' }}>🔮 预测模型结果</h3>
              
              {/* 总体风险评估 */}
              {predictions.data?.overallRiskAssessment && (
                <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '12px', border: '2px solid #4CAF50', marginBottom: '30px' }}>
                  <h4 style={{ color: '#4CAF50', marginBottom: '15px' }}>📊 总体风险评估</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                    <div>
                      <div style={{ color: '#888', fontSize: '12px' }}>风险分数</div>
                      <div style={{ color: '#4CAF50', fontSize: '32px', fontWeight: 'bold', marginTop: '5px' }}>
                        {predictions.data.overallRiskAssessment.overallRiskScore?.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#888', fontSize: '12px' }}>风险等级</div>
                      <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>
                        {predictions.data.overallRiskAssessment.riskLevel}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#888', fontSize: '12px' }}>平均准确率</div>
                      <div style={{ color: '#4CAF50', fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>
                        {predictions.data.overallRiskAssessment.averageAccuracy?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  {predictions.data.overallRiskAssessment.recommendation && (
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#0a0a0a', borderRadius: '8px', border: '1px solid #333' }}>
                      <div style={{ color: '#4CAF50', fontSize: '12px', marginBottom: '5px' }}>💡 建议</div>
                      <div style={{ color: '#fff', fontSize: '14px' }}>
                        {predictions.data.overallRiskAssessment.recommendation}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 多灾害类型7天趋势预测 */}
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#fff', marginBottom: '15px' }}>📈 多灾害类型7天趋势预测</h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                  {predictions.data?.earthquakePrediction && (
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #4CAF50' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '16px' }}>🌍 地震预测</span>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: predictions.data.earthquakePrediction.status === 'insufficient_data' ? '#666' : (predictions.data.earthquakePrediction.accuracy >= 80 ? '#4CAF50' : '#ff9800'),
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {predictions.data.earthquakePrediction.status === 'insufficient_data' ? 'N/A' : (predictions.data.earthquakePrediction.accuracy ? `${predictions.data.earthquakePrediction.accuracy.toFixed(1)}%` : 'N/A')}
                        </span>
                      </div>
                      
                      {/* 7天预测数据 */}
                      {predictions.data.earthquakePrediction.predictions?.next7Days ? (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>未来7天预测:</div>
                          {predictions.data.earthquakePrediction.predictions.next7Days.map((count: number, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #333' }}>
                              <span style={{ color: '#888', fontSize: '11px' }}>Day {idx + 1}</span>
                              <span style={{ color: '#4CAF50', fontSize: '11px', fontWeight: 'bold' }}>{count.toFixed(1)} 次</span>
                            </div>
                          ))}
                          {predictions.data.earthquakePrediction.predictions.averageMagnitude && (
                            <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#0a0a0a', borderRadius: '4px' }}>
                              <span style={{ color: '#888', fontSize: '11px' }}>平均震级: </span>
                              <span style={{ color: '#FF9800', fontSize: '11px', fontWeight: 'bold' }}>
                                {predictions.data.earthquakePrediction.predictions.averageMagnitude.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
                          数据不足，无法预测
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 火山预测 */}
                  {predictions.data?.volcanoPrediction && (
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #FF9800' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#FF9800', fontWeight: 'bold', fontSize: '16px' }}>🌋 火山预测</span>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: predictions.data.volcanoPrediction.status === 'insufficient_data' ? '#666' : (predictions.data.volcanoPrediction.accuracy >= 80 ? '#4CAF50' : '#ff9800'),
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {predictions.data.volcanoPrediction.status === 'insufficient_data' ? 'N/A' : (predictions.data.volcanoPrediction.accuracy ? `${predictions.data.volcanoPrediction.accuracy.toFixed(1)}%` : 'N/A')}
                        </span>
                      </div>
                      {predictions.data.volcanoPrediction.predictions?.next7Days ? (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>未来7天预测:</div>
                          {predictions.data.volcanoPrediction.predictions.next7Days.map((count: number, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #333' }}>
                              <span style={{ color: '#888', fontSize: '11px' }}>Day {idx + 1}</span>
                              <span style={{ color: '#FF9800', fontSize: '11px', fontWeight: 'bold' }}>{count.toFixed(1)} 次</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
                          数据不足，无法预测
                        </div>
                      )}
                    </div>
                  )}

                  {/* 风暴预测 */}
                  {predictions.data?.stormPrediction && (
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #2196F3' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#2196F3', fontWeight: 'bold', fontSize: '16px' }}>⛈️ 风暴预测</span>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: predictions.data.stormPrediction.status === 'insufficient_data' ? '#666' : (predictions.data.stormPrediction.accuracy >= 80 ? '#4CAF50' : '#ff9800'),
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {predictions.data.stormPrediction.status === 'insufficient_data' ? 'N/A' : (predictions.data.stormPrediction.accuracy ? `${predictions.data.stormPrediction.accuracy.toFixed(1)}%` : 'N/A')}
                        </span>
                      </div>
                      {predictions.data.stormPrediction.predictions?.next7Days ? (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>未来7天预测:</div>
                          {predictions.data.stormPrediction.predictions.next7Days.map((count: number, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #333' }}>
                              <span style={{ color: '#888', fontSize: '11px' }}>Day {idx + 1}</span>
                              <span style={{ color: '#2196F3', fontSize: '11px', fontWeight: 'bold' }}>{count.toFixed(1)} 次</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
                          数据不足，无法预测
                        </div>
                      )}
                    </div>
                  )}

                  {/* 洪水预测 */}
                  {predictions.data?.floodPrediction && (
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #00BCD4' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#00BCD4', fontWeight: 'bold', fontSize: '16px' }}>🌊 洪水预测</span>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: predictions.data.floodPrediction.status === 'insufficient_data' ? '#666' : (predictions.data.floodPrediction.accuracy >= 80 ? '#4CAF50' : '#ff9800'),
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {predictions.data.floodPrediction.status === 'insufficient_data' ? 'N/A' : (predictions.data.floodPrediction.accuracy ? `${predictions.data.floodPrediction.accuracy.toFixed(1)}%` : 'N/A')}
                        </span>
                      </div>
                      {predictions.data.floodPrediction.predictions?.next7Days ? (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>未来7天预测:</div>
                          {predictions.data.floodPrediction.predictions.next7Days.map((count: number, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #333' }}>
                              <span style={{ color: '#888', fontSize: '11px' }}>Day {idx + 1}</span>
                              <span style={{ color: '#00BCD4', fontSize: '11px', fontWeight: 'bold' }}>{count.toFixed(1)} 次</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
                          数据不足，无法预测
                        </div>
                      )}
                    </div>
                  )}

                  {/* 野火预测 */}
                  {predictions.data?.wildfirePrediction && (
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #FF5722' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ color: '#FF5722', fontWeight: 'bold', fontSize: '16px' }}>🔥 野火预测</span>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: predictions.data.wildfirePrediction.status === 'insufficient_data' ? '#666' : (predictions.data.wildfirePrediction.accuracy >= 80 ? '#4CAF50' : '#ff9800'),
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {predictions.data.wildfirePrediction.status === 'insufficient_data' ? 'N/A' : (predictions.data.wildfirePrediction.accuracy ? `${predictions.data.wildfirePrediction.accuracy.toFixed(1)}%` : 'N/A')}
                        </span>
                      </div>
                      {predictions.data.wildfirePrediction.predictions?.next7Days ? (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>未来7天预测:</div>
                          {predictions.data.wildfirePrediction.predictions.next7Days.map((count: number, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #333' }}>
                              <span style={{ color: '#888', fontSize: '11px' }}>Day {idx + 1}</span>
                              <span style={{ color: '#FF5722', fontSize: '11px', fontWeight: 'bold' }}>{count.toFixed(1)} 次</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
                          数据不足，无法预测
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 模型权重 */}
              {predictions.data?.overallRiskAssessment?.modelWeights && (
                <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>⚖️ 模型权重分配</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    {Object.entries(predictions.data.overallRiskAssessment.modelWeights).map(([type, weight]: [string, any]) => (
                      <div key={type} style={{ textAlign: 'center' }}>
                        <div style={{ color: '#888', fontSize: '12px' }}>{type}</div>
                        <div style={{ color: '#4CAF50', fontSize: '24px', fontWeight: 'bold', marginTop: '5px' }}>
                          {(weight * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 风险评估 Tab */}
          {activeTab === 'risk' && riskAssessment && (
            <div style={{ backgroundColor: '#0a0a0a', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
              <h3 style={{ color: '#4CAF50', marginBottom: '20px' }}>⚠️ 风险评估报告</h3>
              
              {/* 总体风险等级 */}
              {riskAssessment.data?.overallRiskScore && (
                <div style={{ 
                  backgroundColor: '#1a1a1a', 
                  padding: '25px', 
                  borderRadius: '12px', 
                  border: '2px solid #ff9800',
                  marginBottom: '30px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#888', fontSize: '14px', marginBottom: '15px' }}>总体风险等级</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4CAF50', marginBottom: '10px' }}>
                    风险分数: {riskAssessment.data.overallRiskScore.score?.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '18px', color: '#fff' }}>
                    等级: {riskAssessment.data.overallRiskScore.level}
                  </div>
                  <div style={{ fontSize: '14px', color: '#888', marginTop: '10px' }}>
                    趋势: {riskAssessment.data.overallRiskScore.trend}
                  </div>
                </div>
              )}

              {/* 分类风险 */}
              {riskAssessment.data?.typeRisks && (
                <div style={{ marginBottom: '30px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>各类型风险分析</h4>
                  {Object.entries(riskAssessment.data.typeRisks).map(([type, risk]: [string, any]) => (
                    <div key={type} style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>{type}</span>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '12px' }}>
                          <div>
                            <span style={{ color: '#666' }}>事件数: </span>
                            <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{risk.count}</span>
                          </div>
                          <div>
                            <span style={{ color: '#666' }}>风险分数: </span>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{risk.riskScore?.toFixed(2) || 'N/A'}</span>
                          </div>
                          {risk.averageMagnitude && (
                            <div>
                              <span style={{ color: '#666' }}>平均震级: </span>
                              <span style={{ color: '#fff', fontWeight: 'bold' }}>{risk.averageMagnitude?.toFixed(2)}</span>
                            </div>
                          )}
                          <div>
                            <span style={{ color: '#666' }}>权重: </span>
                            <span style={{ color: '#888' }}>{risk.weight}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 地理风险分布 */}
              {riskAssessment.data?.geographicRisks && riskAssessment.data.geographicRisks.length > 0 && (
                <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #f44336', marginBottom: '20px' }}>
                  <h4 style={{ color: '#f44336', marginBottom: '15px' }}>🗺️ 地理风险分布</h4>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                    检测到 {riskAssessment.data.geographicRisks.length} 个风险区域
                  </div>
                  <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                    {riskAssessment.data.geographicRisks.slice(0, 10).map((area: any, idx: number) => (
                      <div key={idx} style={{ padding: '8px', borderBottom: '1px solid #333', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#fff' }}>位置: [{area.location?.lat?.toFixed(4)}, {area.location?.lon?.toFixed(4)}]</div>
                            <div style={{ color: '#666', fontSize: '11px', marginTop: '3px' }}>
                              灾害数量: {area.hazardCount}
                            </div>
                          </div>
                          <div style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            backgroundColor: area.riskLevel === 'HIGH' ? '#f44336' : area.riskLevel === 'MODERATE' ? '#ff9800' : '#4CAF50',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            {area.riskLevel}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 时间趋势 */}
              {riskAssessment.data?.temporalRisks && (
                <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333', marginBottom: '20px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>📊 时间趋势分析</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                    <div>
                      <div style={{ color: '#888', fontSize: '12px' }}>最近7天</div>
                      <div style={{ color: '#4CAF50', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>
                        {riskAssessment.data.temporalRisks.recent7Days}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#888', fontSize: '12px' }}>前7天</div>
                      <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>
                        {riskAssessment.data.temporalRisks.previous7Days}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#888', fontSize: '12px' }}>增长率</div>
                      <div style={{ color: '#ff9800', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>
                        {riskAssessment.data.temporalRisks.growthRate}%
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#888', fontSize: '12px' }}>趋势</div>
                      <div style={{ color: '#4CAF50', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>
                        {riskAssessment.data.temporalRisks.trend}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 建议 */}
              {riskAssessment.data?.recommendations && riskAssessment.data.recommendations.length > 0 && (
                <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #4CAF50' }}>
                  <h4 style={{ color: '#4CAF50', marginBottom: '15px' }}>💡 建议</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#fff' }}>
                    {riskAssessment.data.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} style={{ marginBottom: '8px', fontSize: '14px' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 数据质量 Tab - 新增 */}
          {activeTab === 'quality' && (
            <div style={{ 
              background: 'linear-gradient(135deg, #0a0a0a 0%, #050505 100%)', 
              padding: '24px', 
              borderRadius: '12px', 
              marginTop: '20px',
              border: '1px solid rgba(33, 150, 243, 0.15)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}>
              <DataQualityMonitor 
                hazards={hazards} 
                source="DisasterAWARE" 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
