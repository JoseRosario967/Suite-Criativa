
import React, { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import type { Watermark } from '../types';
import { applyWatermark } from '../utils/imageUtils';
import { Spinner } from './Spinner';

interface BatchWatermarkerProps {
    isOpen: boolean;
    onClose: () => void;
    activeWatermark: Watermark | null;
}

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const BatchWatermarker: React.FC<BatchWatermarkerProps> = ({ isOpen, onClose, activeWatermark }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
        
        return () => {
            newPreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [files]);

    const handleFiles = (newFiles: FileList | null) => {
        if (newFiles) {
            const imageFiles = Array.from(newFiles).filter(file => file.type.startsWith('image/'));
            setFiles(prevFiles => [...prevFiles, ...imageFiles]);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(event.target.files);
        if (event.target) {
            event.target.value = ''; // Reset input to allow re-adding the same files
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragging(true);
    };
    
    const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleApplyAndDownload = useCallback(async () => {
        if (!activeWatermark || files.length === 0) return;

        setIsLoading(true);
        setProgress(0);

        const zip = new JSZip();
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const baseImageSrc = await fileToDataUrl(file);
                const watermarkedSrc = await applyWatermark(baseImageSrc, activeWatermark);
                const response = await fetch(watermarkedSrc);
                const blob = await response.blob();
                zip.file(file.name, blob);
            } catch (error) {
                console.error(`Failed to process ${file.name}:`, error);
            }
            setProgress(((i + 1) / files.length) * 100);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'watermarked_images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        setIsLoading(false);
        setFiles([]);
    }, [files, activeWatermark]);
    
    const handleClose = () => {
        setFiles([]);
        setIsLoading(false);
        setProgress(0);
        onClose();
    }

    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Aplicador em Lote</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white" aria-label="Fechar"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </header>
                <div className="p-6 space-y-6 overflow-y-auto">
                    {!activeWatermark ? (
                         <div className="text-center text-yellow-400 bg-yellow-900/50 p-4 rounded-lg">Por favor, selecione primeiro uma marca d'água ativa no gestor.</div>
                    ) : (
                        <>
                            <p className="text-gray-400">Carregue múltiplas imagens. A marca d'água ativa "{activeWatermark.name}" será aplicada a todas.</p>
                             
                             {files.length > 0 && (
                                <div className="max-h-60 overflow-y-auto p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                        {previews.map((previewUrl, index) => (
                                            <div key={`${files[index].name}-${index}`} className="relative group aspect-square">
                                                <img src={previewUrl} alt={files[index].name} className="w-full h-full object-cover rounded-md" />
                                                <button
                                                    onClick={() => handleRemoveFile(index)}
                                                    className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                                    aria-label={`Remover ${files[index].name}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                             <label 
                                htmlFor="batch-upload" 
                                className={`w-full h-32 flex flex-col items-center justify-center bg-gray-900/50 border-2 border-dashed rounded-md cursor-pointer transition-colors ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-indigo-500'}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 014 4v1m-4 5h12m-3 4l4-4-4-4m-8-4v0a4 4 0 014 4v2" /></svg>
                                <span className="text-sm text-gray-500 mt-2">{files.length > 0 ? `Adicionar mais ficheiros (${files.length} selecionados)` : "Clique ou arraste para carregar ficheiros"}</span>
                                <input id="batch-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" multiple />
                            </label>
                            
                            {isLoading && (
                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                            )}

                            <button
                                onClick={handleApplyAndDownload}
                                disabled={isLoading || files.length === 0}
                                className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <span className="flex items-center gap-2"><Spinner size="sm" /> A aplicar...</span> : `Aplicar e Descarregar ${files.length} Imagens`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
