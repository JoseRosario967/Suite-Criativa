
import React, { useState, useMemo } from 'react';
import type { Watermark, WatermarkPosition } from '../types';
import { PositionGrid } from './PositionGrid';

interface WatermarkManagerProps {
    isOpen: boolean;
    onClose: () => void;
    watermarks: Watermark[];
    activeWatermarkId: string | null;
    onAdd: (file: File) => Promise<void>;
    onUpdate: (id: string, updates: Partial<Omit<Watermark, 'id' | 'dataUrl'>>) => void;
    onDelete: (id: string) => void;
    onSetId: (id: string | null) => void;
}

const WatermarkSettings: React.FC<{ watermark: Watermark; onUpdate: WatermarkManagerProps['onUpdate'] }> = ({ watermark, onUpdate }) => (
    <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
        <h3 className="text-lg font-bold text-white">Definições para "{watermark.name}"</h3>
        <div>
            <label htmlFor={`wm-name-${watermark.id}`} className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
            <input 
                id={`wm-name-${watermark.id}`}
                type="text"
                value={watermark.name}
                onChange={(e) => onUpdate(watermark.id, { name: e.target.value })}
                className="w-full p-2 bg-gray-800 border-2 border-gray-600 rounded-md text-gray-200"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor={`wm-opacity-${watermark.id}`} className="block text-sm font-medium text-gray-400 mb-1">Opacidade ({Math.round(watermark.opacity * 100)}%)</label>
                <input 
                    id={`wm-opacity-${watermark.id}`}
                    type="range"
                    min="0" max="1" step="0.01"
                    value={watermark.opacity}
                    onChange={(e) => onUpdate(watermark.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full"
                />
            </div>
             <div>
                <label htmlFor={`wm-scale-${watermark.id}`} className="block text-sm font-medium text-gray-400 mb-1">Escala ({Math.round(watermark.scale * 100)}%)</label>
                <input 
                    id={`wm-scale-${watermark.id}`}
                    type="range"
                    min="0.01" max="1" step="0.01"
                    value={watermark.scale}
                    onChange={(e) => onUpdate(watermark.id, { scale: parseFloat(e.target.value) })}
                    className="w-full"
                />
            </div>
        </div>
        <PositionGrid selected={watermark.position} onSelect={(pos) => onUpdate(watermark.id, { position: pos })} />
    </div>
);

export const WatermarkManager: React.FC<WatermarkManagerProps> = ({ isOpen, onClose, watermarks, activeWatermarkId, onAdd, onUpdate, onDelete, onSetId }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedWatermark = useMemo(() => watermarks.find(wm => wm.id === selectedId), [watermarks, selectedId]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await onAdd(file);
        }
        // Limpa o valor do input para permitir selecionar o mesmo ficheiro novamente.
        event.currentTarget.value = '';
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Gestor de Marcas d'Água</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </header>
                
                <div className="flex-grow p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                    {/* Left: Library */}
                    <div className="flex flex-col space-y-4 overflow-y-auto">
                        <h3 className="text-xl font-semibold text-gray-300">A Sua Biblioteca</h3>
                         <div className="grid grid-cols-3 gap-4">
                            {watermarks.map(wm => (
                                <div key={wm.id} className="relative group">
                                    <img 
                                        src={wm.dataUrl} 
                                        alt={wm.name} 
                                        onClick={() => setSelectedId(wm.id)}
                                        className={`w-full aspect-square object-contain bg-gray-700/50 rounded-md p-2 cursor-pointer border-2 transition-colors ${
                                            selectedId === wm.id ? 'border-indigo-500' : 'border-transparent'
                                        }`}
                                    />
                                    {activeWatermarkId === wm.id && <div className="absolute top-1 left-1 bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">Ativa</div>}
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onDelete(wm.id)} className="p-1 bg-red-600/80 rounded-full text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                </div>
                            ))}
                             <label htmlFor="wm-upload" className="w-full aspect-square flex flex-col items-center justify-center bg-gray-900/50 border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:border-indigo-500">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                <span className="text-sm text-gray-500 mt-1">Adicionar Nova</span>
                                <input id="wm-upload" type="file" accept="image/png, image/webp" onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Right: Settings */}
                    <div className="flex flex-col space-y-4 overflow-y-auto">
                        {selectedWatermark ? (
                            <>
                                <WatermarkSettings watermark={selectedWatermark} onUpdate={onUpdate} />
                                <button
                                    onClick={() => onSetId(selectedWatermark.id)}
                                    disabled={activeWatermarkId === selectedWatermark.id}
                                    className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                                >
                                    {activeWatermarkId === selectedWatermark.id ? 'Atualmente Ativa' : "Definir como Marca d'Água Ativa"}
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">Selecione uma marca d'água para ver as suas definições.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
