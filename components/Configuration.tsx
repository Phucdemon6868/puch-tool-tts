import React, { useState, useEffect } from 'react';
import type { SpeakerGroup } from '../types';
import { FileUpload } from './FileUpload';
import { SelectInput } from './SelectInput';
import { TextInput } from './TextInput';

interface ConfigurationProps {
    token: string;
    setToken: (token: string) => void;
    speaker: string;
    setSpeaker: (speakerId: string) => void;
    speakerGroups: SpeakerGroup[];
    isProcessing: boolean;
    onProcessQueue: () => void;
    onAddContent: (content: string | Array<{ text: string; timestamp: string }>) => void;
    pendingChunksCount: number;
    maxChars: number;
    setMaxChars: (value: number) => void;
    minCharsToMerge: number;
    setMinCharsToMerge: (value: number) => void;
    concurrentThreads: number;
    setConcurrentThreads: (value: number) => void;
    requestDelay: number;
    setRequestDelay: (value: number) => void;
}

export const Configuration: React.FC<ConfigurationProps> = ({
    token, setToken, speaker, setSpeaker, speakerGroups, isProcessing,
    onProcessQueue, onAddContent, pendingChunksCount,
    maxChars, setMaxChars, minCharsToMerge, setMinCharsToMerge,
    concurrentThreads, setConcurrentThreads, requestDelay, setRequestDelay
}) => {
    const [textToAdd, setTextToAdd] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Save token to localStorage whenever it changes
    useEffect(() => {
        if (token) {
            localStorage.setItem('capcut_tts_token', token);
        } else {
            localStorage.removeItem('capcut_tts_token');
        }
    }, [token]);


    const handleAddTextJob = () => {
        if (!textToAdd.trim()) return;
        onAddContent(textToAdd.trim());
        setTextToAdd('');
    };

    const handleFileAdded = (content: string | Array<{ text: string; timestamp: string }>, file: File) => {
        onAddContent(content);
    };
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 h-fit">
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-3">Configuration</h2>
                
                <div>
                    <TextInput
                        id="token"
                        label="API Token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Enter your authentication token"
                        type="password"
                        required
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                        Your token is saved in your browser. You can get this from the CapCut web interface using your browser's developer tools (F12).
                    </p>
                </div>


                <SelectInput
                    id="speaker"
                    label="Speaker Voice"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                    groups={speakerGroups}
                />

                {/* Advanced Settings */}
                <div>
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                    </button>
                    {showAdvanced && (
                        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                            <TextInput id="concurrentThreads" label={`Concurrent Threads (${concurrentThreads})`} type="range" min="1" max="10" value={concurrentThreads} onChange={e => setConcurrentThreads(parseInt(e.target.value, 10))} />
                            <TextInput id="maxChars" label="Max Chars per Chunk" type="number" value={maxChars} onChange={e => setMaxChars(parseInt(e.target.value, 10))} />
                            <TextInput id="minCharsToMerge" label="Min Chars to Merge" type="number" value={minCharsToMerge} onChange={e => setMinCharsToMerge(parseInt(e.target.value, 10))} />
                            <TextInput id="requestDelay" label={`Delay Between Requests (${requestDelay}ms)`} type="range" min="0" max="5000" step="100" value={requestDelay} onChange={e => setRequestDelay(parseInt(e.target.value, 10))} />
                        </div>
                    )}
                </div>

                 {/* Add Job section */}
                <div className="space-y-2 border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-medium text-gray-700">Add to Queue</h3>
                    <div className="border border-gray-300 rounded-lg shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition">
                        <textarea
                            id="text-add"
                            value={textToAdd}
                            onChange={(e) => setTextToAdd(e.target.value)}
                            placeholder="Paste text here or upload a file..."
                            rows={5}
                            className="w-full border-0 resize-y p-3 focus:ring-0 text-base text-gray-800 bg-gray-50 placeholder-gray-500"
                        />
                        <div className="flex items-center justify-between p-1 bg-white border-t border-gray-200">
                            <FileUpload onFileProcessed={handleFileAdded} />
                            <button
                                onClick={handleAddTextJob}
                                className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!textToAdd.trim()}
                            >
                                Add Text
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onProcessQueue}
                    disabled={isProcessing || pendingChunksCount === 0}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isProcessing ? 'Processing...' : `Process Queue (${pendingChunksCount})`}
                </button>
            </div>
        </div>
    );
};