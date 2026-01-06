'use client';

import { useCallback, useState } from 'react';

interface LogUploaderProps {
  onFileLoaded: (content: string, fileName: string) => void;
}

export default function LogUploader({ onFileLoaded }: LogUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    setProgress(0);

    try {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentLoaded = Math.round((event.loaded / event.total) * 100);
          setProgress(percentLoaded);
        }
      };

      reader.onload = (event) => {
        const content = event.target?.result as string;
        onFileLoaded(content, file.name);
        setIsLoading(false);
      };

      reader.onerror = () => {
        alert('Error reading file');
        setIsLoading(false);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file');
      setIsLoading(false);
    }
  }, [onFileLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-4 border-dashed rounded-2xl p-12 text-center
          transition-all duration-300 ease-in-out
          ${isDragging 
            ? 'border-purple-500 bg-purple-500/10 scale-105' 
            : 'border-gray-600 bg-gray-800/50 hover:border-purple-400 hover:bg-gray-800/70'
          }
          ${isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
      >
        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
            <p className="text-white text-xl font-semibold">Loading file...</p>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-gray-300">{progress}%</p>
          </div>
        ) : (
          <>
            <svg
              className="mx-auto h-20 w-20 text-purple-400 mb-6"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-2xl font-bold text-white block mb-2">
                Drop your log file here
              </span>
              <span className="text-gray-300 block mb-6">
                or click to browse
              </span>
              <span className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                Select File
              </span>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".log,.txt"
                onChange={handleFileInput}
              />
            </label>
            <p className="text-gray-400 text-sm mt-6">
              Supports files up to 200MB (.log, .txt)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
