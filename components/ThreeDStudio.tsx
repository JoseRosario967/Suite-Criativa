
import React, { useState } from 'react';
import { generateOrEditImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';
import { applyWatermark } from '../utils/imageUtils';
import type { UploadedImage, Watermark } from '../types';

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

interface ThreeDStudioProps {
    onClose: () => void;
    personalApiKey: string;
    isWatermarkEnabled: boolean;
    activeWatermark: Watermark | null;
}

const STYLES = [
    { id: 'pixar', label: 'Cartoon 3D', desc: 'Estilo Pixar/Disney, fofo e colorido' },
    { id: 'clay', label: 'Plasticina (Clay)', desc: 'Estilo "Fuga das Galinhas", texturas de barro' },
    { id: 'voxel', label: 'Voxel Art', desc: 'Estilo Minecraft/Lego, blocos cúbicos' },
    { id: 'lowpoly', label: 'Low Poly', desc: 'Geometria simples, estilo retro gaming' },
    { id: 'unreal', label: 'Render Realista', desc: 'Iluminação cinemática Unreal Engine 5' },
    { id: 'origami', label: 'Origami 3D', desc: 'Papel dobrado tridimensional' },
    { id: 'cyberpunk', label: 'Cyberpunk 3D', desc: 'Neon, metal e reflexos futuristas' },
    { id: 'funko', label: 'Boneco Pop', desc: 'Cabeça grande, olhos redondos, estilo vinil' }
];

export const ThreeDStudio: React.FC<ThreeDStudioProps> = ({ onClose, personalApiKey, isWatermarkEnabled, activeWatermark }) => {
    const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
    const [selectedStyle, setSelectedStyle] = useState('pixar');
    const [prompt, setPrompt] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const img = await fileToUploadedImage(file);
                setSourceImage(img);
                setError(null);
            } catch (err) {
                setError("Falha ao carregar a imagem.");
            }
        }
        event.currentTarget.value = '';
    };

    const handleGenerate = async () => {
        if (!sourceImage) {
            setError("Por favor, carregue uma imagem para transformar.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultImage(null);

        try {
            const styleInfo = STYLES.find(s => s.id === selectedStyle);
            
            // Construção do Prompt Inteligente
            let finalPrompt = `Transform this image into a ${styleInfo?.label} 3D render. `;
            finalPrompt += `Style details: ${styleInfo?.desc}. `;
            finalPrompt += `Keep the original composition, colors, and subject pose but change the material, texture and lighting to look like a high quality 3D model. `;
            
            if (prompt.trim()) {
                finalPrompt += `Additional instructions: ${prompt}`;
            }

            // Usamos o modelo de edição de imagem
            const result = await generateOrEditImage(
                finalPrompt,
                [{ base64: sourceImage.base64, mimeType: sourceImage.mimeType }],
                { quality: 'standard', aspectRatio: '1:1' },
                personalApiKey
            );

            // Aplicação da Marca d'Água (Se ativa)
            let finalImage = result;
            if (isWatermarkEnabled && activeWatermark) {
                finalImage = await applyWatermark(result, activeWatermark);
            }

            setResultImage(finalImage);

        } catch (e: any) {
            setError(e.message || "Erro ao transformar a imagem.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `3d-render-${selectedStyle}-${Date.now()}.png`;
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-4xl">🧊</span>
                    <h2 className="text-3xl font-bold text-white">Estúdio de Renderização 3D</h2>
                </div>
                <p className="text-gray-400 mt-2">
                    Transforme as suas fotos 2D em impressionantes renders 3D com texturas e iluminação volumétrica.
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 flex-grow min-h-0">
                {/* Left: Controls */}
                <div className="w-full lg:w-1/3 bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-fit space-y-6">
                    
                    {/* Image Input */}
                    <div>
                        <label className="block text-lg font-semibold text-gray-300 mb-2">1. Imagem Original</label>
                        {sourceImage ? (
                            <div className="relative w-full h-48 bg-gray-900 rounded-lg border border-indigo-500 flex items-center justify-center overflow-hidden group">
                                <img src={sourceImage.dataUrl} alt="Original" className="h-full object-contain" />
                                <button 
                                    onClick={() => setSourceImage(null)}
                                    className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-lg bg-gray-900/50 hover:border-indigo-500 cursor-pointer transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-sm text-gray-400">Carregar Foto</span>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        )}
                    </div>

                    {/* Style Grid */}
                    <div>
                        <label className="block text-lg font-semibold text-gray-300 mb-2">2. Estilo de Renderização</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {STYLES.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedStyle(s.id)}
                                    className={`p-3 rounded-lg border text-left transition-all ${selectedStyle === s.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-md scale-[1.02]' : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'}`}
                                >
                                    <div className="font-bold text-sm">{s.label}</div>
                                    <div className="text-[10px] opacity-70 leading-tight mt-1">{s.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt Extra */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Detalhes Extra (Opcional)</label>
                        <input 
                            type="text" 
                            value={prompt} 
                            onChange={(e) => setPrompt(e.target.value)} 
                            placeholder="Ex: Adiciona óculos de sol, fundo azul..."
                            className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={handleGenerate} 
                            disabled={isLoading || !sourceImage}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
                        >
                            {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner size="sm" className="text-white" /> A renderizar 3D...</div> : 'Transformar em 3D'}
                        </button>
                        
                        {isWatermarkEnabled && activeWatermark && (
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span>Marca d'água "{activeWatermark.name}" ativa</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Result */}
                <div className="w-full lg:w-2/3 bg-gray-900/50 rounded-xl border border-gray-700 flex flex-col overflow-hidden min-h-[500px] relative">
                    {/* Background Grid Effect */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                        backgroundImage: `linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}></div>

                    <div className="flex-grow flex items-center justify-center p-8 relative z-10">
                        {isLoading ? (
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-6 relative">
                                    {/* 3D Cube Spinner */}
                                    <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                    <div className="absolute inset-4 border-4 border-purple-500 border-b-transparent rounded-full animate-spin-reverse"></div>
                                </div>
                                <p className="text-indigo-300 font-semibold text-lg animate-pulse">A construir polígonos...</p>
                                <p className="text-gray-500 text-sm mt-2">Aplicando texturas e iluminação</p>
                            </div>
                        ) : resultImage ? (
                            <img src={resultImage} alt="Resultado 3D" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-gray-600" />
                        ) : (
                            <div className="text-center text-gray-500 opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <p className="text-2xl font-bold">Preview do Render</p>
                                <p className="mt-2">O seu objeto 3D aparecerá aqui.</p>
                            </div>
                        )}
                    </div>

                    {resultImage && (
                        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end z-20">
                            <button 
                                onClick={handleDownload}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Resultado
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
