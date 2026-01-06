'use client';

import { useState } from 'react';
import LogUploader from '@/components/LogUploader';
import LogViewer from '@/components/LogViewer';

export default function Home() {
  const [logData, setLogData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileLoaded = (content: string, name: string) => {
    setLogData(content);
    setFileName(name);
  };

  const handleReset = () => {
    setLogData(null);
    setFileName('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Log File Viewer
          </h1>
          <p className="text-gray-300 text-lg">
            Upload and analyze log files up to 200MB
          </p>
        </header>

        {!logData ? (
          <LogUploader onFileLoaded={handleFileLoaded} />
        ) : (
          <LogViewer 
            logData={logData} 
            fileName={fileName}
            onReset={handleReset}
          />
        )}
      </div>
    </main>
  );
}
