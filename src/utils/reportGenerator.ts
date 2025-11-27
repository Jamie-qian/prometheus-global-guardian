import type { Hazard } from '../types';
import { calculateHazardStats, getTypeDistribution } from './analytics';
import { calculateRiskScore, getHighRiskRegions } from './riskAnalysis';

export interface ReportData {
  reportName: string;
  organization: string;
  email: string;
  notes: string;
  disasters: Hazard[];
  filter: string;
}

/**
 * 生成增强版HTML报告
 */
export function generateEnhancedReport(data: ReportData): string {
  const { reportName, organization, email, notes, disasters, filter } = data;
  
  const safe = (v: any) =>
    String(v ?? "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  
  const createdAt = new Date().toLocaleString();
  const filterLabel = filter === "ALL" ? "All Hazard Types" : filter.replace(/_/g, " ");
  
  const filtered = filter === "ALL"
    ? disasters
    : disasters.filter((d: any) => d.type === filter);
  
  // 统计数据
  const stats = calculateHazardStats(filtered);
  const typeDistribution = getTypeDistribution(filtered);
  const riskScore = calculateRiskScore(filtered);
  const highRiskRegions = getHighRiskRegions(filtered).slice(0, 5);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safe(reportName)} - Prometheus Global Guardian</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    .header .subtitle {
      font-size: 1.125rem;
      color: #9ca3af;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 1.5rem;
      color: #1f2937;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .meta-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .meta-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #60a5fa;
    }
    .meta-label {
      font-size: 0.875rem;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .meta-value {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f2937;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 0.875rem;
      opacity: 0.9;
    }
    .risk-assessment {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 30px;
    }
    .risk-assessment.critical {
      background: #fee2e2;
      border-color: #dc2626;
    }
    .risk-assessment.high {
      background: #fed7aa;
      border-color: #f97316;
    }
    .risk-assessment.moderate {
      background: #dbeafe;
      border-color: #3b82f6;
    }
    .risk-assessment.low {
      background: #d1fae5;
      border-color: #10b981;
    }
    .risk-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .risk-score {
      font-size: 3rem;
      font-weight: bold;
    }
    .chart-container {
      background: #f9fafb;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .chart-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 15px;
    }
    .bar {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }
    .bar-label {
      width: 150px;
      font-size: 0.875rem;
      color: #4b5563;
    }
    .bar-track {
      flex: 1;
      height: 30px;
      background: #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      margin: 0 15px;
    }
    .bar-fill {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 10px;
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      min-width: 40px;
      position: relative;
    }
    .bar-percentage {
      position: absolute;
      right: 10px;
      white-space: nowrap;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .bar-percentage.outside {
      position: absolute;
      left: calc(100% + 8px);
      color: #4b5563;
      text-shadow: none;
    }
    .bar-count {
      width: 50px;
      text-align: right;
      font-weight: 600;
      color: #1f2937;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .table th {
      background: #1f2937;
      color: white;
      padding: 15px;
      text-align: left;
      font-weight: 600;
    }
    .table td {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .table tr:last-child td {
      border-bottom: none;
    }
    .table tr:hover {
      background: #f9fafb;
    }
    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .severity-warning {
      background: #fee2e2;
      color: #dc2626;
    }
    .severity-watch {
      background: #fed7aa;
      color: #f97316;
    }
    .severity-advisory {
      background: #dbeafe;
      color: #3b82f6;
    }
    .footer {
      background: #f9fafb;
      padding: 30px 40px;
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌍 ${safe(reportName)}</h1>
      <div class="subtitle">Prometheus Global Guardian - Environmental Hazards Report</div>
    </div>

    <div class="content">
      <!-- Meta Information -->
      <div class="section">
        <h2 class="section-title">Report Information</h2>
        <div class="meta-info">
          ${organization ? `
          <div class="meta-card">
            <div class="meta-label">Organization</div>
            <div class="meta-value">${safe(organization)}</div>
          </div>
          ` : ''}
          ${email ? `
          <div class="meta-card">
            <div class="meta-label">Contact Email</div>
            <div class="meta-value">${safe(email)}</div>
          </div>
          ` : ''}
          <div class="meta-card">
            <div class="meta-label">Report Date</div>
            <div class="meta-value">${createdAt}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Filter Applied</div>
            <div class="meta-value">${filterLabel}</div>
          </div>
        </div>
        ${notes ? `
        <div class="meta-card">
          <div class="meta-label">Notes</div>
          <div class="meta-value">${safe(notes)}</div>
        </div>
        ` : ''}
      </div>

      <!-- Statistics Overview -->
      <div class="section">
        <h2 class="section-title">Statistics Overview</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total Hazards</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.recentCount}</div>
            <div class="stat-label">Last 7 Days</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.highestSeverityCount}</div>
            <div class="stat-label">High Severity</div>
          </div>
          ${stats.averageMagnitude > 0 ? `
          <div class="stat-card">
            <div class="stat-value">${stats.averageMagnitude.toFixed(1)}</div>
            <div class="stat-label">Avg Magnitude</div>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Risk Assessment -->
      <div class="section">
        <h2 class="section-title">Risk Assessment</h2>
        <div class="risk-assessment ${riskScore.level.toLowerCase()}">
          <div class="risk-header">
            <div>
              <div style="font-size: 1.5rem; font-weight: 600; margin-bottom: 5px;">
                ${riskScore.level} RISK
              </div>
              <div>${riskScore.description}</div>
            </div>
            <div class="risk-score">${riskScore.overall}/100</div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px;">
            <div>
              <div style="font-size: 0.875rem; opacity: 0.8;">Severity</div>
              <div style="font-size: 1.5rem; font-weight: 600;">${riskScore.factors.severity}/100</div>
            </div>
            <div>
              <div style="font-size: 0.875rem; opacity: 0.8;">Frequency</div>
              <div style="font-size: 1.5rem; font-weight: 600;">${riskScore.factors.frequency}/100</div>
            </div>
            <div>
              <div style="font-size: 0.875rem; opacity: 0.8;">Geographic</div>
              <div style="font-size: 1.5rem; font-weight: 600;">${riskScore.factors.geographic}/100</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Type Distribution Chart -->
      ${typeDistribution.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Hazard Type Distribution</h2>
        <div class="chart-container">
          <div class="chart-title">Distribution by Type</div>
          ${typeDistribution.map(item => `
            <div class="bar">
              <div class="bar-label">${item.type}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${item.percentage}%; background-color: ${item.color};">
                  <span class="bar-percentage ${item.percentage < 8 ? 'outside' : ''}">${item.percentage}%</span>
                </div>
              </div>
              <div class="bar-count">${item.count}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- High Risk Regions -->
      ${highRiskRegions.length > 0 ? `
      <div class="section">
        <h2 class="section-title">High Risk Regions</h2>
        <div class="chart-container">
          ${highRiskRegions.map((region: any) => {
            const riskPercent = Math.min((region.count / filtered.length) * 100, 100);
            return `
            <div class="bar">
              <div class="bar-label">${region.region} (${region.dominantType})</div>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${riskPercent}%; background-color: ${region.riskLevel === 'Critical' ? '#dc2626' : region.riskLevel === 'High' ? '#f59e0b' : '#3b82f6'};">
                  ${Math.round(riskPercent)}%
                </div>
              </div>
              <div class="bar-count">${region.count} hazards</div>
            </div>
          `;}).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Detailed Hazard List -->
      <div class="section">
        <h2 class="section-title">Detailed Hazard List (${filtered.length} items)</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Hazard</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Location</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.slice(0, 50).map((d: any) => {
              const sevClass = 
                (d.severity === 'WARNING' || d.severity === 'ALERT') ? 'warning' :
                d.severity === 'WATCH' ? 'watch' : 'advisory';
              return `
                <tr>
                  <td><strong>${safe(d.title)}</strong></td>
                  <td>${safe(d.type).replace(/_/g, ' ')}</td>
                  <td>
                    <span class="severity-badge severity-${sevClass}">
                      ${safe(d.severity || 'UNKNOWN')}
                    </span>
                  </td>
                  <td>${d.geometry?.coordinates ? `${d.geometry.coordinates[1].toFixed(2)}°, ${d.geometry.coordinates[0].toFixed(2)}°` : 'N/A'}</td>
                  <td>${safe(d.source || 'Unknown')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ${filtered.length > 50 ? `<p style="margin-top: 15px; color: #6b7280; font-style: italic;">Showing first 50 of ${filtered.length} hazards</p>` : ''}
      </div>
    </div>

    <div class="footer">
      <div style="margin-bottom: 10px;">
        <strong>Prometheus Global Guardian</strong> - Real-time Global Environmental Hazards Monitoring Platform
      </div>
      <div>
        Generated on ${createdAt} | Data sources: USGS, NASA EONET, GDACS
      </div>
      <div style="margin-top: 10px;">
        This report is for informational purposes only. Always consult official sources for emergency decisions.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * 下载HTML报告
 */
export function downloadReport(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
