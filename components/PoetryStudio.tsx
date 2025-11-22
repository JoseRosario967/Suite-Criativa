import React, { useState, useCallback } from 'react';
import { generatePoetry } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';

type TextType = 'Poema' | 'Prosa' | 'Verso' | 'Texto' | 'Rap';
type Tone = 'Romântico' | 'Brincalhão' | 'Sarcástico' | 'Anedótico' | 'Erótico';

const TEXT_TYPES: TextType[] = ['Poema', 'Prosa', 'Verso', 'Texto', 'Rap'];
const TONES: Tone[] = ['Romântico', 'Brincalhão', 'Sarcástico', 'Anedótico', 'Erótico'];

interface PoetryStudioProps {
    onClose: () => void;
    personalApiKey: string;
}

const ControlButton: React.FC<{ options: string[], selected: string, onSelect: (option: string) => void }> = ({ options, selected, onSelect }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(option => (
            <button
                key={option}
                onClick={() => onSelect(option)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selected === option ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                }`}
            >
                {option}
            </button>
        ))}
    </div>
);

export const PoetryStudio: React.FC<PoetryStudioProps> = ({ onClose, personalApiKey }) => {
    const [keywords, setKeywords] = useState('');
    const [textType, setTextType] = useState<TextType>('Poema');
    const [tone, setTone] = useState<Tone>('Romântico');
    const [generatedText, setGeneratedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyButtonText, setCopyButtonText] = useState('Copiar');

    const handleGenerate = useCallback(async () => {
        if (!keywords.trim()) {
            setError("Por favor, insira algumas palavras-chave para inspirar a IA.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedText('');
        try {
            const result = await generatePoetry(keywords, textType, tone, personalApiKey);
            setGeneratedText(result);
        } catch (e: any) {
            setError(e.message || "Ocorreu um erro desconhecido.");
        } finally {
            setIsLoading(false);
        }
    }, [keywords, textType, tone, personalApiKey]);

    const handleCopy = useCallback(() => {
        if (!generatedText) return;
        navigator.clipboard.writeText(generatedText).then(() => {
            setCopyButtonText('Copiado!');
            setTimeout(() => setCopyButtonText('Copiar'), 2000);
        });
    }, [generatedText]);

    const handleClear = () => {
        setKeywords('');
        setGeneratedText('');
        setError(null);
        setTextType('Poema');
        setTone('Romântico');
    };

    return (
        <div className="relative w-full">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar Estúdio de Poesia"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Panel: Controls */}
                <div className="w-full lg:w-1/3 flex flex-col space-y-6">
                    <h2 className="text-3xl font-bold text-white">Estúdio de Poesia</h2>
                    <p className="text-gray-400">
                        Dê vida às suas ideias. Insira palavras-chave, escolha um formato e um tom, e deixe a IA tecer a sua magia literária.
                    </p>
                    {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

                    <div className="space-y-3">
                        <label htmlFor="keywords-input" className="block text-lg font-semibold text-gray-300">1. Palavras-Chave</label>
                        <textarea id="keywords-input" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Ex: mar, saudade, luar, navio" className="w-full h-24 p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none" disabled={isLoading} />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-300">2. Formato do Texto</h3>
                        <ControlButton options={TEXT_TYPES} selected={textType} onSelect={(option) => setTextType(option as TextType)} />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-gray-300">3. Tom da Escrita</h3>
                        <ControlButton options={TONES} selected={tone} onSelect={(option) => setTone(option as Tone)} />
                    </div>
                    
                    <button onClick={handleGenerate} disabled={isLoading || !keywords.trim()} className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isLoading ? <Spinner /> : 'Gerar Escrita'}
                    </button>
                </div>

                {/* Right Panel: Result Display */}
                <div className="w-full lg:w-2/3 h-[75vh] bg-gray-800/50 border-2 border-gray-700 rounded-lg flex flex-col overflow-hidden p-4">
                    {isLoading ? (
                        <div className="flex-grow flex flex-col items-center justify-center">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">A invocar as musas...</p>
                        </div>
                    ) : generatedText ? (
                        <div className="w-full h-full flex flex-col gap-4">
                            <div className="flex-grow bg-gray-900/50 rounded-md p-6 overflow-y-auto border border-gray-700/50 shadow-inner">
                                <div className="text-gray-200 whitespace-pre-wrap font-serif text-lg leading-relaxed tracking-wide">
                                    {generatedText}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                                    <span>{copyButtonText}</span>
                                </button>
                                <button onClick={handleClear} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    <span>Limpar</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500">
                             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            <p className="mt-4 font-semibold text-lg">A sua obra de arte literária aparecerá aqui</p>
                            <p className="text-sm mt-1">Combine as palavras e os sentimentos</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};