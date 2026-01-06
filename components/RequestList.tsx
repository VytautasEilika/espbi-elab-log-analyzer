'use client';

import { useMemo } from 'react';

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

interface RequestListProps {
  requests: RequestGroup[];
  onSelectRequest: (requestId: string) => void;
  searchTerm: string;
  environmentFilter: string;
  showErrorsOnly: boolean;
}

export default function RequestList({ 
  requests, 
  onSelectRequest,
  searchTerm,
  environmentFilter,
  showErrorsOnly
}: RequestListProps) {
  
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = searchTerm === '' || 
        request.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.url && request.url.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesEnv = environmentFilter === 'ALL' || 
        request.environment === environmentFilter;

      const matchesError = !showErrorsOnly || 
        request.hasErrors || 
        (request.responseStatus !== undefined && request.responseStatus >= 400);

      return matchesSearch && matchesEnv && matchesError;
    });
  }, [requests, searchTerm, environmentFilter, showErrorsOnly]);

  const getStatusColor = (request: RequestGroup) => {
    if ((request.responseStatus && request.responseStatus >= 400) || request.hasErrors) return 'border-red-500 bg-red-900/20';
    if (request.hasWarnings) return 'border-yellow-500 bg-yellow-900/20';
    return 'border-green-500 bg-green-900/20';
  };

  const getStatusBadge = (request: RequestGroup) => {
    if (request.responseStatus && request.responseStatus >= 400) {
      return (
        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
          ERROR {request.responseStatus}
        </span>
      );
    }
    if (request.hasErrors) {
      return (
        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
          ERROR
        </span>
      );
    }
    if (request.hasWarnings) {
      return (
        <span className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold rounded-full">
          WARNING
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
        SUCCESS
      </span>
    );
  };

  const formatJSON = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return jsonString;
    }
  };

  const formatDuration = (durationMs?: number): string => {
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

  return (
    <div className="space-y-4">
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No requests found matching your filters
        </div>
      ) : (
        filteredRequests.map((request) => (
          <div
            key={request.requestId}
            onClick={() => onSelectRequest(request.requestId)}
            className={`
              border-2 rounded-xl p-6 cursor-pointer
              transition-all duration-200 hover:scale-[1.02] hover:shadow-xl
              ${getStatusColor(request)}
            `}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white font-mono">
                    {request.requestId}
                  </h3>
                  {request.url && (
                    <span className="text-sm font-mono text-gray-400 bg-gray-900/50 px-2 py-0.5 rounded border border-gray-700/50 break-all">
                      {request.url}
                    </span>
                  )}
                </div>
                {request.environment && (
                  <span className="inline-block px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full mr-2">
                    {request.environment}
                  </span>
                )}
                {getStatusBadge(request)}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <div className="text-gray-400 mb-1">Entries</div>
                <div className="text-white font-semibold">{request.entries.length}</div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Duration</div>
                <div className="text-white font-semibold font-mono">
                  {formatDuration(request.durationMs)}
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Start Time</div>
                <div className="text-white font-semibold font-mono text-xs">
                  {request.startTime || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">End Time</div>
                <div className="text-white font-semibold font-mono text-xs">
                  {request.endTime || 'N/A'}
                </div>
              </div>
              <div className="md:col-span-1">
                <div className="text-gray-400 mb-1">Status</div>
                <div className="flex gap-2">
                  {(request.hasErrors || (request.responseStatus && request.responseStatus >= 400)) && (
                    <span className="text-red-400 text-xs">
                       Error
                    </span>
                  )}
                  {request.hasWarnings && (
                    <span className="text-yellow-400 text-xs">
                      {request.entries.filter(e => e.level === 'WARN').length} warnings
                    </span>
                  )}
                  {!request.hasErrors && !(request.responseStatus && request.responseStatus >= 400) && !request.hasWarnings && (
                    <span className="text-green-400 text-xs">Clean</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Error Preview */}
            {request.responseErrorBody && (
               <div className="mt-4 border-t border-gray-700/50 pt-4" onClick={(e) => e.stopPropagation()}>
                 <details className="group">
                   <summary className="text-red-400 text-sm font-semibold cursor-pointer select-none list-none flex items-center gap-2">
                     <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                     <span>Show Error Details</span>
                   </summary>
                   <div className="mt-2 bg-gray-900/50 rounded-lg p-3 overflow-x-auto border border-red-900/30">
                     <pre className="text-xs font-mono text-red-200 whitespace-pre-wrap">
                       {formatJSON(request.responseErrorBody)}
                     </pre>
                   </div>
                 </details>
               </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
