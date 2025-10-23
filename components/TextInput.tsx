import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
}

export const TextInput: React.FC<TextInputProps> = ({ label, id, ...props }) => {
    const isRange = props.type === 'range';
    
    const baseClasses = "w-full focus:ring-indigo-500 focus:border-indigo-500 transition";
    const rangeClasses = "h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600";
    const textClasses = "bg-gray-50 border border-gray-300 rounded-md shadow-sm p-2 text-gray-800";

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <input
                id={id}
                {...props}
                className={`${baseClasses} ${isRange ? rangeClasses : textClasses}`}
            />
        </div>
    );
};
