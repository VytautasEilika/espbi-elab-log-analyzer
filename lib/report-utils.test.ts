import { describe, it, expect } from 'vitest';
import { generateHtmlReport, generateTextSummary } from './report-utils';
import { LogParserStats, RequestGroup } from './log-parser';

describe('Report Utilities', () => {
  const mockStats: LogParserStats = {
    total: 100,
    errors: 5,
    warnings: 10,
    infos: 70,
    debugs: 15
  };

  const mockGroups: RequestGroup[] = [
    {
      requestId: 'REQ-1',
      entries: [],
      hasErrors: true,
      hasWarnings: false,
      durationMs: 500,
      startTime: '2025-12-23 10:00:00',
      url: '/api/test'
    }
  ];

  it('should generate a text summary', () => {
    const summary = generateTextSummary('test.log', mockStats, mockGroups);
    expect(summary).toContain('Log Report for: test.log');
    expect(summary).toContain('Errors:      5');
    expect(summary).toContain('[ERR] REQ-1');
  });

  it('should generate an HTML report', () => {
    const html = generateHtmlReport('test.log', mockStats, mockGroups);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<h1>Log Report</h1>');
    expect(html).toContain('test.log');
    expect(html).toContain('REQ-1');
    expect(html).toContain('badge error');
  });
});
