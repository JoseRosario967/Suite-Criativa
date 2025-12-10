import React, { useState, useCallback, useRef } from 'react';
import { generatePoetry, generateSpeech } from '../services/geminiService';
import { createWavBlob, base64ToFloat32Array } from '../utils/audioUtils';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';

interface PoetryStudioProps {
    onClose: () => void;
    personalApiKey: string;
}

const TYPES = ['Poema', 'Letra de Música', 'Rap', 'Verso', 'Prosa', 'Texto'];
const VOICES = [
    { id: 'Kore', label: 'Kore (Feminina)', gender: 'female' },
    { id: 'Zephyr', label: 'Zephyr (Masculina)', gender: 'male' },
    { id: 'Charon', label: 'Charon (Masculina Profunda)', gender: 'male' },
    { id: 'Fenrir', label: 'Fenrir (Masculina Intensa)', gender: 'male' },
    { id: 'Puck', label: 'Puck (Masculina Jovem)', gender: 'male' },
];

export const PoetryStudio: React.FC<PoetryStudioProps> = ({ onClose, personalApiKey }) => {
    const [topic, setTopic] = useState('');
    const [selectedType, setSelectedType] = useState('Poema');
    const [style, setStyle] = useState('');
    const [result, setResult] = useState<{ title: string; content: string; style: string } | null>(null);
    const [selectedVoice, setSelectedVoice] = useState('Kore');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [copyButtonText, setCopyButtonText] = useState('Copiar Texto');
    
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);

    const handleGenerateText = useCallback(async () => {
        if (!topic.trim()) {
            setError("Por favor, indique um tema.");
            return;
        }
        setIsGeneratingText(true);
        setError(null);
        setResult(null);
        setAudioUrl(null); // Reset audio when new text is generated

        try {
            const data = await generatePoetry(topic, selectedType, style || 'Livre', personalApiKey);
            setResult(data);
        } catch (e: any) {
            setError(e.message || "Erro ao gerar o texto.");
        } finally {
            setIsGeneratingText(false);
        }
    }, [topic, selectedType, style, personalApiKey]);

    const handleGenerateSpeech = useCallback(async () => {
        if (!result?.content) return;
        
        setIsGeneratingAudio(true);
        setError(null);
        
        try {
            // 1. Get Raw PCM from Gemini
            const pcmBase64 = await generateSpeech(result.content, selectedVoice, personalApiKey);
            
            // 2. Convert to WAV using our utility
            const float32Data = base64ToFloat32Array(pcmBase64);
            const wavBlob = createWavBlob(float32Data);
            
            // 3. Create URL
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
            
            // Auto-play
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.play().catch(e => console.warn("Auto-play blocked", e));
                }
            }, 100);

        } catch (e: any) {
             setError(e.message || "Erro ao gerar o áudio.");
        } finally {
            setIsGeneratingAudio(false);
        }
    }, [result, selectedVoice, personalApiKey]);

    const handleVoiceChange = (voiceId: string) => {
        setSelectedVoice(voiceId);
        setAudioUrl(null); // Reset audio to force regeneration with new voice
    };

    const handleCopy = () => {
        if (result?.content) {
            const textToCopy = `${result.title}\n\n${result.content}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                setCopyButtonText('Copiado!');
                setTimeout(() => setCopyButtonText('Copiar Texto'), 2000);
            });
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="flex flex-col lg:flex-row gap-8 min-h-0 flex-grow">
                {/* LEFT COLUMN: Controls */}
                <div className="w-full lg:w-1/3 flex flex-col space-y-6 bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-fit">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Poesia & Música</h2>
                    </div>
                    
                    {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Tema ou Ideia</label>
                            <input 
                                type="text" 
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Ex: Saudade, O Mar, Futuro..."
                                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Formato</label>
                            <div className="grid grid-cols-2 gap-2">
                                {TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={`py-2 px-3 text-sm rounded-md transition-colors ${selectedType === type ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Estilo / Tom (Opcional)</label>
                            <input 
                                type="text" 
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                placeholder="Ex: Fado, Fernando Pessoa, Melancólico..."
                                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerateText} 
                        disabled={isGeneratingText || !topic.trim()}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold rounded-lg shadow-lg hover:shadow-purple-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGeneratingText ? <div className="flex items-center justify-center gap-2"><Spinner size="sm" className="text-white" /> A escrever...</div> : 'Criar Obra'}
                    </button>
                </div>

                {/* RIGHT COLUMN: Result & Audio */}
                <div className="w-full lg:w-2/3 bg-gray-900/30 rounded-xl border border-gray-700 overflow-hidden flex flex-col min-h-[500px]">
                    {result ? (
                        <div className="flex flex-col h-full">
                            {/* Audio Header */}
                            <div className="bg-gray-800 border-b border-gray-700 p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <select 
                                        value={selectedVoice} 
                                        onChange={(e) => handleVoiceChange(e.target.value)}
                                        className="bg-gray-900 text-white text-sm rounded-lg border-gray-600 p-2 focus:ring-purple-500 flex-grow sm:flex-grow-0"
                                    >
                                        {VOICES.map(v => (
                                            <option key={v.id} value={v.id}>{v.label}</option>
                                        ))}
                                    </select>
                                    
                                    {!audioUrl && (
                                        <button 
                                            onClick={handleGenerateSpeech}
                                            disabled={isGeneratingAudio}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                                        >
                                            {isGeneratingAudio ? <Spinner size="sm" className="text-white" /> : 
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                                    Dar Voz
                                                </>
                                            }
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    {audioUrl && (
                                        <>
                                            <audio ref={audioRef} controls src={audioUrl} className="h-10 w-full sm:w-48" />
                                            <a 
                                                href={audioUrl} 
                                                download={`${result.title.replace(/\s+/g, '_')}.wav`}
                                                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full"
                                                title="Download Áudio"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </a>
                                        </>
                                    )}
                                    <button 
                                        onClick={handleCopy}
                                        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                                        title="Copiar Texto para a Área de Transferência"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        {copyButtonText}
                                    </button>
                                </div>
                            </div>

                            {/* Paper Content */}
                            <div className="flex-grow overflow-y-auto p-8 bg-[#fdfbf7] text-gray-900 relative shadow-inner">
                                {/* Paper Texture Overlay */}
                                <div className="absolute inset-0 pointer-events-none opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>
                                
                                <div className="relative max-w-2xl mx-auto">
                                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-center mb-2 text-gray-900">{result.title}</h1>
                                    <p className="text-center text-purple-800 text-sm font-medium mb-8 uppercase tracking-widest border-b border-purple-200 pb-4 inline-block w-full">
                                        {selectedType} • {result.style}
                                    </p>
                                    
                                    <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap text-gray-800 pl-4 border-l-4 border-purple-300/50">
                                        {result.content}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-10 border-2 border-dashed border-gray-700 m-4 rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <p className="text-xl font-semibold">A página está em branco</p>
                            <p className="text-sm mt-2">Preencha os dados à esquerda para começar a escrever.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};