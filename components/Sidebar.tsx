
import React from 'react';
import { BackupManager } from './BackupManager';
import type { Watermark } from '../types';

interface SidebarProps {
    onOpenHistory: () => void;
    onOpenWatermarkSettings: () => void;
    onOpenPrompts: () => void;
    onOpenApiKeySettings: () => void;
    getBackupData: () => object;
    loadBackupData: (data: object) => void;
    isWatermarkEnabled: boolean;
    setIsWatermarkEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    activeWatermark: Watermark | null;
    quality: 'standard' | 'high';
    setQuality: (quality: 'standard' | 'high') => void;
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    negativePrompt: string;
    setNegativePrompt: (prompt: string) => void;
}

const SidebarButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string }> = ({ onClick, children, className = '' }) => (
    <button
        onClick={onClick}
        className={`w-full flex justify-between items-center p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors ${className}`}
    >
        <h2 className="text-xl font-semibold text-gray-400">{children}</h2>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
    </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ 
    onOpenHistory, onOpenWatermarkSettings, onOpenPrompts, 
    onOpenApiKeySettings, getBackupData, loadBackupData,
    isWatermarkEnabled, setIsWatermarkEnabled, activeWatermark,
    quality, setQuality, aspectRatio, setAspectRatio,
    negativePrompt, setNegativePrompt
}) => {
    
    const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        setIsWatermarkEnabled(!isWatermarkEnabled);
    };

    const handleToggleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleToggle(e);
        }
    };
    
    return (
        <aside className="w-full lg:w-1/3 xl:w-1/4 flex flex-col space-y-4">
            <SidebarButton onClick={onOpenHistory}>Histórico</SidebarButton>
            
            <button
                onClick={onOpenWatermarkSettings}
                className="w-full p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors text-left"
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-400">Marca d'Água</h2>
                    <div className="flex items-center space-x-3">
                        {isWatermarkEnabled && activeWatermark ? (
                            <img 
                                src={activeWatermark.dataUrl} 
                                alt="Pré-visualização" 
                                className="h-8 w-8 object-contain bg-gray-900/50 p-1 rounded-md pointer-events-none"
                            />
                        ) : isWatermarkEnabled ? (
                            <div className="h-8 w-8 flex items-center justify-center bg-gray-900/50 p-1 rounded-md pointer-events-none" title="Nenhuma marca d'água ativa">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                        ) : (
                            <div className="h-8 w-8" />
                        )}
                        
                        <div 
                            role="switch"
                            aria-checked={isWatermarkEnabled}
                            tabIndex={0}
                            onClick={handleToggle}
                            onKeyDown={handleToggleKeyDown}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${isWatermarkEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
                        >
                            <span
                                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isWatermarkEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </div>
                    </div>
                </div>
            </button>

            <SidebarButton onClick={onOpenPrompts}>Prompts</SidebarButton>
            
            <BackupManager 
                getBackupData={getBackupData}
                loadBackupData={loadBackupData}
            />
            
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-gray-400 font-semibold">Definições Avançadas</h3>
                
                {/* Negative Prompt */}
                <div>
                    <label htmlFor="sidebar-neg-prompt" className="block text-sm text-gray-500 mb-1">Prompt Negativo</label>
                    <textarea 
                        id="sidebar-neg-prompt"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="Ex: desfocado, texto..."
                        className="w-full h-20 p-2 bg-gray-900 border border-gray-600 rounded-md text-gray-200 text-xs focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    />
                </div>

                {/* Quality */}
                <div>
                    <label className="block text-sm text-gray-500 mb-1">Qualidade</label>
                    <div className="flex bg-gray-900 rounded-lg p-1">
                        <button onClick={() => setQuality('standard')} className={`flex-1 py-1 text-xs rounded-md transition-colors ${quality === 'standard' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Padrão</button>
                        <button onClick={() => setQuality('high')} className={`flex-1 py-1 text-xs rounded-md transition-colors ${quality === 'high' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>Alta</button>
                    </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                    <label className="block text-sm text-gray-500 mb-1">Proporções</label>
                    <div className="grid grid-cols-3 gap-1">
                        {['1:1', '16:9', '9:16', '4:3', '3:4'].map(ratio => (
                             <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`py-1 text-xs rounded-md border transition-colors ${aspectRatio === ratio ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <SidebarButton onClick={onOpenApiKeySettings}>Chave API</SidebarButton>
        </aside>
    );
};
