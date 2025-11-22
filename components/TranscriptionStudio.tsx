import React, { useState, useCallback } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve({ base64, mimeType: file.type });
        };
        reader.onerror = (error) => reject(error);
    });
};

interface TranscriptionStudioProps {
    onClose: () => void;
    personalApiKey: string;
}

export const TranscriptionStudio: React.FC<TranscriptionStudioProps> = ({ onClose, personalApiKey }) => {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
    const [result, setResult] = useState<{ original: string; translation: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [copyStatus, setCopyStatus] = useState<{ original: string; translation: string }>({ original: 'Copiar', translation: 'Copiar' });

    const handleFile = (file: File | null) => {
        if (file) {
            if (!file.type.startsWith('audio/')) {
                setError("Apenas ficheiros de áudio são suportados.");
                return;
            }
            setAudioFile(file);
            const previewUrl = URL.createObjectURL(file);
            setAudioPreviewUrl(previewUrl);
            setResult(null);
            setError(null);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFile(event.target.files?.[0] ?? null);
        if (event.currentTarget) event.currentTarget.value = '';
    };
    
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        handleFile(event.dataTransfer.files?.[0] ?? null);
    };

    const handleTranscribe = async () => {
        if (!audioFile) {
            setError("Por favor, carregue um ficheiro de áudio para transcrever.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const audioData = await fileToBase64(audioFile);
            const resultData = await transcribeAudio(audioData, personalApiKey);
            setResult(resultData);
        } catch (e: any) {
            setError(e.message || "Ocorreu um erro desconhecido ao transcrever o áudio.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = useCallback((text: string, type: 'original' | 'translation') => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopyStatus(prev => ({ ...prev, [type]: 'Copiado!' }));
            setTimeout(() => setCopyStatus(prev => ({ ...prev, [type]: 'Copiar' })), 2000);
        });
    }, []);

    const handleClear = () => {
        setAudioFile(null);
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
        setResult(null);
        setError(null);
        setIsLoading(false);
    };

    return (
        <div className="relative w-full">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar Estúdio de Transcrição"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Panel: Upload and Controls */}
                <div className="w-full lg:w-1/3 flex flex-col space-y-6">
                    <h2 className="text-3xl font-bold text-white">Estúdio de Transcrição</h2>
                    <p className="text-gray-400">
                        Carregue um áudio e obtenha a transcrição na língua original e a tradução para Português.
                    </p>
                    {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

                    <div 
                        className={`relative w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 bg-gray-800/50 transition-colors ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-indigo-500'}`}
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    >
                        {audioPreviewUrl && audioFile ? (
                            <div className="text-center w-full px-4">
                                <audio controls src={audioPreviewUrl} className="w-full mb-2" />
                                <p className="text-sm text-gray-400 truncate">{audioFile.name}</p>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 014 4v1m-4 5h12m-3 4l4-4-4-4m-8-4v0a4 4 0 014 4v2" />
                                </svg>
                                <p className="mt-2 text-sm">Clique ou arraste o ficheiro de áudio</p>
                                <p className="text-xs text-gray-600 mt-1">.mp3, .wav, .m4a, .flac</p>
                            </div>
                        )}
                        <input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                    
                    <div className="flex gap-4">
                        <button onClick={handleTranscribe} disabled={isLoading || !audioFile} className="flex-1 flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed">
                            {isLoading ? <Spinner /> : 'Transcrever e Traduzir'}
                        </button>
                        <button onClick={handleClear} disabled={!audioFile && !result} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">Limpar</button>
                    </div>
                </div>

                {/* Right Panel: Result Display */}
                <div className="w-full lg:w-2/3 h-[75vh] bg-gray-800/50 border-2 border-gray-700 rounded-lg flex flex-col overflow-hidden p-4">
                    {isLoading ? (
                        <div className="flex-grow flex items-center justify-center">
                            <div className="text-center"><Spinner size="lg" /><p className="mt-4 text-gray-400">A analisar e traduzir o áudio...</p></div>
                        </div>
                    ) : result ? (
                        <div className="w-full h-full flex flex-col md:flex-row gap-4">
                            {/* Original Text Column */}
                            <div className="flex-1 flex flex-col gap-2 min-h-0">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-sm font-semibold text-indigo-300">Texto Original</h3>
                                    <button onClick={() => handleCopy(result.original, 'original')} className="text-xs text-gray-400 hover:text-white bg-gray-700 px-2 py-1 rounded">{copyStatus.original}</button>
                                </div>
                                <div className="flex-grow w-full bg-gray-900/50 rounded-md p-4 text-gray-200 text-sm leading-relaxed border border-gray-700 whitespace-pre-wrap overflow-y-auto font-sans">
                                    {result.original}
                                </div>
                            </div>

                            {/* Divider for mobile */}
                            <div className="h-px w-full bg-gray-700 md:hidden"></div>

                            {/* Translation Column */}
                            <div className="flex-1 flex flex-col gap-2 min-h-0">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-sm font-semibold text-green-300">Tradução (Português)</h3>
                                    <button onClick={() => handleCopy(result.translation, 'translation')} className="text-xs text-gray-400 hover:text-white bg-gray-700 px-2 py-1 rounded">{copyStatus.translation}</button>
                                </div>
                                <div className="flex-grow w-full bg-gray-900/50 rounded-md p-4 text-gray-200 text-sm leading-relaxed border border-gray-700 whitespace-pre-wrap overflow-y-auto font-sans">
                                    {result.translation}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            <p className="font-semibold text-lg">A transcrição aparecerá aqui</p>
                            <p className="text-sm mt-1">Verá o texto original e a tradução lado a lado, com a estrutura correta.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};