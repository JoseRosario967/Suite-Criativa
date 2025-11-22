
import React, { useState, useCallback } from 'react';
import { restoreImage } from '../services/geminiService';
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

interface RestorationStudioProps {
  onAddToHistory: (prompt: string, imageUrl: string) => void;
  onClose: () => void;
  isWatermarkEnabled: boolean;
  activeWatermark: Watermark | null;
  personalApiKey: string;
}

export const RestorationStudio: React.FC<RestorationStudioProps> = ({ onAddToHistory, onClose, isWatermarkEnabled, activeWatermark, personalApiKey }) => {
  const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0] ?? null);
    if(event.currentTarget) {
        event.currentTarget.value = '';
    }
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

  const handleRestore = async () => {
    if (!sourceImage) {
        setError("Por favor, carregue uma fotografia para restaurar.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    try {
        const result = await restoreImage(sourceImage, personalApiKey);
        
        let finalImage = result;
        if (isWatermarkEnabled && activeWatermark) {
            finalImage = await applyWatermark(result, activeWatermark);
        }

        setResultImage(finalImage);
    } catch (e: any) {
        setError(e.message || "Ocorreu um erro desconhecido ao restaurar a fotografia.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleClear = () => {
      setSourceImage(null);
      setResultImage(null);
      setError(null);
  }

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `restored-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAddToHistoryClick = () => {
    if (resultImage) {
        onAddToHistory("Fotografia restaurada", resultImage);
    }
  };

  const isButtonDisabled = isLoading || !sourceImage;

  return (
    <div className="relative w-full">
      <button 
        onClick={onClose} 
        className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
        aria-label="Fechar Estúdio de Restauro"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Panel: Upload and Control */}
        <div className="w-full lg:w-1/3 flex flex-col space-y-6">
            <h2 className="text-3xl font-bold text-white">Estúdio de Restauro</h2>
            <p className="text-gray-400">
                Dê uma nova vida às suas fotografias antigas. Carregue uma imagem e a nossa IA irá melhorar a cor, a nitidez e remover imperfeições.
            </p>
            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
            <div className="flex flex-col space-y-3">
                <h3 className="text-lg font-semibold text-gray-300">1. Carregar Fotografia</h3>
                <div 
                    className={`relative w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-800/50 transition-colors duration-200 ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-indigo-500'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {sourceImage ? (
                        <>
                            <img src={sourceImage.dataUrl} alt="Pré-visualização da fotografia" className="object-contain h-full w-full rounded-md p-1" />
                            <button onClick={handleClear} className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-1.5 hover:bg-red-600/80 transition-colors" aria-label="Remover Fotografia">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </>
                    ) : (
                        <div className="text-center text-gray-500 p-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <p className="mt-2 text-sm">Clique ou arraste para carregar a fotografia a restaurar</p>
                        </div>
                    )}
                    <input id="restore-image-upload" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
            </div>
            <div className="pt-2">
                 <button
                    onClick={handleRestore}
                    disabled={isButtonDisabled}
                    className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Spinner /> : 'Restaurar Fotografia'}
                </button>
            </div>
        </div>

        {/* Right Panel: Result Display */}
        <div className="w-full lg:w-2/3 h-[75vh] bg-gray-800/50 border-2 border-gray-700 rounded-lg flex flex-col items-center justify-center overflow-hidden p-4">
            {isLoading ? (
                <div className="text-center">
                    <Spinner />
                    <p className="mt-4 text-gray-400">A restaurar a sua memória...</p>
                </div>
            ) : resultImage ? (
                <div className="w-full h-full relative group">
                    <img src={resultImage} alt="Fotografia restaurada por IA" className="object-contain w-full h-full" />
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleAddToHistoryClick} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                            <span>Adicionar ao Histórico</span>
                        </button>
                        <button onClick={handleDownload} className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span>Download</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    <p className="font-semibold text-lg">O resultado restaurado aparecerá aqui</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
