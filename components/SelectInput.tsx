
import React from 'react';
import type { SpeakerGroup } from '../types';

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    id: string;
    groups: SpeakerGroup[];
}

export const SelectInput: React.FC<SelectInputProps> = ({ label, id, groups, ...props }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <select
                id={id}
                {...props}
                className="w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-gray-800"
            >
                {groups.map(group => (
                    <optgroup key={group.country} label={group.country}>
                        {group.speakers.map(speaker => (
                            <option key={speaker.id} value={speaker.id}>
                                {speaker.name}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>
        </div>
    );
};
