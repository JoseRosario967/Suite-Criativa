import React from 'react';
import type { HistoryItem } from '../types';

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
    onDelete: (id: string) => void;
    onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, history, onSelect, onDelete, onClear }) => {

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Histórico</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="p-4 space-y-4 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-400">{history.length} item(s) no histórico</p>
                        <button onClick={onClear} disabled={history.length === 0} className="text-sm text-indigo-400 hover:text-indigo-300 disabled:text-gray-500 disabled:cursor-not-allowed">Limpar Tudo</button>
                    </div>
                    <div className="max-h-[65vh] overflow-y-auto space-y-3 pr-2">
                        {history.length === 0 ? (
                            <p className="text-gray-500 text-center pt-8">O seu histórico de gerações aparecerá aqui.</p>
                        ) : (
                            history.map(item => (
                                <div key={item.id} className="group relative bg-gray-900/50 p-2 rounded-md flex space-x-3 items-center">
                                    <div className="w-16 h-16 relative flex-shrink-0">
                                        <img src={item.imageUrl} alt={item.prompt} className="w-full h-full object-cover rounded-md" />
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <p className="text-sm text-gray-300 truncate" title={item.prompt}>{item.prompt}</p>
                                        <p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onSelect(item)} title="Reutilizar" className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg></button>
                                        <button onClick={() => onDelete(item.id)} title="Apagar" className="p-2 bg-red-600 rounded-full text-white hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};