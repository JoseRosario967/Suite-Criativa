import React, { useState } from 'react';
import { removeBackground } from '../services/geminiService';
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

interface BackgroundRemoverStudioProps {
  onAddToHistory: (prompt: string, imageUrl: string) => void;
  onClose: () => void;
  isWatermarkEnabled: boolean;
  activeWatermark: Watermark | null;
  personalApiKey: string;
}

export const BackgroundRemoverStudio: React.FC<BackgroundRemoverStudioProps> = ({ onAddToHistory, onClose, isWatermarkEnabled, activeWatermark, personalApiKey }) => {
  const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
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
  
  const handleRemove = async () => {
    if (!sourceImage) {
        setError("Por favor, carregue uma imagem para remover o fundo.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    
    try {
        const result = await removeBackground(sourceImage, personalApiKey);
        
        let finalImage = result;
        if (isWatermarkEnabled && activeWatermark) {
            finalImage = await applyWatermark(result, activeWatermark);
        }

        setResultImage(finalImage);
    } catch (e: any) {
        setError(e.message || "Ocorreu um erro desconhecido ao remover o fundo.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleClear = () => {
      setSourceImage(null);
      setResultImage(null);
      setError(null);
  }

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `fundo-removido-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAddToHistoryClick = () => {
    if (resultImage) {
        onAddToHistory("Fundo removido", resultImage);
    }
  };

  return (
    <div className="relative w-full">
      <button 
        onClick={onClose} 
        className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
        aria-label="Fechar Removedor de Fundo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-1/3 flex flex-col space-y-6">
            <h2 className="text-3xl font-bold text-white">Removedor de Fundo</h2>
            <p className="text-gray-400">
                Isole o sujeito principal da sua foto. Carregue uma imagem e a nossa IA removerá o fundo com um clique.
            </p>
            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="space-y-3">
                <label htmlFor="bg-remove-upload" className="block text-lg font-semibold text-gray-300">1. Carregar Imagem</label>
                <div 
                    className={`relative w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-800/50 transition-colors ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-indigo-500'}`}
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                >
                    {sourceImage ? (
                        <>
                            <img src={sourceImage.dataUrl} alt="Pré-visualização da imagem" className="object-contain h-full w-full rounded-md p-1" />
                            <button onClick={handleClear} className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-1.5 hover:bg-red-600/80"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </>
                    ) : (
                        <div className="text-center text-gray-500 p-4"><svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p className="mt-2 text-sm">Clique ou arraste a foto</p></div>
                    )}
                    <input id="bg-remove-upload" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
            </div>
            
            <button onClick={handleRemove} disabled={isLoading || !sourceImage} className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed">
                {isLoading ? <Spinner /> : 'Remover Fundo'}
            </button>
        </div>

        {/* Right Panel: Result Display */}
        <div className="w-full lg:w-2/3 h-[75vh] bg-gray-800/50 border-2 border-gray-700 rounded-lg flex flex-col items-center justify-center overflow-hidden p-4">
            {isLoading ? (
                <div className="text-center"><Spinner size="lg" /><p className="mt-4 text-gray-400">A remover o fundo...</p></div>
            ) : resultImage && sourceImage ? (
                <div className="w-full h-full flex flex-col gap-4">
                    <div className="flex-grow grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center">
                            <h3 className="font-semibold text-gray-400 mb-2">Antes</h3>
                            <img src={sourceImage.dataUrl} alt="Imagem original" className="object-contain w-full h-full max-h-[60vh] rounded-md" />
                        </div>
                         <div className="flex flex-col items-center">
                            <h3 className="font-semibold text-gray-400 mb-2">Depois</h3>
                            <div className="w-full h-full max-h-[60vh] rounded-md bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjNDQ0Ij48L3JlY3Q+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiM0NDQiPjwvcmVjdD48L3N2Zz4=')]">
                                <img src={resultImage} alt="Imagem com fundo removido" className="object-contain w-full h-full" />
                            </div>
                        </div>
                    </div>
                     <div className="flex gap-4">
                        <button onClick={handleAddToHistoryClick} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg><span>Histórico</span></button>
                        <button onClick={() => handleDownload(resultImage)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg><span>Download</span></button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    <p className="font-semibold text-lg">O resultado aparecerá aqui</p>
                    <p className="text-sm mt-1">Carregue uma imagem para começar</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};