
import React, { useState, useCallback } from 'react';
import { generateOrEditImage } from '../services/geminiService';
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

interface InteriorDesignStudioProps {
  onAddToHistory: (prompt: string, imageUrl: string) => void;
  onClose: () => void;
  isWatermarkEnabled: boolean;
  activeWatermark: Watermark | null;
  personalApiKey: string;
}

export const InteriorDesignStudio: React.FC<InteriorDesignStudioProps> = ({ onAddToHistory, onClose, isWatermarkEnabled, activeWatermark, personalApiKey }) => {
  const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File | null) => {
    if (file) {
      if (!file.type.startsWith('image/')) {
          setError("Apenas ficheiros de imagem são suportados.");
          return;
      }
      try {
          const img = await fileToUploadedImage(file);
          setSourceImage(img);
          setResultImage(null);
          setError(null);
      } catch (err) {
          setError("Falha ao carregar a imagem.");
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] ?? null);
    if(event.currentTarget) event.currentTarget.value = '';
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
  
  const handleRedesign = async () => {
    if (!sourceImage || !prompt.trim()) {
        setError("Por favor, carregue uma foto e descreva o estilo de design que pretende.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    
    try {
        const fullPrompt = `Como um designer de interiores perito, redesenhe a seguinte divisão com base no pedido do utilizador: "${prompt}". Mantenha a estrutura e perspetiva originais da divisão, mas altere o estilo, mobiliário, cores e decoração conforme solicitado.`;
        
        // Updated call signature: added undefined for options
        const result = await generateOrEditImage(fullPrompt, [sourceImage], undefined, personalApiKey);
        
        let finalImage = result;
        if (isWatermarkEnabled && activeWatermark) {
            finalImage = await applyWatermark(result, activeWatermark);
        }

        setResultImage(finalImage);
    } catch (e: any) {
        setError(e.message || "Ocorreu um erro desconhecido ao redesenhar o espaço.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleClear = () => {
      setSourceImage(null);
      setResultImage(null);
      setError(null);
      setPrompt('');
  }

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `design-de-interiores-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAddToHistoryClick = () => {
    if (resultImage) {
        onAddToHistory(`(Design de Interiores) ${prompt}`, resultImage);
    }
  };

  return (
    <div className="relative w-full">
      <button 
        onClick={onClose} 
        className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
        aria-label="Fechar Estúdio de Design de Interiores"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-1/3 flex flex-col space-y-6">
            <h2 className="text-3xl font-bold text-white">Estúdio de Design de Interiores</h2>
            <p className="text-gray-400">
                Redecore qualquer espaço. Carregue a foto de uma divisão, descreva o estilo que deseja e deixe a IA transformá-la.
            </p>
            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="space-y-3">
                <label htmlFor="design-image-upload" className="block text-lg font-semibold text-gray-300">1. Foto da Divisão</label>
                <div 
                    className={`relative w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-800/50 transition-colors ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-indigo-500'}`}
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                >
                    {sourceImage ? (
                        <>
                            <img src={sourceImage.dataUrl} alt="Pré-visualização da divisão" className="object-contain h-full w-full rounded-md p-1" />
                            <button onClick={handleClear} className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-1.5 hover:bg-red-600/80"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </>
                    ) : (
                        <div className="text-center text-gray-500 p-4"><svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><p className="mt-2 text-sm">Clique ou arraste a foto</p></div>
                    )}
                    <input id="design-image-upload" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
            </div>

            <div className="space-y-3">
                 <label htmlFor="design-prompt" className="block text-lg font-semibold text-gray-300">2. Estilo Desejado</label>
                <textarea id="design-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ex: Estilo escandinavo com madeira clara, plantas e tons neutros." className="w-full h-24 p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none" disabled={isLoading} />
            </div>
            
            <button onClick={handleRedesign} disabled={isLoading || !sourceImage || !prompt.trim()} className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed">
                {isLoading ? <Spinner /> : 'Redesenhar Espaço'}
            </button>
        </div>

        {/* Right Panel: Result Display */}
        <div className="w-full lg:w-2/3 h-[75vh] bg-gray-800/50 border-2 border-gray-700 rounded-lg flex flex-col items-center justify-center overflow-hidden p-4">
            {isLoading ? (
                <div className="text-center"><Spinner size="lg" /><p className="mt-4 text-gray-400">A redesenhar a sua divisão...</p></div>
            ) : resultImage && sourceImage ? (
                <div className="w-full h-full flex flex-col gap-4">
                    <div className="flex-grow grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center">
                            <h3 className="font-semibold text-gray-400 mb-2">Antes</h3>
                            <img src={sourceImage.dataUrl} alt="Divisão original" className="object-contain w-full h-full max-h-[60vh] rounded-md" />
                        </div>
                         <div className="flex flex-col items-center">
                            <h3 className="font-semibold text-gray-400 mb-2">Depois</h3>
                            <img src={resultImage} alt="Divisão redesenhada" className="object-contain w-full h-full max-h-[60vh] rounded-md" />
                        </div>
                    </div>
                     <div className="flex gap-4">
                        <button onClick={handleAddToHistoryClick} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg><span>Histórico</span></button>
                        <button onClick={() => handleDownload(resultImage)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg><span>Download</span></button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    <p className="font-semibold text-lg">O resultado do design aparecerá aqui</p>
                    <p className="text-sm mt-1">Carregue uma foto e descreva a sua visão</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
