import React from 'react';

interface LineChartProps {
  data: Array<{ x: number | string; y: number }>;
  title: string;
  color?: string;
  xLabel?: string;
  yLabel?: string;
  showDots?: boolean;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ 
  data, 
  title, 
  color = '#4CAF50',
  xLabel = '',
  yLabel = '',
  showDots = true,
  height = 200
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
        <h4 style={{ color: '#fff', marginBottom: '15px' }}>{title}</h4>
        <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>暂无数据</div>
      </div>
    );
  }

  const values = data.map(d => d.y);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const padding = 40;
  const chartWidth = 100; // 使用百分比
  const chartHeight = height;

  // 计算点的位置
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((d.y - minValue) / range) * (chartHeight - padding * 2) - padding;
    return { x, y, value: d.y, label: d.x };
  });

  // 生成SVG路径
  const pathD = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  return (
    <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
      <h4 style={{ color: '#fff', marginBottom: '15px' }}>{title}</h4>
      <div style={{ position: 'relative', height: `${chartHeight}px`, marginBottom: '10px' }}>
        <svg width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
          {/* 网格线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + (chartHeight - padding * 2) * ratio;
            const value = maxValue - (maxValue - minValue) * ratio;
            return (
              <g key={ratio}>
                <line
                  x1="0%"
                  y1={y}
                  x2="100%"
                  y2={y}
                  stroke="#333"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x="5"
                  y={y - 5}
                  fill="#666"
                  fontSize="10"
                >
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* 折线 */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* 数据点 */}
          {showDots && points.map((p, i) => (
            <g key={i}>
              <circle
                cx={`${p.x}%`}
                cy={p.y}
                r="4"
                fill={color}
                stroke="#1a1a1a"
                strokeWidth="2"
              />
              {/* 数据点标签 */}
              <text
                x={`${p.x}%`}
                y={p.y - 10}
                fill="#888"
                fontSize="10"
                textAnchor="middle"
              >
                {p.value.toFixed(1)}
              </text>
            </g>
          ))}
        </svg>
      </div>
      
      {/* X轴标签 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: '#666' }}>
        {points.map((p, i) => (
          <div key={i} style={{ flex: 1, textAlign: i === 0 ? 'left' : i === points.length - 1 ? 'right' : 'center' }}>
            {p.label}
          </div>
        ))}
      </div>
      
      {(xLabel || yLabel) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '12px', color: '#888' }}>
          {xLabel && <div>{xLabel}</div>}
          {yLabel && <div>{yLabel}</div>}
        </div>
      )}
    </div>
  );
};

interface BarChartProps {
  data: Record<string, number>;
  title: string;
  color?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, color = '#4CAF50' }) => {
  const maxValue = Math.max(...Object.values(data));
  
  return (
    <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
      <h4 style={{ color: '#fff', marginBottom: '15px' }}>{title}</h4>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
            <span style={{ color: '#fff' }}>{key}</span>
            <span style={{ color }}>{value.toFixed(2)}</span>
          </div>
          <div style={{ backgroundColor: '#0a0a0a', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ 
              backgroundColor: color, 
              height: '100%', 
              width: `${(value / maxValue) * 100}%`,
              transition: 'width 0.3s ease',
              borderRadius: '4px'
            }} />
          </div>
        </div>
      ))}
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  unit = '', 
  color = '#4CAF50',
  trend
}) => {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor = trend === 'up' ? '#4CAF50' : trend === 'down' ? '#f44336' : '#ff9800';
  
  return (
    <div style={{ 
      backgroundColor: '#1a1a1a', 
      padding: '15px', 
      borderRadius: '8px', 
      border: '1px solid #333',
      position: 'relative'
    }}>
      <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
        <div style={{ color, fontSize: '24px', fontWeight: 'bold' }}>
          {typeof value === 'number' ? value.toFixed(2) : value}
        </div>
        {unit && <div style={{ color: '#666', fontSize: '14px' }}>{unit}</div>}
      </div>
      {trend && (
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          color: trendColor,
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          {trendIcon}
        </div>
      )}
    </div>
  );
};

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  label, 
  value, 
  max, 
  color = '#4CAF50',
  showPercentage = true 
}) => {
  const percentage = (value / max) * 100;
  
  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
        <span style={{ color: '#fff' }}>{label}</span>
        <span style={{ color }}>
          {showPercentage ? `${percentage.toFixed(1)}%` : `${value} / ${max}`}
        </span>
      </div>
      <div style={{ backgroundColor: '#0a0a0a', height: '12px', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ 
          backgroundColor: color, 
          height: '100%', 
          width: `${Math.min(percentage, 100)}%`,
          transition: 'width 0.5s ease',
          borderRadius: '6px'
        }} />
      </div>
    </div>
  );
};

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  size?: 'small' | 'medium' | 'large';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'medium' }) => {
  const config = {
    low: { color: '#4CAF50', label: '低风险', icon: '✓' },
    medium: { color: '#ff9800', label: '中风险', icon: '⚠' },
    high: { color: '#f44336', label: '高风险', icon: '⚠' },
    critical: { color: '#d32f2f', label: '极高风险', icon: '🚨' }
  };
  
  const sizeConfig = {
    small: { padding: '4px 8px', fontSize: '11px' },
    medium: { padding: '6px 12px', fontSize: '13px' },
    large: { padding: '8px 16px', fontSize: '15px' }
  };
  
  const { color, label, icon } = config[level];
  const { padding, fontSize } = sizeConfig[size];
  
  return (
    <span style={{
      backgroundColor: color,
      color: '#fff',
      padding,
      fontSize,
      borderRadius: '12px',
      fontWeight: 'bold',
      display: 'inline-block'
    }}>
      {icon} {label}
    </span>
  );
};

interface DataTableProps {
  headers: string[];
  rows: (string | number)[][];
  maxHeight?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ headers, rows, maxHeight = '400px' }) => {
  return (
    <div style={{ 
      backgroundColor: '#1a1a1a', 
      borderRadius: '8px', 
      border: '1px solid #333',
      overflow: 'hidden'
    }}>
      <div style={{ maxHeight, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#2a2a2a', zIndex: 1 }}>
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  color: '#4CAF50',
                  fontWeight: 'bold',
                  borderBottom: '2px solid #4CAF50'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} style={{ 
                borderBottom: '1px solid #333',
                backgroundColor: rowIdx % 2 === 0 ? '#1a1a1a' : '#0a0a0a'
              }}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} style={{ padding: '10px', color: '#fff' }}>
                    {typeof cell === 'number' ? cell.toFixed(2) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = '加载中...' }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '40px',
      gap: '15px'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid #333',
        borderTop: '4px solid #4CAF50',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <div style={{ color: '#888', fontSize: '14px' }}>{message}</div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

interface AlertBoxProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

export const AlertBox: React.FC<AlertBoxProps> = ({ type, title, message }) => {
  const config = {
    info: { color: '#2196F3', icon: 'ℹ', bg: 'rgba(33, 150, 243, 0.1)' },
    success: { color: '#4CAF50', icon: '✓', bg: 'rgba(76, 175, 80, 0.1)' },
    warning: { color: '#ff9800', icon: '⚠', bg: 'rgba(255, 152, 0, 0.1)' },
    error: { color: '#f44336', icon: '✕', bg: 'rgba(244, 67, 54, 0.1)' }
  };
  
  const { color, icon, bg } = config[type];
  
  return (
    <div style={{
      backgroundColor: bg,
      border: `1px solid ${color}`,
      borderRadius: '8px',
      padding: '15px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start'
    }}>
      <div style={{ color, fontSize: '24px', marginTop: '2px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color, fontWeight: 'bold', marginBottom: '5px' }}>{title}</div>
        <div style={{ color: '#fff', fontSize: '13px' }}>{message}</div>
      </div>
    </div>
  );
};
