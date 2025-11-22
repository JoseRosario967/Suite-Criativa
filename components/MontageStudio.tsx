
import React, { useState, useCallback } from 'react';
import { generateMontage } from '../services/geminiService';
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
            // FIX: Added missing 'id' property to conform to the UploadedImage type.
            resolve({ id: crypto.randomUUID(), dataUrl, base64, mimeType: file.type });
        };
        reader.onerror = (error) => reject(error);
    });
};

interface ImageInputProps {
  id: string;
  title: string;
  // Fix: Changed JSX.Element to React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
  icon: React.ReactNode;
  image: UploadedImage | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const ImageInput: React.FC<ImageInputProps> = ({ id, title, icon, image, onFileChange, onClear }) => (
    <div className="flex flex-col space-y-3">
        <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
        <div className="relative w-full aspect-square border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-800/50 hover:border-indigo-500 transition-colors duration-200">
            {image ? (
                <>
                    <img src={image.dataUrl} alt={`${title} preview`} className="object-contain h-full w-full rounded-md p-1" />
                    <button onClick={onClear} className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-1.5 hover:bg-red-600/80 transition-colors" aria-label={`Remover ${title}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </>
            ) : (
                <div className="text-center text-gray-500 p-4">
                    {icon}
                    <p className="mt-2 text-sm">Clique para carregar</p>
                </div>
            )}
            <input id={id} type="file" accept="image/*" onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
    </div>
);


interface MontageStudioProps {
  onAddToHistory: (prompt: string, imageUrl: string) => void;
  onClose: () => void;
  isWatermarkEnabled: boolean;
  activeWatermark: Watermark | null;
  personalApiKey: string;
}

export const MontageStudio: React.FC<MontageStudioProps> = ({ onAddToHistory, onClose, isWatermarkEnabled, activeWatermark, personalApiKey }) => {
  const [backgroundImage, setBackgroundImage] = useState<UploadedImage | null>(null);
  const [subjectImage, setSubjectImage] = useState<UploadedImage | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<UploadedImage | null>>) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        try {
            const img = await fileToUploadedImage(file);
            setter(img);
        } catch (err) {
            setError("Falha ao carregar a imagem.");
        }
    }
    // Limpa o valor do input para permitir selecionar o mesmo ficheiro novamente.
    event.currentTarget.value = '';
  };

  const handleGenerate = async () => {
    if (!backgroundImage || !subjectImage || !prompt.trim()) {
        setError("Por favor, carregue uma imagem de fundo, uma imagem de sujeito e escreva as instruções.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setResultImage(null);
    try {
        const result = await generateMontage(prompt, backgroundImage, subjectImage, personalApiKey);
        
        let finalImage = result;
        if (isWatermarkEnabled && activeWatermark) {
            finalImage = await applyWatermark(result, activeWatermark);
        }
        setResultImage(finalImage);

    } catch (e: any) {
        setError(e.message || "Ocorreu um erro desconhecido ao gerar a montagem.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `montage-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAddToHistoryClick = () => {
    if (resultImage) {
        onAddToHistory(prompt, resultImage);
    }
  };

  const isButtonDisabled = isLoading || !backgroundImage || !subjectImage || !prompt.trim();

  return (
    <div className="relative w-full">
      <button 
        onClick={onClose} 
        className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
        aria-label="Fechar Estúdio de Montagem"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="space-y-8">
        {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ImageInput 
            id="bg-image-upload"
            title="1. Imagem de Fundo"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            image={backgroundImage}
            onFileChange={handleFileChange(setBackgroundImage)}
            onClear={() => setBackgroundImage(null)}
          />
          <ImageInput 
            id="subject-image-upload"
            title="2. Imagem do Sujeito"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            image={subjectImage}
            onFileChange={handleFileChange(setSubjectImage)}
            onClear={() => setSubjectImage(null)}
          />
          <div className="flex flex-col space-y-3">
            <h3 className="text-lg font-semibold text-gray-300">3. Instruções</h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Coloque a pessoa a passear na praia do fundo."
              className="w-full flex-grow h-32 md:h-auto p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="flex justify-center">
          <button
              onClick={handleGenerate}
              disabled={isButtonDisabled}
              className="w-full md:w-1/2 flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
              {isLoading ? <Spinner /> : 'Gerar Montagem'}
          </button>
        </div>

        {(isLoading || resultImage) && (
          <div className="max-w-full max-h-[70vh] aspect-square mx-auto bg-gray-800/50 border-2 border-gray-700 rounded-lg flex flex-col items-center justify-center overflow-hidden transition-all duration-300 mt-8">
              {isLoading ? (
                  <div className="text-center">
                      <Spinner />
                      <p className="mt-4 text-gray-400">A criar a sua montagem...</p>
                  </div>
              ) : resultImage && (
                  <div className="w-full h-full relative group">
                      <img src={resultImage} alt="Montagem gerada por IA" className="object-contain w-full h-full" />
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
              )}
          </div>
        )}

      </div>
    </div>
  );
};
