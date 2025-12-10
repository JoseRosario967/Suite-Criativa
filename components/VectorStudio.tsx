import React, { useState } from 'react';
import { generateVectorGraphic } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';
import type { UploadedImage } from '../types';

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

interface VectorStudioProps {
    onClose: () => void;
    personalApiKey: string;
}

const STYLES = [
    { id: 'flat', label: 'Flat Design', desc: 'Minimalista, cores sólidas' },
    { id: 'line-art', label: 'Line Art', desc: 'Traços finos, preto e branco' },
    { id: 'isometric', label: 'Isométrico', desc: '3D geométrico, técnico' },
    { id: 'logo', label: 'Logótipo', desc: 'Simples, memorável, icónico' },
    { id: 'sticker', label: 'Sticker', desc: 'Contorno branco, pop' }
];

export const VectorStudio: React.FC<VectorStudioProps> = ({ onClose, personalApiKey }) => {
    const [mode, setMode] = useState<'visual' | 'code'>('visual');
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('flat');
    const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
    const [result, setResult] = useState<{ svgCode?: string; imageUrl?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState('Copiar SVG');

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
        if (!prompt.trim() && !sourceImage) {
            setError("Por favor, descreva o que pretende criar ou carregue uma imagem.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const imagePayload = sourceImage ? { base64: sourceImage.base64, mimeType: sourceImage.mimeType } : undefined;
            const data = await generateVectorGraphic(prompt, mode, style, imagePayload, personalApiKey);
            setResult(data);
        } catch (e: any) {
            setError(e.message || "Ocorreu um erro ao gerar o vetor.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopySVG = () => {
        if (!result?.svgCode) return;
        navigator.clipboard.writeText(result.svgCode).then(() => {
            setCopyStatus('Copiado!');
            setTimeout(() => setCopyStatus('Copiar SVG'), 2000);
        });
    };

    const handleDownloadSVG = () => {
        if (!result?.svgCode) return;
        const blob = new Blob([result.svgCode], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vector-${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPNG = () => {
        if (!result?.imageUrl) return;
        const link = document.createElement('a');
        link.href = result.imageUrl;
        link.download = `vector-style-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClearImage = () => {
        setSourceImage(null);
    }

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
                    <span className="text-4xl">📐</span>
                    <h2 className="text-3xl font-bold text-white">Estúdio de Vetores & Ícones</h2>
                </div>
                <p className="text-gray-400 mt-2">
                    Crie gráficos escaláveis. Escolha entre <strong>Visual</strong> (Imagens estilo vetor de alta resolução) ou <strong>Código</strong> (SVG matemático real para web).
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 flex-grow min-h-0">
                {/* Left: Controls */}
                <div className="w-full lg:w-1/3 bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-fit space-y-6">
                    
                    {/* Mode Toggle */}
                    <div className="p-1 bg-gray-900 rounded-lg flex gap-1">
                        <button 
                            onClick={() => setMode('visual')} 
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'visual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            🎨 Visual (PNG)
                        </button>
                        <button 
                            onClick={() => setMode('code')} 
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'code' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            💻 Código (SVG)
                        </button>
                    </div>

                    <div className="bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/30 text-xs text-indigo-200">
                        {mode === 'visual' 
                            ? "Ideal para ilustrações complexas, arte digital e cenários. Resultado: Imagem (Raster)."
                            : "Ideal para logótipos simples, ícones e formas geométricas. Resultado: Código Vetorial."}
                    </div>

                    {/* Image Upload Area */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Referência Visual (Opcional)
                        </label>
                        {sourceImage ? (
                            <div className="relative w-full h-32 bg-gray-900 rounded-lg border border-indigo-500 flex items-center justify-center overflow-hidden group">
                                <img src={sourceImage.dataUrl} alt="Upload" className="h-full object-contain" />
                                <button 
                                    onClick={handleClearImage}
                                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg bg-gray-900 hover:border-indigo-500 cursor-pointer transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-xs text-gray-400">Vetorizar uma imagem</span>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        )}
                    </div>

                    {/* Style Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Estilo</label>
                        <div className="grid grid-cols-2 gap-2">
                            {STYLES.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setStyle(s.id)}
                                    className={`p-3 rounded-lg border text-left transition-all ${style === s.id ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'}`}
                                >
                                    <div className="font-bold text-sm">{s.label}</div>
                                    <div className="text-[10px] opacity-70">{s.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {sourceImage ? 'Detalhes Adicionais (Opcional)' : 'Descrição'}
                        </label>
                        <textarea 
                            value={prompt} 
                            onChange={(e) => setPrompt(e.target.value)} 
                            placeholder={sourceImage ? "Ex: Simplificar cores, remover fundo..." : (mode === 'visual' ? "Ex: Um astronauta a pescar numa nuvem..." : "Ex: Ícone de uma casa minimalista...")}
                            className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                        />
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || (!prompt.trim() && !sourceImage)}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner size="sm" className="text-white" /> A vetorizar...</div> : (sourceImage ? 'Converter para Vetor' : 'Gerar Gráfico')}
                    </button>
                </div>

                {/* Right: Result */}
                <div className="w-full lg:w-2/3 bg-gray-900/50 rounded-xl border border-gray-700 flex flex-col overflow-hidden min-h-[500px]">
                    <div className="flex-grow flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] bg-gray-800">
                        {isLoading ? (
                            <div className="text-center">
                                <Spinner size="lg" className="text-indigo-500 mb-4" />
                                <p className="text-gray-400 animate-pulse">A calcular curvas e nós...</p>
                            </div>
                        ) : result ? (
                            mode === 'code' && result.svgCode ? (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                    <div 
                                        className="w-full max-w-md aspect-square bg-transparent border border-gray-600 rounded-lg p-4 shadow-lg mb-6 svg-preview-container"
                                        dangerouslySetInnerHTML={{ __html: result.svgCode }}
                                    />
                                </div>
                            ) : result.imageUrl ? (
                                <img src={result.imageUrl} alt="Resultado Vetorial" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                            ) : null
                        ) : (
                            <div className="text-center text-gray-500 opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                                </svg>
                                <p className="text-xl font-semibold">Espaço de Trabalho</p>
                                <p>Gere os seus vetores aqui.</p>
                            </div>
                        )}
                    </div>

                    {result && (
                        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                                {mode === 'code' ? 'Formato: SVG (Escalável)' : 'Formato: PNG (Alta Resolução)'}
                            </div>
                            <div className="flex gap-3">
                                {mode === 'code' ? (
                                    <>
                                        <button onClick={handleCopySVG} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">{copyStatus}</button>
                                        <button onClick={handleDownloadSVG} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors">Download .SVG</button>
                                    </>
                                ) : (
                                    <button onClick={handleDownloadPNG} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors">Download .PNG</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};