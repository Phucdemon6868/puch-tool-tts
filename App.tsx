import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ChunkJob, ProcessingState } from './types';
import { APP_KEY, SPEAKER_GROUPS } from './constants';
import { TextProcessor } from './services/textProcessor';
import { synthesizeChunk } from './services/ttsService';
import { Header } from './components/Header';
import { Configuration } from './components/Configuration';
import { ResultsPanel } from './components/ResultsPanel';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
    const [token, setToken] = useState<string>(() => localStorage.getItem('capcut_tts_token') || '');
    const [chunks, setChunks] = useState<ChunkJob[]>([]);
    const [speaker, setSpeaker] = useState<string>(SPEAKER_GROUPS[0].speakers[0].id);
    const [processingState, setProcessingState] = useState<ProcessingState>('idle');
    const [maxChars, setMaxChars] = useState(1500);
    const [minCharsToMerge, setMinCharsToMerge] = useState(30);
    const [concurrentThreads, setConcurrentThreads] = useState(3);
    const [requestDelay, setRequestDelay] = useState(500);
    const [mergedAudioUrl, setMergedAudioUrl] = useState<string | null>(null);
    const [shouldProcess, setShouldProcess] = useState(false);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Calculate counts for UI
    const successfulChunksCount = chunks.filter(c => c.status === 'finished').length;
    const failedChunksCount = chunks.filter(c => c.status === 'error').length;
    const totalChunksCount = chunks.length;
    const remainingChunksCount = chunks.filter(c => c.status === 'pending' || c.status === 'processing').length;
    const pendingChunksCount = chunks.filter(c => c.status === 'pending').length;
    
    // Effect to handle merging audio when processing is complete
    useEffect(() => {
        const mergeAudio = async () => {
            try {
                const finishedChunks = chunks.filter(c => c.status === 'finished' && c.audioUrl);
                if (finishedChunks.length === 0) return;

                const blobPromises = finishedChunks.map(chunk =>
                    fetch(chunk.audioUrl!).then(res => res.blob())
                );
                const blobs = await Promise.all(blobPromises);
                const mergedBlob = new Blob(blobs, { type: 'audio/mpeg' });
                
                if (mergedAudioUrl) {
                    URL.revokeObjectURL(mergedAudioUrl);
                }

                const url = URL.createObjectURL(mergedBlob);
                setMergedAudioUrl(url);
            } catch (error) {
                console.error("Failed to merge audio files:", error);
                alert("An error occurred while merging the files.");
            }
        };

        const areAllJobsDone = chunks.length > 0 && chunks.every(c => c.status === 'finished' || c.status === 'error');
        const hasFinishedChunks = chunks.some(c => c.status === 'finished');

        // Only merge if all jobs are done AND there are no errors.
        if (processingState === 'idle' && areAllJobsDone && hasFinishedChunks && failedChunksCount === 0) {
            mergeAudio();
        } else {
            if (mergedAudioUrl) {
                URL.revokeObjectURL(mergedAudioUrl);
                setMergedAudioUrl(null);
            }
        }
        
        return () => {
            if (mergedAudioUrl) {
                URL.revokeObjectURL(mergedAudioUrl);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chunks, processingState, failedChunksCount]);


    const addContent = (content: string | Array<{ text: string; timestamp: string }>) => {
        let newChunkJobs: ChunkJob[];

        if (typeof content === 'string') {
            const textProcessor = new TextProcessor(maxChars, minCharsToMerge);
            const textChunks = textProcessor.process(content);
            newChunkJobs = textChunks.map(text => ({
                id: uuidv4(),
                text,
                status: 'pending',
            }));
        } else {
            // Content is an array of subtitle chunks
            newChunkJobs = content.map(chunk => ({
                id: uuidv4(),
                text: chunk.text,
                timestamp: chunk.timestamp,
                status: 'pending',
            }));
        }
        
        setChunks(prevChunks => [...prevChunks, ...newChunkJobs]);
    };

    const removeChunk = (chunkId: string) => {
        setChunks(prevChunks => prevChunks.filter(chunk => chunk.id !== chunkId));
    };

    const clearQueue = () => {
        setChunks([]);
    };

    const updateChunk = (chunkId: string, updates: Partial<ChunkJob>) => {
        setChunks(prevChunks => 
            prevChunks.map(chunk => 
                chunk.id === chunkId ? { ...chunk, ...updates } : chunk
            )
        );
    };
    
    const retryChunk = (chunkId: string) => {
        setChunks(prev => 
            prev.map(c => c.id === chunkId ? { ...c, status: 'pending', error: null } : c)
        );
        setShouldProcess(true);
    };

    const retryAllFailed = () => {
        setChunks(prev => 
            prev.map(c => c.status === 'error' ? { ...c, status: 'pending', error: null } : c)
        );
        setShouldProcess(true);
    };

    const processQueue = useCallback(async () => {
        if (!token) {
            alert('Token is required.');
            return;
        }

        setProcessingState('processing');
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        
        const chunksToProcess = chunks.filter(c => c.status === 'pending');
        if (chunksToProcess.length === 0) {
            setProcessingState('idle');
            return;
        }

        const processSingleChunk = async (chunk: ChunkJob) => {
            if (signal.aborted) return;
            
            updateChunk(chunk.id, { status: 'processing', error: null });
            
            try {
                const audioUrl = await synthesizeChunk({
                    text: chunk.text,
                    speaker,
                    token,
                    appkey: APP_KEY,
                });
                if (!signal.aborted) {
                    updateChunk(chunk.id, { status: 'finished', audioUrl });
                }
            } catch (err) {
                 if (!signal.aborted) {
                    updateChunk(chunk.id, { status: 'error', error: (err as Error).message });
                }
            }
        };
        
        const queue = [...chunksToProcess];
        
        const workerPromises = Array(concurrentThreads).fill(null).map(async () => {
            while (queue.length > 0) {
                if (signal.aborted) break;
                const chunk = queue.shift();
                if (chunk) {
                    await processSingleChunk(chunk);
                    if (requestDelay > 0 && !signal.aborted) {
                        await new Promise(resolve => setTimeout(resolve, requestDelay));
                    }
                }
            }
        });

        await Promise.all(workerPromises);
        
        if (!signal.aborted) {
            setProcessingState('idle');
        }

    }, [chunks, token, speaker, concurrentThreads, requestDelay]);

    // Effect to automatically run the queue when a retry is triggered
    useEffect(() => {
        if (shouldProcess) {
            // Use a timeout to allow React to commit state changes before starting the heavy processing
            const timer = setTimeout(() => {
                processQueue();
                setShouldProcess(false);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [shouldProcess, processQueue]);


    const handleCancel = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setChunks(prev => prev.map(c => c.status === 'processing' ? { ...c, status: 'pending' } : c));
            setProcessingState('idle');
        }
    };

    const handleDownloadAll = () => {
        if (!mergedAudioUrl) {
            alert("Merged audio is not available.");
            return;
        }
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = mergedAudioUrl;
        a.download = 'merged_output.mp3';
        document.body.appendChild(a);
        a.click();
        a.remove();
    };
    
    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Configuration
                    token={token}
                    setToken={setToken}
                    speaker={speaker}
                    setSpeaker={setSpeaker}
                    speakerGroups={SPEAKER_GROUPS}
                    isProcessing={processingState === 'processing'}
                    onProcessQueue={processQueue}
                    onAddContent={addContent}
                    pendingChunksCount={pendingChunksCount}
                    maxChars={maxChars}
                    setMaxChars={setMaxChars}
                    minCharsToMerge={minCharsToMerge}
                    setMinCharsToMerge={setMinCharsToMerge}
                    concurrentThreads={concurrentThreads}
                    setConcurrentThreads={setConcurrentThreads}
                    requestDelay={requestDelay}
                    setRequestDelay={setRequestDelay}
                />
                <ResultsPanel
                    chunks={chunks}
                    processingState={processingState}
                    mergedAudioUrl={mergedAudioUrl}
                    onCancel={handleCancel}
                    removeChunk={removeChunk}
                    onClearQueue={clearQueue}
                    onDownloadAll={handleDownloadAll}
                    onRetryChunk={retryChunk}
                    onRetryAllFailed={retryAllFailed}
                    successfulChunksCount={successfulChunksCount}
                    failedChunksCount={failedChunksCount}
                    remainingChunksCount={remainingChunksCount}
                    totalChunksCount={totalChunksCount}
                />
            </main>
        </div>
    );
};

export default App;