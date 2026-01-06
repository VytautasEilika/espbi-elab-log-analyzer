'use client';

import { useMemo, useState } from 'react';
import RequestList from './RequestList';
import RequestDetail from './RequestDetail';

interface LogViewerProps {
  logData: string;
  fileName: string;
  onReset: () => void;
}

interface LogEntry {
  lineNumber: number;
  content: string;
  level?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  timestamp?: string;
  requestId?: string;
  environment?: string;
}

interface RequestGroup {
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

export default function LogViewer({ logData, fileName, onReset }: LogViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'flat' | 'request'>('request');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [environmentFilter, setEnvironmentFilter] = useState<string>('ALL');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const linesPerPage = 100;

  // Parse log data into structured entries
  const logEntries = useMemo((): LogEntry[] => {
    const rawLines = logData.split('\n');
    const entries: LogEntry[] = [];
    let currentEntry: Partial<LogEntry> | null = null;
    let currentContentLines: string[] = [];
    let currentLineNumber = 1;

    // Pattern to detect start of new log entry: [YYYY-MM-DD HH:MM:SS]
    const timestampPattern = /^\[(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})\]/;

    rawLines.forEach((line, index) => {
      const timestampMatch = line.match(timestampPattern);
      const isNewEntry = !!timestampMatch;

      if (isNewEntry) {
        // Finalize previous entry
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

        // Start new entry
        const timestamp = timestampMatch[1];
        let level: LogEntry['level'];
        let requestId: string | undefined;
        let environment: string | undefined;

        // Extract environment and log level from pattern: ] environment.LEVEL:
        const envLevelMatch = line.match(/\]\s+(\w+)\.(ERROR|WARN|INFO|DEBUG):/);
        if (envLevelMatch) {
          environment = envLevelMatch[1];
          level = envLevelMatch[2] as LogEntry['level'];
        } else {
          // Fallback: detect log level from content
          if (line.includes('ERROR') || line.includes('error')) level = 'ERROR';
          else if (line.includes('WARN') || line.includes('warn')) level = 'WARN';
          else if (line.includes('INFO') || line.includes('info')) level = 'INFO';
          else if (line.includes('DEBUG') || line.includes('debug')) level = 'DEBUG';
        }

        // Extract request ID (REQ-xxxxx format)
        const requestIdMatch = line.match(/REQ-[a-zA-Z0-9]+/);
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
        currentLineNumber = index + 1;
      } else {
        // Append to current entry if it exists
        if (currentEntry) {
          currentContentLines.push(line);
        } else if (line.trim()) {
           // Handle case where log file starts with non-timestamped lines (rare but possible)
           // or simple text files. Treat as separate entry or plain text.
           // For now, let's just create a basic entry if we have content but no previous entry
           entries.push({
             lineNumber: index + 1,
             content: line,
           });
        }
      }
    });

    // Finalize last entry
    if (currentEntry) {
      const lastEntry = currentEntry as LogEntry;
      entries.push({
        lineNumber: lastEntry.lineNumber,
        content: currentContentLines.join('\n'),
        level: lastEntry.level,
        timestamp: lastEntry.timestamp,
        requestId: lastEntry.requestId,
        environment: lastEntry.environment,
      });
    }

    return entries;
  }, [logData]);

  // Filter and search
  const filteredEntries = useMemo(() => {
    return logEntries.filter(entry => {
      const matchesSearch = searchTerm === '' || 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLevel = filterLevel === 'ALL' || entry.level === filterLevel;

      return matchesSearch && matchesLevel;
    });
  }, [logEntries, searchTerm, filterLevel]);

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / linesPerPage);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * linesPerPage;
    return filteredEntries.slice(startIndex, startIndex + linesPerPage);
  }, [filteredEntries, currentPage]);

  // Statistics
  const stats = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let infos = 0;
    let debugs = 0;

    logEntries.forEach(e => {
      // Check for functional error (Response status >= 400)
      const cleaned = e.content.replace(/^\[?\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]?\s*/, '')
          .replace(/^\w+\.(ERROR|WARN|INFO|DEBUG):\s*/, '')
          .replace(/^REQ-[a-zA-Z0-9]+\s*/, '')
          .trim();
      
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
  }, [logEntries]);

  // Group entries by request ID
  const requestGroups = useMemo((): RequestGroup[] => {
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

      // Extract response status and body from "<<< STATUS JSON" pattern
      let responseStatus: number | undefined;
      let responseErrorBody: string | undefined;

      const responseEntry = entries.find(e => {
        const cleaned = e.content.replace(/^\[?\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]?\s*/, '')
          .replace(/^\w+\.(ERROR|WARN|INFO|DEBUG):\s*/, '')
          .replace(/^REQ-[a-zA-Z0-9]+\s*/, '')
          .trim();
        return cleaned.match(/^<<<\s+(\d+)/);
      });

      if (responseEntry) {
        const cleaned = responseEntry.content.replace(/^\[?\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]?\s*/, '')
          .replace(/^\w+\.(ERROR|WARN|INFO|DEBUG):\s*/, '')
          .replace(/^REQ-[a-zA-Z0-9]+\s*/, '')
          .trim();
        const match = cleaned.match(/^<<<\s+(\d+)\s+(.*)/);
        if (match) {
          const status = parseInt(match[1]);
          responseStatus = status;
          if (status >= 400) {
            responseErrorBody = match[2];
          }
        }
      }

      // Extract URL from ">>> METHOD URL" pattern
      let url: string | undefined;
      const requestEntry = entries.find(e => {
        const cleaned = e.content.replace(/^\[?\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]?\s*/, '')
          .replace(/^\w+\.(ERROR|WARN|INFO|DEBUG):\s*/, '')
          .replace(/^REQ-[a-zA-Z0-9]+\s*/, '')
          .trim();
        return cleaned.startsWith('>>>');
      });

      if (requestEntry) {
         const cleaned = requestEntry.content.replace(/^\[?\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]?\s*/, '')
          .replace(/^\w+\.(ERROR|WARN|INFO|DEBUG):\s*/, '')
          .replace(/^REQ-[a-zA-Z0-9]+\s*/, '')
          .trim();
         
         const match = cleaned.match(/^>>>\s+(?:POST|GET|PUT|DELETE|PATCH)\s+(\S+)/);
         if (match) {
             url = match[1];
         }
      }

      const startTime = timestamps[0];
      const endTime = timestamps[timestamps.length - 1];
      
      // Calculate duration in milliseconds
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
        hasErrors,
        hasWarnings,
        environment,
        responseErrorBody,
        url,
      };
    }).sort((a, b) => {
      // Sort by start time, most recent first
      if (a.startTime && b.startTime) {
        return b.startTime.localeCompare(a.startTime);
      }
      return 0;
    });
  }, [logEntries]);

  // Get unique environments for filtering
  const environments = useMemo(() => {
    const envSet = new Set<string>();
    logEntries.forEach(entry => {
      if (entry.environment) envSet.add(entry.environment);
    });
    return Array.from(envSet).sort();
  }, [logEntries]);

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-400 bg-red-900/30';
      case 'WARN': return 'text-yellow-400 bg-yellow-900/30';
      case 'INFO': return 'text-blue-400 bg-blue-900/30';
      case 'DEBUG': return 'text-gray-400 bg-gray-800/30';
      default: return 'text-gray-300 bg-gray-800/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{fileName}</h2>
            <p className="text-gray-400">{stats.total.toLocaleString()} total lines</p>
          </div>
          <button
            onClick={onReset}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Upload New File
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <div className="text-red-400 text-sm font-semibold mb-1">ERRORS</div>
            <div className="text-2xl font-bold text-white">{stats.errors.toLocaleString()}</div>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
            <div className="text-yellow-400 text-sm font-semibold mb-1">WARNINGS</div>
            <div className="text-2xl font-bold text-white">{stats.warnings.toLocaleString()}</div>
          </div>
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
            <div className="text-blue-400 text-sm font-semibold mb-1">INFO</div>
            <div className="text-2xl font-bold text-white">{stats.infos.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800/20 border border-gray-700/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm font-semibold mb-1">DEBUG</div>
            <div className="text-2xl font-bold text-white">{stats.debugs.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle and Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setViewMode('request');
              setSelectedRequest(null);
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'request'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📋 Request View {requestGroups.length > 0 && `(${requestGroups.length})`}
          </button>
          <button
            onClick={() => {
              setViewMode('flat');
              setSelectedRequest(null);
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              viewMode === 'flat'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📄 Flat View
          </button>
        </div>

        {viewMode === 'request' ? (
          /* Request View Filters */
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by request ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                   onClick={() => setShowErrorsOnly(!showErrorsOnly)}
                   className={`px-4 py-3 rounded-lg font-semibold transition-all border ${
                     showErrorsOnly
                       ? 'bg-red-600 text-white border-red-500 shadow-lg'
                       : 'bg-gray-800 text-red-400 border-red-900/50 hover:bg-gray-700'
                   }`}
                >
                  {showErrorsOnly ? 'Showing Errors Only' : 'Show Errors Only'}
                </button>
                <div className="h-8 w-px bg-gray-700 mx-2 hidden md:block"></div>
                <button
                  onClick={() => setEnvironmentFilter('ALL')}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                    environmentFilter === 'ALL'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All Environments
                </button>
                {environments.map((env) => (
                  <button
                    key={env}
                    onClick={() => setEnvironmentFilter(env)}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                      environmentFilter === env
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Flat View Filters */
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-2">
              {['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setFilterLevel(level);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                    filterLevel === level
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {viewMode === 'flat' && (
          <div className="mt-4 text-gray-400 text-sm">
            Showing {filteredEntries.length.toLocaleString()} of {stats.total.toLocaleString()} lines
          </div>
        )}
      </div>

      {/* Content Area - Request View or Flat View */}
      {viewMode === 'request' ? (
        selectedRequest ? (
          <RequestDetail
            request={requestGroups.find(r => r.requestId === selectedRequest)!}
            onBack={() => setSelectedRequest(null)}
          />
        ) : (
          <RequestList
            requests={requestGroups}
            onSelectRequest={setSelectedRequest}
            searchTerm={searchTerm}
            environmentFilter={environmentFilter}
            showErrorsOnly={showErrorsOnly}
          />
        )
      ) : (
        /* Flat View - Original Log Display */
        <>
          {/* Log entries */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="font-mono text-sm">
                {paginatedEntries.map((entry) => (
                  <div
                    key={entry.lineNumber}
                    className={`flex border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${getLevelColor(entry.level)}`}
                  >
                    <div className="px-4 py-2 text-gray-500 text-right w-20 flex-shrink-0 border-r border-gray-700/50">
                      {entry.lineNumber}
                    </div>
                    {entry.timestamp && (
                      <div className="px-4 py-2 text-gray-400 w-48 flex-shrink-0 border-r border-gray-700/50">
                        {entry.timestamp}
                      </div>
                    )}
                    {entry.level && (
                      <div className="px-4 py-2 w-24 flex-shrink-0 border-r border-gray-700/50 font-bold">
                        {entry.level}
                      </div>
                    )}
                    <div className="px-4 py-2 flex-1 whitespace-pre-wrap break-all">
                      {entry.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <span className="text-white px-4">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
