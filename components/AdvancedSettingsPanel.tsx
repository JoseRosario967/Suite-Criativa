import React, { useState } from 'react';
import { AdvancedSettings, AspectRatio, ImageQuality } from '../types';
import { AspectRatioSelect } from './AspectRatioSelect';
import { ChevronDown, ChevronUp, Sliders, Zap, Award, Ban } from 'lucide-react';

interface AdvancedSettingsPanelProps {
  settings: AdvancedSettings;
  onChange: (settings: AdvancedSettings) => void;
  mode: 'generation' | 'editing';
  disabled?: boolean;
}

export const AdvancedSettingsPanel: React.FC<AdvancedSettingsPanelProps> = ({
  settings,
  onChange,
  mode,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to update partial settings
  const update = (patch: Partial<AdvancedSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const isEditing = mode === 'editing';

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-900/30 overflow-hidden transition-all">
      {/* Header / Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-slate-200 font-medium">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Definições Avançadas</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="p-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
          
          {/* Quality Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Qualidade da Imagem
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => update({ quality: 'standard' })}
                disabled={disabled}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-lg border text-sm transition-all
                  ${settings.quality === 'standard' 
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}
                `}
              >
                <Zap className="w-4 h-4 mb-1" />
                Padrão
              </button>
              <button
                onClick={() => update({ quality: 'high' })}
                disabled={disabled}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-lg border text-sm transition-all
                  ${settings.quality === 'high' 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}
                `}
              >
                <Award className="w-4 h-4 mb-1" />
                Alta (HD/8k)
              </button>
            </div>
            {settings.quality === 'high' && (
              <p className="text-xs text-amber-400/70 mt-2">
                Adiciona detalhes extra e fotorrealismo ao prompt. Pode demorar mais tempo.
              </p>
            )}
          </div>

          <div className="h-px bg-slate-700/50" />

          {/* Aspect Ratio (Disabled in Editing) */}
          <div className={isEditing ? 'opacity-50 pointer-events-none grayscale' : ''}>
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Proporção</label>
                {isEditing && <span className="text-[10px] text-yellow-500 font-medium bg-yellow-500/10 px-2 py-0.5 rounded">Fixo na Edição</span>}
            </div>
            <AspectRatioSelect 
              value={settings.aspectRatio} 
              onChange={(ratio) => update({ aspectRatio: ratio })} 
              disabled={disabled || isEditing}
            />
          </div>

          <div className="h-px bg-slate-700/50" />

          {/* Negative Prompt (Disabled in Editing) */}
          <div className={isEditing ? 'opacity-50 pointer-events-none grayscale' : ''}>
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Ban className="w-4 h-4 text-red-400" />
                    Prompt Negativo
                </label>
                {isEditing && <span className="text-[10px] text-yellow-500 font-medium bg-yellow-500/10 px-2 py-0.5 rounded">Indisponível na Edição</span>}
            </div>
            <textarea
              value={settings.negativePrompt}
              onChange={(e) => update({ negativePrompt: e.target.value })}
              disabled={disabled || isEditing}
              placeholder="O que NÃO quer ver? (ex: deformado, texto, desfocado, preto e branco)"
              className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-none text-sm"
            />
          </div>

        </div>
      )}
    </div>
  );
};
