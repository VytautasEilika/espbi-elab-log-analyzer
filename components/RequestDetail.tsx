'use client';

import { useMemo, useState } from 'react';
import { 
  LogEntry, 
  RequestGroup, 
  cleanLogContent, 
  formatDuration, 
  formatJSON, 
  getLevelColor,
  formatXML,
  getHttpStatusColor
} from '@/lib/log-parser';

interface RequestDetailProps {
  request: RequestGroup;
  onBack: () => void;
}

const getMethodColor = (method: string) => {
  switch (method.toUpperCase()) {
    case 'GET': return 'bg-green-900/50 text-green-300 border-green-700';
    case 'POST': return 'bg-blue-900/50 text-blue-300 border-blue-700';
    case 'PUT': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
    case 'DELETE': return 'bg-red-900/50 text-red-300 border-red-700';
    default: return 'bg-gray-700 text-gray-300 border-gray-600';
  }
};

const CopyButton = ({ text, className = "" }: { text: string, className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-gray-500 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50 ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );
};

const LogEntryRow = ({ entry, getLevelColor, cleanLogContent, duration }: { 
  entry: LogEntry, 
  getLevelColor: (l?: string) => string,
  cleanLogContent: (c: string) => string,
  duration?: number
}) => {
  const [showRaw, setShowRaw] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const cleanedContent = cleanLogContent(entry.content);
  
  // Pattern Matchers
  const incomingMatch = cleanedContent.match(/^>>>\s+(POST|GET|PUT|DELETE|PATCH)\s+(\S+)\s+(.*)/);
  const outgoingMatch = cleanedContent.match(/^doRequest:\s+(POST|GET|PUT|DELETE|PATCH)\s+(\w+)\s+(.*)/);
  const cacheMatch = cleanedContent.match(/^(getResourceFromCache|getResourceFromSession):\s+(.+)/);
  const saveSessionMatch = cleanedContent.match(/^saveResourceToSession:\s+(.+)/);
  const saveCacheMatch = cleanedContent.match(/^saveResourceToCache:\s+(.+)/);
  const cacheMissMatch = cleanedContent.match(/^Cache not found/);
  const statusMatch = cleanedContent.match(/^Response StatusCode:\s+(\d+)/);
  const statusJsonMatch = cleanedContent.match(/^Response status:\s+\{"status":(\d+)\}/);
  const contentTypeMatch = cleanedContent.match(/^Response ContentType:\s+(\d+)/);
  const headersMatch = cleanedContent.match(/^Request headers:\s+(.*)/);
  const responseHeadersMatch = cleanedContent.match(/^Response Headers:\s+(.*)/);
  const requestBodyMatch = cleanedContent.match(/^Request body:\s*(\{[\s\S]*)/);
  const responseBodyMatch = cleanedContent.match(/^Response body:\s*(\{[\s\S]*)/);
  const returnMatch = cleanedContent.match(/^<<<\s+(\d+)\s+(.*)/);
  
  // External Request Matchers
  const extStartMatch = cleanedContent.match(/^Request started\.\.\./);
  const extUrlMatch = cleanedContent.match(/^Request URL:\s+(\{.*\})/);
  const extEndMatch = cleanedContent.match(/^Request ended\./);

  // Request XML Matcher
  const requestXmlMatch = cleanedContent.match(/^request:\s*(<\?xml[\s\S]*)/i) || cleanedContent.match(/^request:\s*(<[\s\S]*)/i);
  
  // Bare JSON Matcher (Content starting with { or [)
  // We check this last or ensure it doesn't conflict, but since other matches look for prefixes, 
  // a line starting immediately with { or [ is likely a bare JSON dump.
  const bareJsonMatch = !incomingMatch && !outgoingMatch && !cacheMatch && !saveSessionMatch && 
                        !saveCacheMatch && !cacheMissMatch && !statusMatch && !statusJsonMatch && 
                        !contentTypeMatch && !headersMatch && !responseHeadersMatch && 
                        !requestBodyMatch && !responseBodyMatch && !returnMatch && !extUrlMatch &&
                        cleanedContent.match(/^(\{[\s\S]*|\[[\s\S]*)/);

  // Match XML Response that might span multiple lines
  // The cleaned content can contain "Response: <?xml..." matches
  const xmlMatch = cleanedContent.match(/^Response:\s*(<\?xml[\s\S]*)/) || cleanedContent.match(/^Response:\s*(<[\s\S]*)/);

  const isSpecialEntry = incomingMatch || outgoingMatch || cacheMatch || saveSessionMatch || saveCacheMatch || cacheMissMatch || statusMatch || statusJsonMatch || contentTypeMatch || headersMatch || responseHeadersMatch || requestBodyMatch || responseBodyMatch || returnMatch || extStartMatch || extUrlMatch || extEndMatch || xmlMatch || bareJsonMatch || requestXmlMatch;


  // Helper to handle JSON/XML visualization
  const renderBody = (content: string, type: 'json' | 'xml', previewLines = 10) => {
    let formatted = content;
    if (type === 'json') {
      formatted = formatJSON(content);
    } else {
      // Basic cheap XML formatting since we don't have a library
      try {
          // Check if already formatted (has newlines)
          if (!content.includes('\n')) {
             formatted = formatXML(content);
          }
      } catch (e) {
          // If formatting fails, use original
      }
    }
    
    const lines = formatted.split('\n');
    const shouldTruncate = lines.length > previewLines;
    const isInitiallyHidden = previewLines === 0;
    
    // Determine what to display
    const showContent = !isInitiallyHidden || isExpanded;
    
    const displayLines = shouldTruncate && !isExpanded 
      ? lines.slice(0, previewLines).join('\n') + (previewLines > 0 ? '\n...' : '') 
      : formatted;

    return (
      <div className="relative group/body">
        <div className="absolute right-2 top-2 opacity-0 group-hover/body:opacity-100 transition-opacity z-10 flex gap-2">
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-xs text-blue-400 hover:text-blue-300 bg-gray-800/80 backdrop-blur px-2 py-1 rounded shadow-sm border border-gray-700/50"
            >
              Show Less
            </button>
          )}
          <CopyButton text={content} className="bg-gray-800 shadow-sm" />
        </div>
        {showContent && (
          <div className="bg-gray-900/50 rounded-lg p-3 overflow-x-auto border border-gray-700/50">
            <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{displayLines}</pre>
          </div>
        )}
        {(shouldTruncate || isInitiallyHidden) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-1 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
          >
             {isExpanded ? 'Show Less' : (isInitiallyHidden ? `Show Content (${lines.length} lines)` : `Show More (${lines.length} lines)`)}
          </button>
        )}
      </div>
    );
  };


  return (
    <div className={`flex border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${getLevelColor(entry.level)}`}>
      <div className="px-4 py-2 text-gray-500 text-right w-20 flex-shrink-0 border-r border-gray-700/50 select-none">
        {entry.lineNumber}
      </div>
      
      {entry.timestamp && (
        <div className="px-4 py-2 text-gray-400 w-48 flex-shrink-0 border-r border-gray-700/50 whitespace-nowrap">
          {entry.timestamp}
        </div>
      )}
      
      {entry.level && (
        <div className="px-4 py-2 w-24 flex-shrink-0 border-r border-gray-700/50 font-bold">
          {entry.level}
        </div>
      )}

      <div className="px-4 py-2 flex-1 min-w-0">
        {!showRaw && isSpecialEntry ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              
              {/* --- Incoming Request --- */}
              {incomingMatch && (
                <>
                  <div className="flex items-center gap-2 text-cyan-400" title="Incoming Request">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-xs font-bold ${getMethodColor(incomingMatch[1])}`}>
                    {incomingMatch[1]}
                  </span>
                  <span className="font-mono text-purple-300 font-medium break-all">{incomingMatch[2]}</span>
                  <CopyButton text={incomingMatch[2]} />
                </>
              )}


              {/* --- Return Response --- */}
              {returnMatch && (
                <>
                  <div className="flex items-center gap-2 text-emerald-400" title="Response Returning">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-xs font-bold ${getHttpStatusColor(parseInt(returnMatch[1]))}`}>
                    {returnMatch[1]}
                  </span>
                </>
              )}

              {/* --- Outgoing Request --- */}
              {outgoingMatch && (
                <>
                  <div className="flex items-center gap-2 text-orange-400" title="Outgoing Request">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-xs font-bold ${getMethodColor(outgoingMatch[1])}`}>
                    {outgoingMatch[1]}
                  </span>
                  <div className="flex gap-2 items-center">
                    <span className="font-bold text-gray-300">{outgoingMatch[2]}</span>
                    <span className="font-mono text-gray-400 text-xs break-all">
                      {(() => { try { return decodeURIComponent(outgoingMatch[3]); } catch { return outgoingMatch[3]; } })()}
                    </span>
                    <CopyButton text={outgoingMatch[3]} />
                  </div>
                </>
              )}

              {/* --- Cache/Session Lookup --- */}
              {cacheMatch && (
                 <>
                   <div className="flex items-center gap-2 text-teal-400" title="Cache/Session Lookup">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                     </svg>
                   </div>
                   <span className="text-teal-300 font-semibold font-mono break-all">{cacheMatch[2]}</span>
                   <CopyButton text={cacheMatch[2]} />
                 </>
              )}

              {/* --- Save Session --- */}
              {saveSessionMatch && (
                 <>
                   <div className="flex items-center gap-2 text-blue-400" title="Save to Session">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                     </svg>
                   </div>
                   <span className="text-blue-300 font-semibold font-mono break-all">{saveSessionMatch[1]}</span>
                   <CopyButton text={saveSessionMatch[1]} />
                 </>
              )}

              {/* --- Save to Cache --- */}
              {saveCacheMatch && (
                 <>
                   <div className="flex items-center gap-2 text-indigo-400" title="Save to Cache">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                     </svg>
                   </div>
                   <span className="text-indigo-300 font-semibold font-mono break-all">{saveCacheMatch[1]}</span>
                   <CopyButton text={saveCacheMatch[1]} />
                 </>
              )}

              {/* --- Cache Miss --- */}
              {cacheMissMatch && (
                 <>
                   <div className="flex items-center gap-2 text-yellow-500" title="Cache Miss">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                   </div>
                   <span className="text-yellow-500 font-semibold italic">Cache not found</span>
                 </>
              )}

              {/* --- Status Code --- */}
              {statusMatch && (
                <>
                  <div className="flex items-center gap-2 text-gray-400" title="Response Status">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-xs font-bold ${getHttpStatusColor(parseInt(statusMatch[1]))}`}>
                    StatusCode: {statusMatch[1]}
                  </span>
                </>
              )}



              {/* --- Status Code (JSON) --- */}
              {statusJsonMatch && (
                <>
                  <div className="flex items-center gap-2 text-gray-400" title="Response Status">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-xs font-bold ${getHttpStatusColor(parseInt(statusJsonMatch[1]))}`}>
                    StatusCode: {statusJsonMatch[1]}
                  </span>
                </>
              )}

              {/* --- Content Type --- */}
              {contentTypeMatch && (
                <>
                  <div className="flex items-center gap-2 text-gray-400" title="Content Type">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-xs font-bold ${
                    contentTypeMatch[1] === '5' ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700' :
                    contentTypeMatch[1] === '1' ? 'bg-orange-900/50 text-orange-300 border-orange-700' :
                    'bg-gray-700 text-gray-300 border-gray-600'
                  }`}>
                    {contentTypeMatch[1] === '5' ? 'JSON' :
                     contentTypeMatch[1] === '1' ? 'XML' :
                     `Type: ${contentTypeMatch[1]}`}
                  </span>
                </>
              )}

              {/* --- Response Body --- */}
              {responseBodyMatch && (
                <>
                  <div className="flex items-center gap-2 text-purple-400" title="Response Body">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  </div>
                  <span className="text-purple-300 font-semibold">Response Body (JSON)</span>
                </>
              )}



              {/* --- External Request Start --- */}
              {extStartMatch && (
                <>
                  <div className="flex items-center gap-2 text-blue-400" title="External Request Started">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-blue-300 font-semibold italic">External Request Started...</span>
                </>
              )}

              {/* --- External Request URL --- */}
              {extUrlMatch && (
                <>
                  <div className="flex items-center gap-2 text-blue-400" title="Target URL">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <span className="text-blue-200 font-mono break-all text-xs">
                    {(() => {
                        try {
                            const parsed = JSON.parse(extUrlMatch[1]);
                            return parsed.url;
                        } catch {
                            return extUrlMatch[1];
                        }
                    })()}
                  </span>
                  <CopyButton text={(() => {
                        try {
                            const parsed = JSON.parse(extUrlMatch[1]);
                            return parsed.url;
                        } catch {
                            return extUrlMatch[1];
                        }
                    })()} 
                  />
                </>
              )}

              {/* --- External Request End --- */}
              {extEndMatch && (
                 <>
                   <div className="flex items-center gap-2 text-green-400" title="External Request Completed">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="text-green-300 font-semibold italic">External Request Completed.</span>
                     {duration !== undefined && (
                        <span className="text-xs font-mono bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-gray-300">
                          {duration}ms
                        </span>
                     )}
                   </div>
                 </>
              )}

              {/* --- XML Response --- */}
              {xmlMatch && (
                <>
                  <div className="flex items-center gap-2 text-purple-400" title="XML Response">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <span className="text-purple-300 font-semibold">Response Body (XML)</span>
                </>
              )}

              {/* --- XML Request --- */}
              {requestXmlMatch && (
                <>
                  <div className="flex items-center gap-2 text-cyan-400" title="XML Request">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <span className="text-cyan-300 font-semibold">Request Body (XML)</span>
                </>
              )}

              {/* --- Request Headers --- */}
              {headersMatch && (
                <>
                  <div className="flex items-center gap-2 text-pink-400" title="Request Headers">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <span className="text-pink-300 font-semibold">Request Headers</span>
                </>
              )}
              
              {/* --- Response Headers --- */}
              {responseHeadersMatch && (
                <>
                  <div className="flex items-center gap-2 text-purple-400" title="Response Headers">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <span className="text-purple-300 font-semibold">Response Headers</span>
                </>
              )}

              {/* --- Request Body --- */}
              {requestBodyMatch && (
                <>
                  <div className="flex items-center gap-2 text-cyan-400" title="Request Body">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-cyan-300 font-semibold">Request Body (JSON)</span>
                </>
              )}

              {/* --- Bare JSON --- */}
              {bareJsonMatch && (
                 <>
                   <div className="flex items-center gap-2 text-yellow-500" title="JSON Content">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                     </svg>
                   </div>
                   <span className="text-yellow-400 font-semibold">JSON Content</span>
                 </>
              )}

              {/* --- Tools --- */}
              <button 
                onClick={() => setShowRaw(true)}
                className="ml-auto text-xs text-gray-500 hover:text-gray-300 underline"
              >
                Show Raw
              </button>
            </div>

            {/* Bodies */}
            {returnMatch && renderBody(returnMatch[2], 'json')}
            {incomingMatch && renderBody(incomingMatch[3], 'json')}
            {xmlMatch && renderBody(xmlMatch[1], 'xml')}
            {requestXmlMatch && renderBody(requestXmlMatch[1], 'xml')}
            {responseBodyMatch && renderBody(responseBodyMatch[1], 'json')}
            {requestBodyMatch && renderBody(requestBodyMatch[1], 'json')}
            {bareJsonMatch && renderBody(bareJsonMatch[1], 'json')}
            {headersMatch && renderBody(headersMatch[1], 'json', 0)}
            {responseHeadersMatch && renderBody(responseHeadersMatch[1], 'json', 0)}
          </div>
        ) : (
          <div 
            onClick={() => isSpecialEntry && setShowRaw(!showRaw)}
            className={`${isSpecialEntry ? 'cursor-pointer group' : ''}`}
          >
            <div className="whitespace-pre-wrap break-all relative pr-8">
              {cleanedContent}
              <div className="absolute right-0 top-0 flex gap-2">
                <CopyButton text={entry.content} />
                {isSpecialEntry && showRaw && (
                   <span className="text-xs text-gray-500 hover:text-gray-300 underline bg-gray-900 px-2 rounded cursor-pointer">
                     Format
                   </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function RequestDetail({ request, onBack }: RequestDetailProps) {


  // Calculate durations for external requests
  const externalDurations = useMemo(() => {
     const durations = new Map<number, number>();
     const startTimes: { time: number, line: number }[] = [];

     request.entries.forEach(entry => {
        if (!entry.timestamp) return;

        const content = cleanLogContent(entry.content);
        if (content.match(/^Request started\.\.\./)) {
            startTimes.push({ time: new Date(entry.timestamp).getTime(), line: entry.lineNumber });
        } else if (content.match(/^Request ended\./)) {
            const start = startTimes.pop();
            if (start) {
                const end = new Date(entry.timestamp).getTime();
                durations.set(entry.lineNumber, end - start.time);
            }
        }
     });

     return durations;
  }, [request.entries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
          <button 
            onClick={onBack}
            data-testid="back-button"
            className="mb-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Requests
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 font-mono">
              {request.requestId}
            </h2>
            <div className="flex gap-2">
              {request.environment && (
                <span className="px-3 py-1 bg-purple-600 text-white text-sm font-semibold rounded-full">
                  {request.environment}
                </span>
              )}
              {request.hasErrors && (
                <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded-full">
                  {request.entries.filter(e => e.level === 'ERROR').length} ERRORS
                </span>
              )}
              {request.hasWarnings && (
                <span className="px-3 py-1 bg-yellow-600 text-white text-sm font-bold rounded-full">
                  {request.entries.filter(e => e.level === 'WARN').length} WARNINGS
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Duration</div>
            <div className="text-white font-semibold font-mono text-lg">{formatDuration(request.durationMs)}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Start Time</div>
            <div className="text-white font-semibold font-mono text-xs">{request.startTime || 'N/A'}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">End Time</div>
            <div className="text-white font-semibold font-mono text-xs">{request.endTime || 'N/A'}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Total Entries</div>
            <div className="text-white font-semibold">{request.entries.length}</div>
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Log Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <div className="font-mono text-sm">
            {request.entries.map((entry) => (
              <LogEntryRow 
                key={entry.lineNumber} 
                entry={entry} 
                getLevelColor={getLevelColor}
                cleanLogContent={cleanLogContent}
                duration={externalDurations.get(entry.lineNumber)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
