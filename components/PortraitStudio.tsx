import React, { useState } from 'react';
import { generatePortrait } from '../services/geminiService';
import type { UploadedImage, Watermark } from '../types';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';
import { applyWatermark } from '../utils/imageUtils';

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

interface PortraitStudioProps {
  onAddToHistory: (prompt: string, imageUrl: string) => void;
  onClose: () => void;
  isWatermarkEnabled: boolean;
  activeWatermark: Watermark | null;
  personalApiKey: string;
}

export const PortraitStudio: React.FC<PortraitStudioProps> = ({ onAddToHistory, onClose, isWatermarkEnabled, activeWatermark, personalApiKey }) => {
  const [sourceImages, setSourceImages] = useState<UploadedImage[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            setError("Apenas ficheiros de imagem são suportados.");
            return;
        }
        try {
            const newImages = await Promise.all(imageFiles.map(fileToUploadedImage));
            setSourceImages(prev => [...prev, ...newImages]);
            setResultImage(null);
            setError(null);
        } catch (err) {
            setError("Falha ao carregar as imagens.");
        }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    if(event.currentTarget) event.currentTarget.value = '';
  };
  
  const handleRemoveImage = (id: string) => {
    setSourceImages(prev => prev.filter(img => img.id !== id));
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
    handleFiles(event.dataTransfer.files);
  };
  
  const handleGenerate = async () => {
    if (sourceImages.length === 0 || !prompt.trim()) {
        setError("Por favor, carregue pelo menos uma foto e descreva o cenário ou estilo.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    
    try {
        const result = await generatePortrait(prompt, sourceImages, personalApiKey);
        
        let finalImage = result;
        if (isWatermarkEnabled && activeWatermark) {
            finalImage = await applyWatermark(result, activeWatermark);
        }

        setResultImage(finalImage);
    } catch (e: any) {
        setError(e.message || "Ocorreu um erro desconhecido ao gerar o retrato.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleClear = () => {
      setSourceImages([]);
      setResultImage(null);
      setError(null);
      setPrompt('');
  }

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `retrato-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAddToHistoryClick = () => {
    if (resultImage) {
        onAddToHistory(`(Retrato AI) ${prompt}`, resultImage);
    }
  };

  return (
    <div className="relative w-full">
      <button 
        onClick={onClose} 
        className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
        aria-label="Fechar Estúdio de Retratos"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-1/3 flex flex-col space-y-6">
            <h2 className="text-3xl font-bold text-white">Estúdio de Retratos AI</h2>
            <p className="text-gray-400">
                Combine características de várias pessoas ou mantenha a identidade de uma pessoa num novo contexto. Carregue as fotos, descreva a sua visão e a IA cria um novo retrato.
            </p>
            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="space-y-3">
                <label className="block text-lg font-semibold text-gray-300">1. Fotos de Referência</label>
                <div 
                    className={`relative w-full min-h-[16rem] border-2 border-dashed rounded-lg p-4 bg-gray-800/50 transition-colors ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-indigo-500'}`}
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                >
                    {sourceImages.length > 0 ? (
                        <div className="grid grid-cols-3 gap-4">
                            {sourceImages.map(img => (
                                <div key={img.id} className="relative group aspect-square">
                                    <img src={img.dataUrl} alt="Retrato de origem" className="object-cover w-full h-full rounded-md" />
                                    <button onClick={() => handleRemoveImage(img.id)} className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remover imagem">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            <label htmlFor="portrait-image-upload" className="flex items-center justify-center aspect-square border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:border-indigo-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </label>
                        </div>
                    ) : (
                        <label htmlFor="portrait-image-upload" className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500 cursor-pointer p-4">
                           <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                           <p className="mt-2 text-sm">Clique ou arraste as fotos</p>
                        </label>
                    )}
                    <input id="portrait-image-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" multiple />
                </div>
            </div>

            <div className="space-y-3">
                 <label htmlFor="portrait-prompt" className="block text-lg font-semibold text-gray-300">2. Descrição</label>
                <textarea id="portrait-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ex: Crie uma pessoa com os olhos da primeira imagem e o cabelo da segunda." className="w-full h-24 p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none" disabled={isLoading} />
            </div>
            
            <button onClick={handleGenerate} disabled={isLoading || sourceImages.length === 0 || !prompt.trim()} className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed">
                {isLoading ? <Spinner /> : 'Gerar Retrato'}
            </button>
        </div>

        {/* Right Panel: Result Display */}
        <div className="w-full lg:w-2/3 h-[75vh] bg-gray-800/50 border-2 border-gray-700 rounded-lg flex flex-col items-center justify-center overflow-hidden p-4">
            {isLoading ? (
                <div className="text-center"><Spinner size="lg" /><p className="mt-4 text-gray-400">A criar o seu retrato...</p></div>
            ) : resultImage && sourceImages.length > 0 ? (
                <div className="w-full h-full flex flex-col gap-4">
                    <div className="flex-grow grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center">
                            <h3 className="font-semibold text-gray-400 mb-2">Originais</h3>
                            <div className="grid grid-cols-2 gap-2 w-full h-full max-h-[60vh] bg-gray-900/50 p-2 rounded-md">
                                {sourceImages.map(img => (
                                    <img key={img.id} src={img.dataUrl} alt="Pessoa original" className="object-contain w-full h-full rounded-md" />
                                ))}
                            </div>
                        </div>
                         <div className="flex flex-col items-center">
                            <h3 className="font-semibold text-gray-400 mb-2">Resultado</h3>
                            <img src={resultImage} alt="Retrato gerado" className="object-contain w-full h-full max-h-[60vh] rounded-md" />
                        </div>
                    </div>
                     <div className="flex gap-4">
                        <button onClick={handleAddToHistoryClick} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg><span>Histórico</span></button>
                        <button onClick={() => handleDownload(resultImage)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg><span>Download</span></button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    <p className="font-semibold text-lg">O seu novo retrato aparecerá aqui</p>
                    <p className="text-sm mt-1">Carregue uma ou mais fotos e descreva a sua visão</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};