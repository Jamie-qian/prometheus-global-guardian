import React, { useState, useEffect } from 'react';
import { getStatistics } from '../api/pythonAnalytics';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  LineChart, Line, 
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const ChartsPanel: React.FC<{ hazards: any[] }> = ({ hazards }) => {
  const [pythonStats, setPythonStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeChart, setActiveChart] = useState<'pie' | 'bar' | 'line' | 'area'>('pie');

  const hazardsByType = hazards.reduce((acc, h) => {
    const type = h.type || h.properties?.type || '未分类';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 为图表准备数据
  const chartData = Object.entries(hazardsByType).map(([name, value]) => ({
    name,
    value,
    count: value
  }));

  // 时间线数据（按日期统计）
  const timelineData = React.useMemo(() => {
    const dateCount: Record<string, number> = {};
    hazards.forEach(h => {
      const date = h.properties?.timestamp ? new Date(h.properties.timestamp).toLocaleDateString('zh-CN') : '未知日期';
      dateCount[date] = (dateCount[date] || 0) + 1;
    });
    return Object.entries(dateCount)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-30) // 最近30天
      .map(([date, count]) => ({ date, count }));
  }, [hazards]);

  // 严重性分布数据
  const severityData = React.useMemo(() => {
    const severityCount: Record<string, number> = {};
    hazards.forEach(h => {
      const severity = h.properties?.severity || '未知';
      severityCount[severity] = (severityCount[severity] || 0) + 1;
    });
    return Object.entries(severityCount).map(([name, value]) => ({ name, value }));
  }, [hazards]);

  const COLORS = ['#4CAF50', '#FF9800', '#2196F3', '#F44336', '#9C27B0', '#00BCD4', '#FFEB3B'];

  useEffect(() => {
    if (hazards.length > 0) {
      loadPythonStats();
    }
  }, [hazards.length]);

  const loadPythonStats = async () => {
    if (hazards.length === 0) return;
    
    setLoading(true);
    try {
      const result = await getStatistics(hazards.slice(0, 100));
      if (result.success) {
        setPythonStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load Python statistics:', error);
      // 静默失败，不影响基础图表显示
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: '#4CAF50', margin: 0 }}>📊 4类交互式分析图表</h3>
        {loading && <span style={{ color: '#888', fontSize: '12px' }}>加载中...</span>}
      </div>

      {/* 图表切换按钮 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveChart('pie')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeChart === 'pie' ? '#4CAF50' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          🥧 饼图
        </button>
        <button
          onClick={() => setActiveChart('bar')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeChart === 'bar' ? '#FF9800' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          📊 柱状图
        </button>
        <button
          onClick={() => setActiveChart('line')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeChart === 'line' ? '#2196F3' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          📈 时间线
        </button>
        <button
          onClick={() => setActiveChart('area')}
          style={{
            padding: '8px 16px',
            backgroundColor: activeChart === 'area' ? '#9C27B0' : '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          📉 分布图
        </button>
      </div>

      {/* 图表显示区域 */}
      <div style={{ height: '400px', marginBottom: '20px' }}>
        {activeChart === 'pie' && (
          <div>
            <h4 style={{ color: '#4CAF50', fontSize: '14px', marginBottom: '10px' }}>🥧 灾害类型分布（饼图）</h4>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend 
                  wrapperStyle={{ color: '#fff' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === 'bar' && (
          <div>
            <h4 style={{ color: '#FF9800', fontSize: '14px', marginBottom: '10px' }}>📊 灾害类型统计（柱状图）</h4>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis 
                  dataKey="name" 
                  stroke="#888"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: 'rgba(255, 152, 0, 0.1)' }}
                />
                <Legend wrapperStyle={{ color: '#fff' }} />
                <Bar dataKey="value" fill="#FF9800" name="数量" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === 'line' && (
          <div>
            <h4 style={{ color: '#2196F3', fontSize: '14px', marginBottom: '10px' }}>📈 灾害时间趋势（时间线图）</h4>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis 
                  dataKey="date" 
                  stroke="#888"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ color: '#fff' }} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2196F3" 
                  strokeWidth={3}
                  dot={{ fill: '#2196F3', r: 5 }}
                  activeDot={{ r: 8 }}
                  name="灾害数量"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === 'area' && (
          <div>
            <h4 style={{ color: '#9C27B0', fontSize: '14px', marginBottom: '10px' }}>📉 严重性分布（面积图）</h4>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ color: '#fff' }} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#9C27B0" 
                  fill="#9C27B0"
                  fillOpacity={0.6}
                  name="数量"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 数据统计摘要 */}
      <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
        <h4 style={{ color: '#4CAF50', fontSize: '14px', marginBottom: '12px' }}>📈 数据统计摘要</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '13px' }}>
          <div style={{ padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '6px', border: '1px solid #4CAF50' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>总灾害数</div>
            <div style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '20px' }}>
              {hazards.length}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '6px', border: '1px solid #FF9800' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>灾害类型</div>
            <div style={{ color: '#FF9800', fontWeight: 'bold', fontSize: '20px' }}>
              {Object.keys(hazardsByType).length}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '6px', border: '1px solid #2196F3' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>时间跨度</div>
            <div style={{ color: '#2196F3', fontWeight: 'bold', fontSize: '20px' }}>
              {timelineData.length}天
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#2a2a2a', borderRadius: '6px', border: '1px solid #9C27B0' }}>
            <div style={{ color: '#888', fontSize: '11px' }}>严重性级别</div>
            <div style={{ color: '#9C27B0', fontWeight: 'bold', fontSize: '20px' }}>
              {severityData.length}
            </div>
          </div>
        </div>
      </div>

      {pythonStats && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
          <h4 style={{ color: '#4CAF50', fontSize: '14px', marginBottom: '12px' }}>🐍 Python 高级统计</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
            {pythonStats.basicStats && (
              <>
                <div style={{ padding: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
                  <div style={{ color: '#888' }}>平均值</div>
                  <div style={{ color: '#fff', fontWeight: 'bold' }}>
                    {pythonStats.basicStats.mean?.toFixed(2) || 'N/A'}
                  </div>
                </div>
                <div style={{ padding: '8px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
                  <div style={{ color: '#888' }}>标准差</div>
                  <div style={{ color: '#fff', fontWeight: 'bold' }}>
                    {pythonStats.basicStats.std?.toFixed(2) || 'N/A'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartsPanel;
