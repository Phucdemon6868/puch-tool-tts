import React from 'react';
import type { ChunkJob, ProcessingState } from '../types';
import { ChunkCard } from './ChunkCard';

interface ResultsPanelProps {
    chunks: ChunkJob[];
    processingState: ProcessingState;
    mergedAudioUrl: string | null;
    onCancel: () => void;
    removeChunk: (chunkId: string) => void;
    onClearQueue: () => void;
    onDownloadAll: () => void;
    onRetryChunk: (chunkId: string) => void;
    onRetryAllFailed: () => void;
    successfulChunksCount: number;
    failedChunksCount: number;
    remainingChunksCount: number;
    totalChunksCount: number;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({ 
    chunks, processingState, mergedAudioUrl, onCancel, removeChunk, onClearQueue, onDownloadAll,
    onRetryChunk, onRetryAllFailed, successfulChunksCount, failedChunksCount, remainingChunksCount, totalChunksCount
}) => {
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
             <div className="border-b border-gray-200 pb-3 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800">Queue & Results</h2>
                        {totalChunksCount > 0 && (
                             <div className="flex items-center gap-x-4 text-xs font-medium mt-1.5 flex-wrap">
                                <span className="text-gray-500">Total: <span className="font-semibold text-gray-700">{totalChunksCount}</span></span>
                                <span className="text-green-600">Success: <span className="font-semibold">{successfulChunksCount}</span></span>
                                <span className="text-red-600">Failed: <span className="font-semibold">{failedChunksCount}</span></span>
                                <span className="text-blue-600">Remaining: <span className="font-semibold">{remainingChunksCount}</span></span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {processingState === 'idle' && chunks.length > 0 && !mergedAudioUrl && (
                             <button
                                onClick={onClearQueue}
                                className="py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                        {processingState === 'idle' && failedChunksCount > 0 && (
                            <button
                                onClick={onRetryAllFailed}
                                className="py-2 px-3 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                            >
                                Retry Failed Jobs
                            </button>
                        )}
                        {processingState === 'processing' && (
                            <button
                                onClick={onCancel}
                                className="py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                                Cancel All
                            </button>
                        )}
                    </div>
                 </div>
             </div>
            
             {mergedAudioUrl && (
                <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-indigo-800">Final Merged Audio</h3>
                         <button
                            onClick={onClearQueue}
                            className="py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <audio controls src={mergedAudioUrl} className="w-full h-10">
                            Your browser does not support the audio element.
                        </audio>
                        <button
                            onClick={onDownloadAll}
                            title="Download merged audio"
                            className="flex-shrink-0 inline-flex items-center justify-center p-3 rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

             <div className="max-h-[75vh] overflow-y-auto pr-2 space-y-3">
                {chunks.map((chunk, index) => (
                    <ChunkCard 
                        key={chunk.id} 
                        chunk={chunk} 
                        index={index} 
                        onRemove={removeChunk}
                        onRetry={onRetryChunk}
                    />
                ))}
                
                {chunks.length === 0 && (
                    <div className="text-center text-gray-500 py-16">
                        <p>Your queue is empty.</p>
                        <p className="text-sm mt-1">Add text or a file to get started.</p>
                    </div>
                )}
             </div>
        </div>
    );
};
