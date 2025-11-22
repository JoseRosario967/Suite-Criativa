import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { UploadedImage } from '../types';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';

const fileToUploadedImage = (file: File): Promise<UploadedImage> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve({ id: crypto.randomUUID(), dataUrl, base64, mimeType: file.type });
        };
        reader.onerror = (error) => reject(error);
    });
};

const loadingMessages = [
    "A aquecer os motores de vídeo... (Isto pode demorar alguns minutos)",
    "O seu pedido está na fila de processamento.",
    "A renderizar os frames do seu vídeo...",
    "A compilar a obra-prima final...",
    "Quase a terminar, a preparar o seu download."
];

interface VideoStudioProps {
  onClose: () => void;
  personalApiKey: string;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({ onClose, personalApiKey }) => {
    const [isKeySelected, setIsKeySelected] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);

    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState<UploadedImage | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
    
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkApiKey = useCallback(async () => {
        setIsCheckingKey(true);
        try {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsKeySelected(hasKey);
            } else {
                // Fallback for local development or if aistudio is not available
                setIsKeySelected(!!personalApiKey || !!process.env.API_KEY);
            }
        } catch (e) {
            console.error("Error checking for API key:", e);
            setIsKeySelected(false);
        } finally {
            setIsCheckingKey(false);
        }
    }, [personalApiKey]);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    const handleSelectKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            setIsKeySelected(true); // Optimistically set to true to avoid race condition
        } catch (e) {
            setError("Não foi possível abrir a caixa de diálogo de seleção de chave.");
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const img = await fileToUploadedImage(file);
                setImage(img);
                setError(null);
            } catch (err) {
                setError("Falha ao carregar a imagem.");
            }
        }
        if (event.currentTarget) event.currentTarget.value = '';
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Por favor, insira um prompt para gerar o vídeo.");
            return;
        }
        
        setError(null);
        setIsLoading(true);
        setGeneratedVideoUrl(null);
        let messageIndex = 0;
        setLoadingMessage(loadingMessages[messageIndex]);
        
        const messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setLoadingMessage(loadingMessages[messageIndex]);
        }, 8000);

        try {
            const apiKeyToUse = personalApiKey || process.env.API_KEY;
             if (!apiKeyToUse) {
                throw new Error("Chave API não encontrada.");
            }
            const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
            
            const payload: any = {
                model: 'veo-3.1-fast-generate-preview',
                prompt,
                config: {
                    numberOfVideos: 1,
                    resolution,
                    aspectRatio,
                }
            };

            if (image) {
                payload.image = {
                    imageBytes: image.base64,
                    mimeType: image.mimeType,
                }
            }
            
            let operation = await ai.models.generateVideos(payload);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation });
            }

            if (operation.error) {
                throw new Error(`A geração do vídeo falhou: ${operation.error.message}`);
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) {
                 throw new Error("Não foi encontrado nenhum link de download na resposta da API.");
            }
            
            setLoadingMessage("A descarregar o vídeo finalizado...");
            
            const videoResponse = await fetch(`${downloadLink}&key=${apiKeyToUse}`);
            if (!videoResponse.ok) {
                throw new Error(`Falha ao descarregar o vídeo. Estado: ${videoResponse.status}`);
            }
            const blob = await videoResponse.blob();
            const url = URL.createObjectURL(blob);
            setGeneratedVideoUrl(url);

        } catch (e: any) {
            console.error(e);
            let errorMessage = e.message || "Ocorreu um erro desconhecido durante a geração do vídeo.";
            if (errorMessage.includes("Requested entity was not found.") || errorMessage.includes("API key not valid")) {
                errorMessage = "A sua chave de API parece ser inválida. Por favor, selecione uma chave de API válida para continuar.";
                setIsKeySelected(false);
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
            clearInterval(messageInterval);
        }
    };

    const handleDownload = () => {
        if (!generatedVideoUrl) return;
        const link = document.createElement('a');
        link.href = generatedVideoUrl;
        link.download = `video-gerado-ia-${Date.now()}.mp4`;
        document.body.appendChild(link);

        link.click();
        document.body.removeChild(link);
    };
    
    const renderContent = () => {
        if (isCheckingKey) {
            return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;
        }

        if (!isKeySelected) {
            return (
                <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h3 className="text-2xl font-bold text-white mb-4">Chave de API Necessária</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Para gerar vídeos, é necessário selecionar uma chave de API da Google associada a um projeto com faturação ativada.
                    </p>
                    <button onClick={handleSelectKey} className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
                        Selecionar Chave de API
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                        Para mais informações sobre faturação, consulte a{' '}
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                            documentação oficial
                        </a>.
                    </p>
                </div>
            );
        }

        return (
             <div className="flex flex-col lg:flex-row gap-8 h-full">
                {/* Left Panel: Controls */}
                <div className="w-full lg:w-1/3 flex flex-col space-y-6">
                     <h2 className="text-3xl font-bold text-white">Estúdio de Vídeo</h2>
                    <p className="text-gray-400">
                        Crie vídeos curtos a partir de descrições de texto, com a opção de usar uma imagem como ponto de partida.
                    </p>
                    {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
                    
                    <div>
                        <label htmlFor="video-prompt" className="block text-lg font-semibold text-gray-300 mb-2">1. Prompt de Texto</label>
                        <textarea id="video-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ex: Um gato astronauta a flutuar no espaço" className="w-full h-28 p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none" disabled={isLoading} />
                    </div>

                    <div>
                        <label htmlFor="video-image-upload" className="block text-lg font-semibold text-gray-300 mb-2">2. Imagem de Origem (Opcional)</label>
                        <div className="relative w-full h-40 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-800/50 hover:border-indigo-500">
                           {image ? (
                                <>
                                    <img src={image.dataUrl} alt="Pré-visualização" className="object-contain h-full w-full rounded-md p-1" />
                                    <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-1.5 hover:bg-red-600/80"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </>
                           ) : (
                                <p className="text-center text-gray-500 p-4">Clique para carregar</p>
                           )}
                           <input id="video-image-upload" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isLoading}/>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">3. Configurações</h3>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Proporção</label>
                                <div className="flex space-x-2">
                                    <button onClick={() => setAspectRatio('16:9')} disabled={isLoading} className={`flex-1 py-2 text-sm rounded-md transition-colors ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>16:9</button>
                                    <button onClick={() => setAspectRatio('9:16')} disabled={isLoading} className={`flex-1 py-2 text-sm rounded-md transition-colors ${aspectRatio === '9:16' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>9:16</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Resolução</label>
                                 <div className="flex space-x-2">
                                    <button onClick={() => setResolution('720p')} disabled={isLoading} className={`flex-1 py-2 text-sm rounded-md transition-colors ${resolution === '720p' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>720p</button>
                                    <button onClick={() => setResolution('1080p')} disabled={isLoading} className={`flex-1 py-2 text-sm rounded-md transition-colors ${resolution === '1080p' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>1080p</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                     <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isLoading ? <Spinner /> : 'Gerar Vídeo'}
                    </button>
                </div>
                {/* Right Panel: Result */}
                 <div className="w-full lg:w-2/3 h-[50vh] lg:h-full bg-gray-800/50 border-2 border-gray-700 rounded-lg flex flex-col items-center justify-center overflow-hidden p-4">
                    {isLoading ? (
                        <div className="text-center">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">{loadingMessage}</p>
                        </div>
                    ) : generatedVideoUrl ? (
                         <div className="w-full h-full flex flex-col gap-4">
                            <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain rounded-md bg-black" />
                            <div className="flex gap-4">
                                <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    <span>Download</span>
                                </button>
                                 <button onClick={() => setGeneratedVideoUrl(null)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    <span>Limpar</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            <p className="mt-4 font-semibold text-lg">O seu vídeo gerado aparecerá aqui</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

  return (
    <div className="relative w-full h-full">
      <button 
        onClick={onClose} 
        className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
        aria-label="Fechar Estúdio de Vídeo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {renderContent()}
    </div>
  );
};