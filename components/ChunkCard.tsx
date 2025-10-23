import React from 'react';
import type { ChunkJob } from '../types';
import { Loader } from './Loader';

interface ChunkCardProps {
    chunk: ChunkJob;
    index: number;
    onRemove: (chunkId: string) => void;
    onRetry: (chunkId: string) => void;
}

export const ChunkCard: React.FC<ChunkCardProps> = ({ chunk, index, onRemove, onRetry }) => {
    
    const renderStatusSpecificContent = () => {
        switch (chunk.status) {
            case 'pending':
                return null; 
            case 'processing':
                return (
                    <div className="mt-2 flex items-center justify-center gap-2 text-sm text-gray-600 py-3">
                        <Loader />
                        <span>Processing...</span>
                    </div>
                );
            case 'finished':
                 if (!chunk.audioUrl) return null;
                return (
                    <div className="relative group mt-2">
                        <audio controls controlsList="nodownload" src={chunk.audioUrl} className="w-full h-8">
                            Your browser does not support the audio element.
                        </audio>
                        <a
                            href={chunk.audioUrl}
                            download={`chunk_${index + 1}.mp3`}
                            title="Download chunk"
                            className="absolute right-2 top-1/2 -translate-y-1/2 transition-opacity flex-shrink-0 inline-flex items-center justify-center p-2 rounded-full text-gray-500 bg-transparent hover:bg-gray-200 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </a>
                    </div>
                );
            case 'error':
                 return (
                    <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                        <p className="font-semibold">Error: <span className="font-normal">{chunk.error || 'An unknown error occurred.'}</span></p>
                        <button 
                          onClick={() => onRetry(chunk.id)}
                          className="mt-2 text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-3 py-1 rounded-md"
                        >
                          Retry
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-2 flex-grow min-w-0">
                    <span className="font-mono text-xs text-gray-400 pt-0.5">{index + 1}.</span>
                    <div className="flex-grow">
                        {chunk.timestamp && (
                             <p className="font-mono text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md mb-1 inline-block">
                                {chunk.timestamp}
                            </p>
                        )}
                        <p className="text-sm text-gray-800 max-h-24 overflow-y-auto pr-2">
                            {chunk.text}
                        </p>
                    </div>
                </div>
                {chunk.status === 'pending' && (
                    <button 
                        onClick={() => onRemove(chunk.id)} 
                        className="text-gray-400 hover:text-red-600 p-1 rounded-full flex-shrink-0 transition-colors ml-2"
                        aria-label="Remove chunk"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            {renderStatusSpecificContent()}
        </div>
    );
};
