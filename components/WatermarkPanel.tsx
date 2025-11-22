
import React from 'react';
import type { Watermark } from '../types';

interface WatermarkPanelProps {
    isOpen: boolean;
    onClose: () => void;
    isWatermarkEnabled: boolean;
    setIsWatermarkEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    onOpenWatermarkManager: () => void;
    activeWatermark: Watermark | null;
}

export const WatermarkPanel: React.FC<WatermarkPanelProps> = ({ isOpen, onClose, isWatermarkEnabled, setIsWatermarkEnabled, onOpenWatermarkManager, activeWatermark }) => {
    
    if (!isOpen) return null;

    const handleToggle = () => setIsWatermarkEnabled(!isWatermarkEnabled);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleToggle();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
             <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Marca d'Água</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="p-4">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="watermark-toggle" className="text-gray-300 cursor-pointer select-none">
                                Ativar Marca d'Água
                            </label>
                            <div className="flex items-center space-x-3">
                                {isWatermarkEnabled && activeWatermark ? (
                                    <img 
                                        src={activeWatermark.dataUrl} 
                                        alt="Pré-visualização da marca d'água" 
                                        className="h-8 w-8 object-contain bg-gray-700/50 p-1 rounded-md"
                                    />
                                ) : isWatermarkEnabled ? (
                                    <div className="h-8 w-8 flex items-center justify-center bg-gray-700/50 p-1 rounded-md" title="Nenhuma marca d'água ativa">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="h-8 w-8"></div>
                                )}
                                <div 
                                    id="watermark-toggle"
                                    role="switch"
                                    aria-checked={isWatermarkEnabled}
                                    tabIndex={0}
                                    onClick={handleToggle}
                                    onKeyDown={handleKeyDown}
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 ${isWatermarkEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
                                >
                                    <span
                                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isWatermarkEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </div>
                            </div>
                        </div>
                        {!activeWatermark && isWatermarkEnabled && (
                            <div role="alert">
                                <p className="text-sm text-yellow-400">
                                    Aviso: Nenhuma marca d'água ativa selecionada. Por favor, selecione uma no gestor.
                                </p>
                            </div>
                        )}
                        <button 
                            onClick={() => {
                                onClose();
                                onOpenWatermarkManager();
                            }}
                            className="w-full px-4 py-2 bg-gray-700 text-indigo-300 font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Gerir Marcas d'Água
                        </button>
                    </div>
                </div>
             </div>
        </div>
    );
}
