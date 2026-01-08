import { describe, it, expect } from 'vitest';
import { 
  parseLogData, 
  groupEntriesByRequest, 
  calculateStats, 
  cleanLogContent, 
  formatDuration,
  formatJSON,
  formatXML,
  getHttpStatusColor
} from './log-parser';

describe('Log Parser Utilities', () => {
  it('should clean log content correctly', () => {
    const raw = '[2025-12-23 10:29:00] production.INFO: REQ-123 This is a message';
    expect(cleanLogContent(raw)).toBe('This is a message');
  });

  it('should format duration correctly', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(1500)).toBe('1.50s');
    expect(formatDuration(65000)).toBe('1m 5s');
    expect(formatDuration(undefined)).toBe('N/A');
  });

  it('should format JSON correctly', () => {
    const json = '{"foo":"bar"}';
    expect(formatJSON(json)).toBe('{\n  "foo": "bar"\n}');
    expect(formatJSON('invalid')).toBe('invalid');
  });

  it('should format XML correctly', () => {
    const xml = '<root><child>text</child></root>';
    const formatted = formatXML(xml);
    expect(formatted).toContain('<root>');
    expect(formatted).toContain('  <child>text</child>');
  });

  it('should return correct HTTP status colors', () => {
    expect(getHttpStatusColor(200)).toContain('green');
    expect(getHttpStatusColor(302)).toContain('yellow');
    expect(getHttpStatusColor(404)).toContain('red');
    expect(getHttpStatusColor(500)).toContain('red');
    expect(getHttpStatusColor(0)).toContain('gray');
  });
});

describe('Log Parsing Logic', () => {
  const sampleLog = `
[2025-12-23 10:29:00] production.INFO: REQ-1  START
[2025-12-23 10:29:00] production.INFO: REQ-1  >>> GET /api/test
[2025-12-23 10:29:01] production.ERROR: REQ-1 Something failed
[2025-12-23 10:29:02] production.INFO: REQ-1  <<< 200 {"ok":true}
[2025-12-23 10:29:02] production.INFO: REQ-1  END
  `.trim();

  it('should parse log data into entries', () => {
    const entries = parseLogData(sampleLog);
    expect(entries.length).toBe(5);
    expect(entries[0].requestId).toBe('REQ-1');
    expect(entries[0].level).toBe('INFO');
    expect(entries[2].level).toBe('ERROR');
  });

  it('should group entries by request ID', () => {
    const entries = parseLogData(sampleLog);
    const groups = groupEntriesByRequest(entries);
    expect(groups.length).toBe(1);
    expect(groups[0].requestId).toBe('REQ-1');
    expect(groups[0].hasErrors).toBe(true);
    expect(groups[0].url).toBe('/api/test');
    expect(groups[0].durationMs).toBe(2000);
  });

  it('should calculate statistics correctly', () => {
    const entries = parseLogData(sampleLog);
    const stats = calculateStats(entries);
    expect(stats.total).toBe(5);
    expect(stats.errors).toBe(1);
    expect(stats.infos).toBe(4);
  });

  it('should handle functional errors (status >= 400)', () => {
     const errorLog = `
[2025-12-23 10:29:00] production.INFO: REQ-2  >>> GET /api/error
[2025-12-23 10:29:01] production.INFO: REQ-2  <<< 404 {"error":"not found"}
     `.trim();
     const entries = parseLogData(errorLog);
     const stats = calculateStats(entries);
     const groups = groupEntriesByRequest(entries);
     
     expect(stats.errors).toBe(1);
     expect(groups[0].hasErrors).toBe(true);
  });
});
