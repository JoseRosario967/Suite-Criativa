import React from 'react';
import type { WatermarkPosition } from '../types';

interface PositionGridProps {
    selected: WatermarkPosition;
    onSelect: (position: WatermarkPosition) => void;
}

const POSITIONS: WatermarkPosition[] = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'middle-center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right',
];

const positionLabels: Record<WatermarkPosition, string> = {
    'top-left': 'Superior Esquerdo',
    'top-center': 'Superior Centro',
    'top-right': 'Superior Direito',
    'middle-left': 'Meio Esquerdo',
    'middle-center': 'Meio Centro',
    'middle-right': 'Meio Direito',
    'bottom-left': 'Inferior Esquerdo',
    'bottom-center': 'Inferior Centro',
    'bottom-right': 'Inferior Direito',
};

export const PositionGrid: React.FC<PositionGridProps> = ({ selected, onSelect }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Posição</label>
            <div className="grid grid-cols-3 gap-2 w-24 h-24 p-1 bg-gray-900 rounded-md">
                {POSITIONS.map(pos => (
                    <button
                        key={pos}
                        onClick={() => onSelect(pos)}
                        className={`flex items-center justify-center rounded-md transition-colors ${
                            selected === pos ? 'bg-indigo-600' : 'bg-gray-600'
                        }`}
                        aria-label={`Posição ${positionLabels[pos]}`}
                    >
                       <div className={`w-2 h-2 rounded-full ${selected === pos ? 'bg-white' : 'bg-gray-500'}`}></div>
                    </button>
                ))}
            </div>
        </div>
    );
};