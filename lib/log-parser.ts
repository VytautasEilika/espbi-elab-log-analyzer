/**
 * Log Parsing Logic Library
 * Extracted from LogViewer and related components.
 */

export interface LogEntry {
  lineNumber: number;
  content: string;
  level?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  timestamp?: string;
  requestId?: string;
  environment?: string;
}

export interface RequestGroup {
  requestId: string;
  entries: LogEntry[];
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  environment?: string;
  responseStatus?: number;
  responseErrorBody?: string;
  url?: string;
}

export interface LogParserStats {
  errors: number;
  warnings: number;
  infos: number;
  debugs: number;
  total: number;
}

// Regex Patterns
export const TIMESTAMP_PATTERN = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]/;
export const ENV_LEVEL_PATTERN = /\]\s+(\w+)\.(ERROR|WARN|INFO|DEBUG):/;
export const REQUEST_ID_PATTERN = /REQ-[a-zA-Z0-9]+/;
export const CLEAN_TIMESTAMP_PATTERN = /^\[?\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]?\s*/;
export const CLEAN_ENV_LEVEL_PATTERN = /^\w+\.(ERROR|WARN|INFO|DEBUG):\s*/;
export const CLEAN_REQUEST_ID_PATTERN = /^REQ-[a-zA-Z0-9]+\s*/;

/**
 * Cleans log content by removing standard prefixes (timestamp, env.level, request ID).
 */
export const cleanLogContent = (content: string): string => {
  let cleaned = content;
  cleaned = cleaned.replace(CLEAN_TIMESTAMP_PATTERN, '');
  cleaned = cleaned.replace(CLEAN_ENV_LEVEL_PATTERN, '');
  cleaned = cleaned.replace(CLEAN_REQUEST_ID_PATTERN, '');
  return cleaned.trim();
};

/**
 * Parses raw log data into an array of LogEntry objects.
 */
export const parseLogData = (logData: string): LogEntry[] => {
  const rawLines = logData.split('\n');
  const entries: LogEntry[] = [];
  let currentEntry: Partial<LogEntry> | null = null;
  let currentContentLines: string[] = [];

  rawLines.forEach((line, index) => {
    const timestampMatch = line.match(TIMESTAMP_PATTERN);
    const isNewEntry = !!timestampMatch;

    if (isNewEntry) {
      if (currentEntry) {
        entries.push({
          lineNumber: currentEntry.lineNumber!,
          content: currentContentLines.join('\n'),
          level: currentEntry.level,
          timestamp: currentEntry.timestamp,
          requestId: currentEntry.requestId,
          environment: currentEntry.environment,
        });
      }

      const timestamp = timestampMatch[1];
      let level: LogEntry['level'];
      let requestId: string | undefined;
      let environment: string | undefined;

      const envLevelMatch = line.match(ENV_LEVEL_PATTERN);
      if (envLevelMatch) {
        environment = envLevelMatch[1];
        level = envLevelMatch[2] as LogEntry['level'];
      } else {
        const lineUpper = line.toUpperCase();
        if (lineUpper.includes('ERROR')) level = 'ERROR';
        else if (lineUpper.includes('WARN')) level = 'WARN';
        else if (lineUpper.includes('INFO')) level = 'INFO';
        else if (lineUpper.includes('DEBUG')) level = 'DEBUG';
      }

      const requestIdMatch = line.match(REQUEST_ID_PATTERN);
      if (requestIdMatch) {
        requestId = requestIdMatch[0];
      }

      currentEntry = {
        lineNumber: index + 1,
        level,
        timestamp,
        requestId,
        environment,
      };
      currentContentLines = [line];
    } else {
      if (currentEntry) {
        currentContentLines.push(line);
      } else if (line.trim()) {
        entries.push({
          lineNumber: index + 1,
          content: line,
        });
      }
    }
  });

  if (currentEntry) {
    const lastEntry = currentEntry as LogEntry;
    entries.push({
      lineNumber: lastEntry.lineNumber!,
      content: currentContentLines.join('\n'),
      level: lastEntry.level,
      timestamp: lastEntry.timestamp,
      requestId: lastEntry.requestId,
      environment: lastEntry.environment,
    });
  }

  return entries;
};

/**
 * Groups LogEntry objects by requestId.
 */
