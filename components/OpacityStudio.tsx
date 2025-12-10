
import React, { useState, useEffect, useRef } from 'react';
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

interface OpacityStudioProps {
    onClose: () => void;
}

export const OpacityStudio: React.FC<OpacityStudioProps> = ({ onClose }) => {
    const [image, setImage] = useState<UploadedImage | null>(null);
    const [opacity, setOpacity] = useState(50); // 0-100
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError("Apenas ficheiros de imagem são suportados.");
                return;
            }
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

    // Update preview/result whenever image or opacity changes
    useEffect(() => {
        if (!image) return;

        const imgObj = new Image();
        imgObj.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = imgObj.width;
            canvas.height = imgObj.height;

            // Clear (transparent)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Set opacity
            ctx.globalAlpha = opacity / 100;
            
            // Draw image
            ctx.drawImage(imgObj, 0, 0);
            
            setResultUrl(canvas.toDataURL('image/png'));
        };
        imgObj.src = image.dataUrl;

    }, [image, opacity]);

    const handleDownload = () => {
        if (!resultUrl) return;
        const link = document.createElement('a');
        link.href = resultUrl;
        link.download = `transparencia-${opacity}percent-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-4xl">👻</span>
                    <h2 className="text-3xl font-bold text-white">Estúdio de Transparência</h2>
                </div>
                <p className="text-gray-400 mt-2">
                    Ajuste a opacidade das suas imagens e guarde-as como PNG transparente.
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 flex-grow min-h-0">
                {/* Controls */}
                <div className="w-full lg:w-1/3 bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-fit space-y-6">
                    <div className="space-y-3">
                        <label className="block text-lg font-semibold text-gray-300">1. Carregar Imagem</label>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg bg-gray-900/50 hover:border-indigo-500 cursor-pointer transition-colors">
                            {image ? (
                                <img src={image.dataUrl} className="h-full w-full object-contain p-1" alt="Thumbnail" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span>Clique para carregar</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <label className="block text-lg font-semibold text-gray-300">2. Opacidade</label>
                            <span className="text-indigo-400 font-bold">{opacity}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="100" step="1" 
                            value={opacity} 
                            onChange={(e) => setOpacity(parseInt(e.target.value))}
                            className="w-full accent-indigo-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            disabled={!image}
                        />
                    </div>

                    <button 
                        onClick={handleDownload}
                        disabled={!resultUrl}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Descarregar PNG
                    </button>
                </div>

                {/* Preview */}
                <div className="w-full lg:w-2/3 bg-gray-900 rounded-xl border border-gray-700 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                    {/* Checkerboard Background for Transparency */}
                    <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: `linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)`,
                        backgroundSize: `20px 20px`,
                        backgroundPosition: `0 0, 0 10px, 10px -10px, -10px 0px`
                    }}></div>

                    {resultUrl ? (
                        <img 
                            src={resultUrl} 
                            alt="Resultado Transparente" 
                            className="max-w-full max-h-[70vh] object-contain relative z-10 shadow-2xl"
                        />
                    ) : (
                        <div className="text-center text-gray-500 relative z-10">
                            <p className="text-xl font-semibold">Pré-visualização</p>
                            <p className="text-sm">A imagem aparecerá aqui sobre o fundo xadrez.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
