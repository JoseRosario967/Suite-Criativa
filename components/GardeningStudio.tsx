
import React, { useState } from 'react';
import { generateGardeningAdvice } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';

interface GardeningStudioProps {
    onClose: () => void;
    personalApiKey: string;
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const REGIONS = [
    'Norte', 'Centro', 'Sul (Alentejo/Algarve)', 'Açores', 'Madeira'
];

const MODES = [
    { id: 'cultivate', label: 'Novas Culturas' },
    { id: 'maintain', label: 'Manutenção' }
];

const CULTIVATE_ACTIONS = [
    'Semear (Sementes)', 'Plantar (Mudas)'
];

const CROP_CATEGORIES = [
    'Hortaliças', 'Leguminosas', 'Raízes e Tubérculos', 'Cereais', 'Frutíferas', 'Ervas Aromáticas', 'Flores Comestíveis'
];

const MAINTENANCE_TYPES = [
    'Podas', 'Limpeza da Horta', 'Proteção (Frio/Calor/Estufas)', 'Fertilização (Lenta/Rápida)', 'Rega', 'Controlo de Pragas'
];

export const GardeningStudio: React.FC<GardeningStudioProps> = ({ onClose, personalApiKey }) => {
    const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
    const [region, setRegion] = useState('Centro');
    const [mode, setMode] = useState<'cultivate' | 'maintain'>('cultivate');
    
    // Cultivate State
    const [action, setAction] = useState('Semear (Sementes)');
    const [category, setCategory] = useState('Hortaliças');
    
    // Maintenance State
    const [maintenanceType, setMaintenanceType] = useState('Podas');

    const [specificQuestion, setSpecificQuestion] = useState('');
    
    const [result, setResult] = useState<{ 
        generalTips: string; 
        crops?: any[]; 
        maintenanceTasks?: any[] 
    } | null>(null);
    
    const [selectedItem, setSelectedItem] = useState<any | null>(null); // Shared for crops or tasks details
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConsult = async () => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        setSelectedItem(null);
        
        try {
            const advice = await generateGardeningAdvice(
                month, 
                region, 
                mode,
                {
                    action: mode === 'cultivate' ? action : undefined,
                    category: mode === 'cultivate' ? category : undefined,
                    maintenanceType: mode === 'maintain' ? maintenanceType : undefined
                },
                specificQuestion, 
                personalApiKey
            );
            setResult(advice);
        } catch (e: any) {
            setError(e.message || "Erro ao consultar o oráculo da horta.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar Estúdio de Jardinagem"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="mb-6 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="text-4xl">🥬</span>
                    <h2 className="text-3xl font-bold text-white">Estúdio de Jardinagem AI</h2>
                </div>
                <p className="text-gray-400 mt-2">
                    O seu "Borda d'Água" digital. Descubra o que plantar, como tratar e quando colher, 100% biológico.
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 min-h-0 relative">
                {/* Left: Controls */}
                <div className="w-full lg:w-1/3 bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex flex-col space-y-6 h-fit">
                    
                    {/* Mode Switcher */}
                    <div className="p-1 bg-gray-900 rounded-lg flex">
                        {MODES.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id as 'cultivate' | 'maintain')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === m.id ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Mês</label>
                            <select value={month} onChange={e => setMonth(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white text-sm">
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Região</label>
                            <select value={region} onChange={e => setRegion(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white text-sm">
                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    {mode === 'cultivate' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Método</label>
                                <div className="flex space-x-2">
                                    {CULTIVATE_ACTIONS.map(act => (
                                        <button
                                            key={act}
                                            onClick={() => setAction(act)}
                                            className={`flex-1 py-2 px-2 text-xs sm:text-sm rounded-md border transition-colors ${action === act ? 'bg-green-700/50 border-green-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            {act}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Família da Cultura</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white">
                                    {CROP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Tarefa</label>
                            <select value={maintenanceType} onChange={e => setMaintenanceType(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white">
                                {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Dúvidas Específicas (Opcional)</label>
                        <textarea 
                            value={specificQuestion}
                            onChange={e => setSpecificQuestion(e.target.value)}
                            placeholder={mode === 'cultivate' ? "Ex: Quero plantar batatas mas o solo é argiloso..." : "Ex: Como podar a minha laranjeira velha?"}
                            className="w-full h-20 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 text-sm focus:ring-green-500 focus:border-green-500 resize-none"
                        />
                    </div>

                    <button 
                        onClick={handleConsult} 
                        disabled={isLoading}
                        className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner size="sm" className="text-white" /> A consultar almanaque...</div> : 'Consultar Horta'}
                    </button>
                </div>

                {/* Right: Results */}
                <div className="w-full lg:w-2/3 bg-gray-900/30 rounded-xl border border-gray-700 overflow-hidden flex flex-col min-h-[500px]">
                    {isLoading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-10">
                            <Spinner size="lg" className="text-green-500" />
                            <p className="mt-4 text-xl font-semibold animate-pulse">A analisar o solo e o clima...</p>
                        </div>
                    ) : result ? (
                        <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
                            {/* General Advice */}
                            <div className="bg-green-900/20 border border-green-800/50 p-4 rounded-lg">
                                <h3 className="text-xl font-bold text-green-400 mb-2 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Conselhos do Agrónomo
                                </h3>
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{result.generalTips}</p>
                            </div>

                            <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                                {result.crops ? "Culturas Recomendadas" : "Tarefas Recomendadas"} (Clique para detalhes)
                            </h4>

                            {/* Grid View - Handles both Crops and Maintenance Tasks */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {result.crops?.map((crop, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setSelectedItem({ type: 'crop', data: crop })}
                                        className="bg-gray-800 hover:bg-green-900/30 p-4 rounded-xl border border-gray-700 hover:border-green-500 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer shadow-lg h-full"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-700 group-hover:bg-green-800/50 flex items-center justify-center text-2xl transition-colors">
                                            🌱
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-lg text-gray-200 group-hover:text-green-400 transition-colors leading-tight">{crop.name}</h4>
                                            <span className="text-xs text-gray-500 mt-1 block group-hover:text-gray-400">Ver ficha de cultivo</span>
                                        </div>
                                    </button>
                                ))}

                                {result.maintenanceTasks?.map((task, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setSelectedItem({ type: 'task', data: task })}
                                        className="bg-gray-800 hover:bg-amber-900/30 p-4 rounded-xl border border-gray-700 hover:border-amber-500 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer shadow-lg h-full"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-700 group-hover:bg-amber-800/50 flex items-center justify-center text-2xl transition-colors">
                                            🛠️
                                        </div>
                                        <div className="text-center">
                                            <h4 className="font-bold text-lg text-gray-200 group-hover:text-amber-400 transition-colors leading-tight">{task.title}</h4>
                                            <span className="text-xs text-gray-500 mt-1 block group-hover:text-gray-400">Ver instruções</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-10">
                            <div className="text-6xl mb-4 opacity-20">🥕</div>
                            <p className="text-xl font-semibold">A horta está à espera</p>
                            <p className="text-sm mt-2 text-center max-w-xs">Selecione o mês, a região e o que pretende fazer na sua horta.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedItem(null)}>
                    <div 
                        className="bg-gray-800 border border-green-700/50 rounded-xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 bg-green-900/20 border-b border-green-800/30 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span className="text-3xl">{selectedItem.type === 'crop' ? '🌱' : '🛠️'}</span> 
                                    {selectedItem.type === 'crop' ? selectedItem.data.name : selectedItem.data.title}
                                </h3>
                                <p className="text-green-400 text-sm mt-1 font-medium">
                                    {selectedItem.type === 'crop' ? 'Ficha de Cultivo Biológico' : 'Ficha Técnica de Manutenção'}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-full p-2 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            {selectedItem.type === 'crop' ? (
                                // CROP DETAILS
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            <h4 className="text-amber-500 font-bold mb-2 flex items-center gap-2">🟤 Solo e Terreno</h4>
                                            <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.soil}</p>
                                        </div>
                                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">💧 Necessidades de Rega</h4>
                                            <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.water}</p>
                                        </div>
                                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">☀️ Exposição Solar</h4>
                                            <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.sun}</p>
                                        </div>
                                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            <h4 className="text-green-500 font-bold mb-2 flex items-center gap-2">🌿 Fertilizante Biológico</h4>
                                            <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.fertilizer}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-lg">
                                        <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">🐛 Pragas e Tratamentos (Bio)</h4>
                                        <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.pests}</p>
                                    </div>
                                </>
                            ) : (
                                // MAINTENANCE DETAILS
                                <div className="space-y-6">
                                    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                                        <h4 className="text-blue-400 font-bold mb-2 text-lg">O que fazer?</h4>
                                        <p className="text-gray-200 leading-relaxed">{selectedItem.data.description}</p>
                                    </div>
                                    
                                    <div className="bg-amber-900/10 border border-amber-800/30 p-6 rounded-lg">
                                        <h4 className="text-amber-500 font-bold mb-2 text-lg flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            Técnica Recomendada
                                        </h4>
                                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedItem.data.technique}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-gray-700 bg-gray-900/30 flex justify-end">
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