export const groupEntriesByRequest = (logEntries: LogEntry[]): RequestGroup[] => {
  const groupMap = new Map<string, LogEntry[]>();

  logEntries.forEach(entry => {
    if (entry.requestId) {
      if (!groupMap.has(entry.requestId)) {
        groupMap.set(entry.requestId, []);
      }
      groupMap.get(entry.requestId)!.push(entry);
    }
  });

  return Array.from(groupMap.entries()).map(([requestId, entries]) => {
    const timestamps = entries.map(e => e.timestamp).filter(Boolean);
    const hasErrors = entries.some(e => e.level === 'ERROR');
    const hasWarnings = entries.some(e => e.level === 'WARN');
    const environment = entries.find(e => e.environment)?.environment;

    let responseStatus: number | undefined;
    let responseErrorBody: string | undefined;

    const responseEntry = entries.find(e => {
      const cleaned = cleanLogContent(e.content);
      return cleaned.match(/^<<<\s+(\d+)/);
    });

    if (responseEntry) {
      const cleaned = cleanLogContent(responseEntry.content);
      const match = cleaned.match(/^<<<\s+(\d+)\s+(.*)/);
      if (match) {
        const status = parseInt(match[1]);
        responseStatus = status;
        if (status >= 400) {
          responseErrorBody = match[2];
        }
      }
    }

    let url: string | undefined;
    const requestEntry = entries.find(e => {
      const cleaned = cleanLogContent(e.content);
      return cleaned.startsWith('>>>');
    });

    if (requestEntry) {
      const cleaned = cleanLogContent(requestEntry.content);
      const match = cleaned.match(/^>>>\s+(?:POST|GET|PUT|DELETE|PATCH)\s+(\S+)/);
      if (match) {
        url = match[1];
      }
    }

    const startTime = timestamps[0];
    const endTime = timestamps[timestamps.length - 1];

    let durationMs: number | undefined;
    if (startTime && endTime) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      durationMs = end - start;
    }

    return {
      requestId,
      entries,
      startTime,
      endTime,
      durationMs,
      hasErrors: hasErrors || (responseStatus !== undefined && responseStatus >= 400),
      hasWarnings,
      environment,
      responseStatus,
      responseErrorBody,
      url,
    };
  }).sort((a, b) => {
    if (a.startTime && b.startTime) {
      return b.startTime.localeCompare(a.startTime);
    }
    return 0;
  });
};

/**
 * Calculates summary statistics for a list of log entries.
 */
export const calculateStats = (logEntries: LogEntry[]): LogParserStats => {
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  let debugs = 0;

  logEntries.forEach(e => {
    const cleaned = cleanLogContent(e.content);
    const responseMatch = cleaned.match(/^<<<\s+(\d+)/);
    const isFunctionalError = responseMatch && parseInt(responseMatch[1]) >= 400;

    if (e.level === 'ERROR' || isFunctionalError) {
      errors++;
    } else if (e.level === 'WARN') {
      warnings++;
    } else if (e.level === 'INFO') {
      infos++;
    } else if (e.level === 'DEBUG') {
      debugs++;
    }
  });

  return { errors, warnings, infos, debugs, total: logEntries.length };
};

/**
 * Basic XML formatter for display purposes.
 */
export const formatXML = (xml: string): string => {
  let formatted = '';
  let indent = 0;
  const tab = '  ';
  xml.split(/>\s*</).forEach(function(node) {
      if (node.match( /^\/\w/ )) indent -= 1;
      formatted += new Array(indent + 1).join(tab) + '<' + node + '>\r\n';
      if (node.match( /^<?\w[^>]*[^\/]$/ )) indent += 1;
  });
  return formatted.substring(1, formatted.length-3);
};

/**
 * Returns CSS classes for HTTP status codes.
 */
export const getHttpStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return 'text-green-400 bg-green-900/30 border-green-700';
  if (status >= 300 && status < 400) return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
  if (status >= 400) return 'text-red-400 bg-red-900/30 border-red-700';
  return 'text-gray-400 bg-gray-900/30 border-gray-700';
};

/**
 * Standardizes duration formatting for display.
 */
export const formatDuration = (durationMs?: number): string => {
  if (durationMs === undefined || durationMs === null) return 'N/A';

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
};

/**
 * Formats a JSON string for display.
 */
export const formatJSON = (jsonString: string): string => {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return jsonString;
  }
};

/**
 * Returns CSS classes for log level coloring.
 */
export const getLevelColor = (level?: string) => {
  switch (level) {
    case 'ERROR': return 'text-red-400 bg-red-900/30';
    case 'WARN': return 'text-yellow-400 bg-yellow-900/30';
    case 'INFO': return 'text-blue-400 bg-blue-900/30';
    case 'DEBUG': return 'text-gray-400 bg-gray-800/30';
    default: return 'text-gray-300 bg-gray-800/20';
  }
};
