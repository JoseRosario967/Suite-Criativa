
import React, { useState } from 'react';
import type { UploadedImage } from '../types';
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

interface MagicEraserStudioProps {
    onClose: () => void;
    onOpenMaskEditor: (imageUrl: string, mode: 'erase') => void;
}

export const MagicEraserStudio: React.FC<MagicEraserStudioProps> = ({ onClose, onOpenMaskEditor }) => {
    const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
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
                setError(null);
            } catch (err) {
                setError("Falha ao carregar a imagem.");
            }
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

    const handleOpenEditor = () => {
        if (sourceImage) {
            onOpenMaskEditor(sourceImage.dataUrl, 'erase');
        }
    };
    
    const handleClear = () => {
        setSourceImage(null);
        setError(null);
    }

    return (
        <div className="relative w-full">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar Borracha Mágica"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="max-w-4xl mx-auto flex flex-col space-y-6">
                <div className="text-center space-y-2">
                     <h2 className="text-3xl font-bold text-white">Borracha Mágica AI</h2>
                    <p className="text-gray-400">
                        Remova objetos indesejados, pessoas ou marcas d'água das suas fotos.
                        <br/>Carregue a imagem, pinte sobre o que quer remover e deixe a IA fazer o resto.
                    </p>
                </div>
               
                {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

                <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700 shadow-lg">
                    <div className="space-y-6">
                        <div 
                            className={`relative w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-800/50 transition-colors duration-200 ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-indigo-500'}`}
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        >
                            {sourceImage ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={sourceImage.dataUrl} alt="Pré-visualização" className="object-contain max-h-full max-w-full rounded-md p-1" />
                                    <button onClick={handleClear} className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-2 hover:bg-red-600/80 transition-colors" aria-label="Remover Fotografia">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 p-8">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 mb-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <p className="text-lg font-medium text-gray-300">Clique ou arraste uma foto para começar</p>
                                    <p className="text-sm mt-2">Formatos suportados: PNG, JPG, WEBP</p>
                                </div>
                            )}
                            {!sourceImage && (
                                <input id="eraser-upload" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            )}
                        </div>
                        
                        <div className="flex justify-center">
                            <button
                                onClick={handleOpenEditor}
                                disabled={!sourceImage}
                                className="w-full md:w-1/2 flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            >
                                Abrir Editor de Borracha
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
