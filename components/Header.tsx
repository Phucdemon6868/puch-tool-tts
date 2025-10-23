import React from 'react';
import { Logo } from './Logo';

export const Header: React.FC = () => {
    return (
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center gap-x-4">
                    <Logo className="h-12 w-12" />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            PUCH TOOL TTS
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            A powerful tool for batch text-to-speech synthesis.
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
};