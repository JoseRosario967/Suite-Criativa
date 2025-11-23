import React from 'react';
import { AspectRatio } from '../types';
import { Square, Smartphone, Monitor } from 'lucide-react';

interface AspectRatioSelectProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
  disabled?: boolean;
}

export const AspectRatioSelect: React.FC<AspectRatioSelectProps> = ({ value, onChange, disabled }) => {
  const ratios: { value: AspectRatio; label: string; icon: React.ReactNode }[] = [
    { value: '1:1', label: 'Quadrado', icon: <Square className="w-4 h-4" /> },
    { value: '16:9', label: 'Paisagem', icon: <Monitor className="w-4 h-4" /> },
    { value: '9:16', label: 'Retrato', icon: <Smartphone className="w-4 h-4" /> },
    { value: '4:3', label: 'Padrão', icon: <Monitor className="w-4 h-4" /> },
    { value: '3:4', label: 'Alto', icon: <Smartphone className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-slate-300">Proporção</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {ratios.map((ratio) => (
          <button
            key={ratio.value}
            onClick={() => onChange(ratio.value)}
            disabled={disabled}
            className={`
              flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all
              ${value === ratio.value 
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'}
            `}
          >
            <span className="mb-1">{ratio.icon}</span>
            {ratio.label}
          </button>
        ))}
      </div>
    </div>
  );
};