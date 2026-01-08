import path from 'path';
import { LogParserStats, RequestGroup, formatDuration } from './log-parser';

export function generateTextSummary(file: string, stats: LogParserStats, groups: RequestGroup[]) {
  return `
Log Report for: ${file}
---------------------------------------
Total Lines: ${stats.total}
Errors:      ${stats.errors}
Warnings:    ${stats.warnings}
Infos:       ${stats.infos}
Debugs:      ${stats.debugs}

Requests: ${groups.length}
---------------------------------------
${groups.slice(0, 10).map(g => `[${g.hasErrors ? 'ERR' : 'OK '}] ${g.requestId.padEnd(15)} | ${g.url || 'N/A'}`).join('\n')}
${groups.length > 10 ? `... and ${groups.length - 10} more requests.` : ''}
`;
}

export function generateHtmlReport(file: string, stats: LogParserStats, groups: RequestGroup[]) {
  const rows = groups.map(g => `
    <tr class="${g.hasErrors ? 'error' : ''}">
      <td class="mono">${g.requestId}</td>
      <td>${g.startTime || 'N/A'}</td>
      <td>${formatDuration(g.durationMs)}</td>
      <td><span class="badge ${g.hasErrors ? 'error' : 'success'}">${g.hasErrors ? 'ERROR' : 'OK'}</span></td>
      <td class="mono font-xs">${g.url || ''}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Log Report - ${path.basename(file)}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f7f6; color: #333; margin: 0; padding: 40px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; margin-top: 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #ddd; }
        .stat-card.errors { border-left-color: #e74c3c; color: #c0392b; }
        .stat-card.warnings { border-left-color: #f1c40f; color: #d35400; }
        .stat-card h3 { margin: 0; font-size: 14px; text-transform: uppercase; opacity: 0.7; }
        .stat-card p { margin: 5px 0 0; font-size: 24px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-size: 13px; color: #7f8c8d; }
        tr:hover { background: #fcfcfc; }
        tr.error { background: #fff5f5; }
        .mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 13px; }
        .font-xs { font-size: 11px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .badge.success { background: #2ecc71; color: white; }
        .badge.error { background: #e74c3c; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Log Report</h1>
        <p><strong>File:</strong> ${file}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        
        <div class="stats">
            <div class="stat-card">
                <h3>Total Lines</h3>
                <p>${stats.total}</p>
            </div>
            <div class="stat-card errors">
                <h3>Errors</h3>
                <p>${stats.errors}</p>
            </div>
            <div class="stat-card warnings">
                <h3>Warnings</h3>
                <p>${stats.warnings}</p>
            </div>
            <div class="stat-card">
                <h3>Requests</h3>
                <p>${groups.length}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Request ID</th>
                    <th>Start Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>URL</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    </div>
</body>
</html>
`;
}
