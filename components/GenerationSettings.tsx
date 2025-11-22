
import React from 'react';

interface GenerationSettingsProps {
    quality: 'standard' | 'high';
    setQuality: (quality: 'standard' | 'high') => void;
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    negativePrompt: string;
    setNegativePrompt: (prompt: string) => void;
    isEditing: boolean;
}

const aspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];

export const GenerationSettings: React.FC<GenerationSettingsProps> = ({
    quality, setQuality, aspectRatio, setAspectRatio, negativePrompt, setNegativePrompt, isEditing
}) => {
    
    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-gray-400 mb-4">Opções de Geração</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Negative Prompt */}
                <div className={`flex flex-col space-y-2 ${isEditing ? 'opacity-50' : ''}`}>
                    <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-300">
                        Prompt Negativo <span className="text-gray-500">(O que não quer ver)</span>
                        {isEditing && <span className="text-xs text-yellow-400 ml-2">(desativado ao editar)</span>}
                    </label>
                    <textarea 
                        id="negative-prompt"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        disabled={isEditing}
                        placeholder="Ex: texto, carros, cores escuras"
                        className="w-full h-24 p-2 bg-gray-800 border-2 border-gray-600 rounded-md text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none disabled:cursor-not-allowed"
                    />
                </div>

                {/* Quality */}
                <div className="flex flex-col space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Qualidade da Imagem</label>
                    <div className="flex space-x-2">
                        <button onClick={() => setQuality('standard')} className={`flex-1 py-2 text-sm rounded-md transition-colors ${quality === 'standard' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Padrão</button>
                        <button onClick={() => setQuality('high')} className={`flex-1 py-2 text-sm rounded-md transition-colors ${quality === 'high' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>Alta</button>
                    </div>
                </div>
                
                {/* Aspect Ratio */}
                <div className={`flex flex-col space-y-2 ${isEditing ? 'opacity-50' : ''}`}>
                    <label className="block text-sm font-medium text-gray-300">
                        Proporções
                        {isEditing && <span className="text-xs text-yellow-400 ml-2">(desativado ao editar)</span>}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {aspectRatios.map(ratio => (
                            <button 
                                key={ratio} 
                                onClick={() => setAspectRatio(ratio)} 
                                disabled={isEditing}
                                className={`py-2 text-sm rounded-md transition-colors disabled:cursor-not-allowed ${aspectRatio === ratio ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};
