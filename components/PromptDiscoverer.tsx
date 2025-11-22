import React, { useState, useCallback } from 'react';
import type { UploadedImage } from '../types';
import { discoverImagePrompt, discoverEditPrompt } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';

const fileToData = (file: File): Promise<UploadedImage> => {
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

interface ImageInputBoxProps {
  id: string;
  title: string;
  image: UploadedImage | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

const ImageInputBox: React.FC<ImageInputBoxProps> = ({ id, title, image, onFileChange, onClear }) => (
    <div className="flex flex-col space-y-2 w-full">
      <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
      <div className="relative w-full h-64 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-800/50 hover:border-indigo-500 transition-colors duration-200">
        {image ? (
          <>
            <img src={image.dataUrl} alt={`${title} preview`} className="object-contain h-full w-full rounded-md p-1" />
            <button 
              onClick={onClear}
              className="absolute top-2 right-2 bg-gray-900/70 text-white rounded-full p-1.5 hover:bg-red-600/80 transition-colors"
              aria-label={`Remover ${title}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <div className="text-center text-gray-500 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="mt-2 text-sm">Clique para carregar</p>
          </div>
        )}
        <input 
          id={id}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={onFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
);

interface PromptDiscovererProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (prompt: string, image: UploadedImage) => void;
  personalApiKey: string;
}

export const PromptDiscoverer: React.FC<PromptDiscovererProps> = ({ isOpen, onClose, onApply, personalApiKey }) => {
    const [mode, setMode] = useState<'single' | 'comparison'>('single');
    const [singleImage, setSingleImage] = useState<UploadedImage | null>(null);
    const [originalImage, setOriginalImage] = useState<UploadedImage | null>(null);
    const [editedImage, setEditedImage] = useState<UploadedImage | null>(null);
    const [discoveredPrompt, setDiscoveredPrompt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [copyButtonText, setCopyButtonText] = useState('Copiar');

    const handleFileChange = useCallback((setter: React.Dispatch<React.SetStateAction<UploadedImage | null>>) => async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const imageData = await fileToData(file);
                setter(imageData);
                setError(null);
            } catch (err) {
                console.error("File reading error:", err);
                setError("Falha ao ler o ficheiro de imagem.");
                setter(null);
            }
        }
        event.currentTarget.value = '';
    }, []);
    
    const handleDiscover = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setDiscoveredPrompt(null);
        try {
            let prompt: string;
            if (mode === 'single') {
                if (!singleImage) {
                    setError("Por favor, carregue uma imagem.");
                    setIsLoading(false);
                    return;
                }
                prompt = await discoverImagePrompt(
                    { base64: singleImage.base64, mimeType: singleImage.mimeType },
                    personalApiKey
                );
            } else { // comparison mode
                if (!originalImage || !editedImage) {
                    setError("Por favor, carregue a imagem original e a editada.");
                    setIsLoading(false);
                    return;
                }
                prompt = await discoverEditPrompt(
                    { base64: originalImage.base64, mimeType: originalImage.mimeType },
                    { base64: editedImage.base64, mimeType: editedImage.mimeType },
                    personalApiKey
                );
            }
            setDiscoveredPrompt(prompt);
        } catch(e: any) {
            setError(e.message || "Ocorreu um erro inesperado.");
        } finally {
            setIsLoading(false);
        }
    }, [mode, singleImage, originalImage, editedImage, personalApiKey]);

    const handleCopy = useCallback(() => {
        if (!discoveredPrompt) return;
        navigator.clipboard.writeText(discoveredPrompt).then(() => {
            setCopyButtonText('Copiado!');
            setTimeout(() => setCopyButtonText('Copiar'), 2000);
        });
    }, [discoveredPrompt]);

    const handleApply = useCallback(() => {
        if (!discoveredPrompt) return;
        
        const imageToApply = mode === 'single' ? singleImage : originalImage;
        if (imageToApply) {
            onApply(discoveredPrompt, imageToApply);
        }
    }, [discoveredPrompt, mode, singleImage, originalImage, onApply]);
    
    const handleClose = useCallback(() => {
        setSingleImage(null);
        setOriginalImage(null);
        setEditedImage(null);
        setDiscoveredPrompt(null);
        setError(null);
        setIsLoading(false);
        setMode('single');
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    const isDiscoverButtonDisabled = isLoading || (mode === 'single' ? !singleImage : (!originalImage || !editedImage));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300" role="dialog" aria-modal="true">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <header className="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 className="text-2xl font-bold text-white">Descobridor de Prompts</h2>
                <button onClick={handleClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>
            
            <div className="flex border-b border-gray-700">
                <button
                    onClick={() => setMode('single')}
                    className={`flex-1 py-3 text-center font-semibold transition-colors ${mode === 'single' ? 'text-white border-b-2 border-indigo-500 bg-gray-700/50' : 'text-gray-400 hover:bg-gray-700/20'}`}
                >
                    Gerar Prompt de Imagem
                </button>
                <button
                    onClick={() => setMode('comparison')}
                    className={`flex-1 py-3 text-center font-semibold transition-colors ${mode === 'comparison' ? 'text-white border-b-2 border-indigo-500 bg-gray-700/50' : 'text-gray-400 hover:bg-gray-700/20'}`}
                >
                    Descobrir Edição
                </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
                {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
                
                 {mode === 'single' ? (
                    <>
                        <p className="text-gray-400">Carregue uma imagem e a nossa IA irá gerar um prompt descritivo que a poderia ter criado.</p>
                        <div className="flex flex-col items-center gap-6">
                            <ImageInputBox id="single-image-upload" title="Carregar Imagem" image={singleImage} onFileChange={handleFileChange(setSingleImage)} onClear={() => setSingleImage(null)} />
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-gray-400">Carregue uma imagem original e a sua versão editada. A IA irá descobrir o prompt que as diferencia.</p>
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <ImageInputBox id="original-image-upload" title="Imagem Original" image={originalImage} onFileChange={handleFileChange(setOriginalImage)} onClear={() => setOriginalImage(null)} />
                            <ImageInputBox id="edited-image-upload" title="Imagem Editada" image={editedImage} onFileChange={handleFileChange(setEditedImage)} onClear={() => setEditedImage(null)} />
                        </div>
                    </>
                )}


                <div className="pt-2">
                    <button
                        onClick={handleDiscover}
                        disabled={isDiscoverButtonDisabled}
                        className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                       {isLoading ? <Spinner /> : (mode === 'single' ? 'Descobrir Prompt' : 'Descobrir Edição')}
                    </button>
                </div>

                {isLoading && (
                    <div className="text-center text-gray-400 py-4">A analisar a(s) imagem(ns)...</div>
                )}
                
                {discoveredPrompt && (
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-300">Resultado:</h3>
                        <textarea
                            readOnly
                            value={discoveredPrompt}
                            className="w-full h-24 p-3 bg-gray-900 border-2 border-gray-600 rounded-lg text-gray-200 resize-none"
                        />
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={handleCopy} className="flex-1 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors">{copyButtonText}</button>
                            <button onClick={handleApply} className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                                {mode === 'single' ? 'Usar este Prompt e Imagem' : 'Usar Prompt e Imagem Original'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};