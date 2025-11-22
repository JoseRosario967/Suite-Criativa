
import React, { useState, useCallback } from 'react';
import { translateText } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';

interface TranslationStudioProps {
    onClose: () => void;
    personalApiKey: string;
}

const LANGUAGES = [
    'Português', 'Inglês', 'Espanhol', 'Francês', 'Alemão', 
    'Italiano', 'Chinês (Mandarim)', 'Japonês', 'Russo', 'Holandês',
    'Árabe', 'Coreano', 'Polaco', 'Sueco', 'Turco'
];

export const TranslationStudio: React.FC<TranslationStudioProps> = ({ onClose, personalApiKey }) => {
    const [inputText, setInputText] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('Inglês');
    const [translatedText, setTranslatedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState('Copiar');

    const handleTranslate = useCallback(async () => {
        if (!inputText.trim()) {
            setError("Por favor, insira o texto para traduzir.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await translateText(inputText, targetLanguage, personalApiKey);
            setTranslatedText(result);
        } catch (e: any) {
            setError(e.message || "Ocorreu um erro desconhecido durante a tradução.");
        } finally {
            setIsLoading(false);
        }
    }, [inputText, targetLanguage, personalApiKey]);

    const handleCopy = useCallback(() => {
        if (!translatedText) return;
        navigator.clipboard.writeText(translatedText).then(() => {
            setCopyStatus('Copiado!');
            setTimeout(() => setCopyStatus('Copiar'), 2000);
        });
    }, [translatedText]);

    return (
        <div className="relative w-full h-full flex flex-col">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar Tradutor"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="mb-6">
                <h2 className="text-3xl font-bold text-white">Tradutor Universal AI</h2>
                <p className="text-gray-400 mt-2">
                    Traduza textos com precisão, respeitando o contexto e as nuances culturais. A IA deteta automaticamente a língua de origem.
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex-grow flex flex-col md:flex-row gap-4 md:gap-8 min-h-0">
                {/* Input Section */}
                <div className="flex-1 flex flex-col bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                    <label htmlFor="source-text" className="text-sm font-semibold text-gray-400 mb-2 block">
                        Texto Original (Detecção Automática)
                    </label>
                    <textarea
                        id="source-text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Escreva ou cole o seu texto aqui..."
                        className="flex-grow w-full bg-transparent border-none resize-none focus:ring-0 text-gray-200 placeholder-gray-600 text-lg"
                        spellCheck={false}
                    />
                    <div className="mt-2 text-right text-xs text-gray-500">
                        {inputText.length} caracteres
                    </div>
                </div>

                {/* Controls (Middle on Desktop, Middle on Mobile) */}
                <div className="flex md:flex-col items-center justify-center gap-4">
                    <div className="flex flex-col w-full md:w-auto">
                        <label htmlFor="lang-select" className="sr-only">Língua de Destino</label>
                        <select
                            id="lang-select"
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="bg-gray-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>
                    
                    <button 
                        onClick={handleTranslate}
                        disabled={isLoading || !inputText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110 disabled:bg-gray-600 disabled:transform-none disabled:cursor-not-allowed"
                        title="Traduzir"
                    >
                        {isLoading ? <Spinner size="sm" className="text-white" /> : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Output Section */}
                <div className="flex-1 flex flex-col bg-gray-800/50 rounded-lg border border-gray-700 p-4 relative group">
                    <label className="text-sm font-semibold text-indigo-400 mb-2 block">
                        Tradução ({targetLanguage})
                    </label>
                    <div className="flex-grow w-full text-gray-200 text-lg whitespace-pre-wrap overflow-y-auto">
                        {translatedText || <span className="text-gray-600 italic">A tradução aparecerá aqui...</span>}
                    </div>
                    
                    {translatedText && (
                        <button 
                            onClick={handleCopy} 
                            className="absolute top-4 right-4 p-2 bg-gray-700/50 hover:bg-gray-600 text-gray-300 rounded-md transition-all opacity-0 group-hover:opacity-100"
                            title="Copiar Tradução"
                        >
                            {copyStatus === 'Copiado!' ? (
                                <span className="text-xs font-bold text-green-400">Copiado!</span>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
