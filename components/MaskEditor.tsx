
import React, { useState, useRef, useEffect, useCallback, MouseEvent } from 'react';
import type { UploadedImage } from '../types';
import { Spinner } from './Spinner';

interface MaskEditorProps {
    isOpen: boolean;
    onClose: () => void;
    sourceImage: string;
    onSubmit: (prompt: string, originalImage: UploadedImage, maskImage: UploadedImage) => void;
    initialMode?: 'edit' | 'erase' | 'enhance';
}

const dataUrlToUploadedImage = (dataUrl: string, mimeType: string = 'image/png'): UploadedImage => {
    const base64 = dataUrl.split(',')[1];
    return { id: crypto.randomUUID(), dataUrl, base64, mimeType };
};

export const MaskEditor: React.FC<MaskEditorProps> = ({ isOpen, onClose, sourceImage, onSubmit, initialMode = 'edit' }) => {
    const imageCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
    const [brushSize, setBrushSize] = useState(40);
    const [prompt, setPrompt] = useState('');
    const [history, setHistory] = useState<ImageData[]>([]);
    const [mode, setMode] = useState<'edit' | 'erase' | 'enhance'>(initialMode);
    
    // Reset mode when initialMode changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
        }
    }, [isOpen, initialMode]);

    const drawOnCanvas = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const pos = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (lastPos) {
                 ctx.beginPath();
                 ctx.moveTo(lastPos.x, lastPos.y);
                 ctx.lineTo(pos.x, pos.y);
                 ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        setLastPos(pos);
    }, [brushSize, lastPos]);

    const handleMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        const currentData = ctx.getImageData(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
        setHistory(prev => [...prev.slice(-19), currentData]); // Keep last 20 states
        
        setIsDrawing(true);
        drawOnCanvas(e);
    }, [drawOnCanvas]);

    const handleMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
        if (isDrawing) {
            drawOnCanvas(e);
        }
    }, [isDrawing, drawOnCanvas]);

    const handleMouseUp = useCallback(() => {
        setIsDrawing(false);
        setLastPos(null);
    }, []);
    
    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (ctx && lastState) {
            ctx.putImageData(lastState, 0, 0);
        }
        setHistory(prev => prev.slice(0, -1));
    }, [history]);
    
    const handleClear = useCallback(() => {
         const canvas = maskCanvasRef.current;
         const ctx = canvas?.getContext('2d');
         if (canvas && ctx) {
            const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setHistory(prev => [...prev.slice(-19), currentData]);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
         }
    }, []);

    const handleSubmit = () => {
        const maskCanvas = maskCanvasRef.current;
        
        // Determine prompt based on mode
        let finalPrompt = prompt.trim();

        if (mode === 'erase') {
            finalPrompt = "Remove masked content and reconstruct background details.";
        } else if (mode === 'enhance') {
            // Specialized prompt for sharpening/restoring faces or objects
            finalPrompt = "Enhance details, sharpen focus, improve clarity, fix blur, high resolution, photorealistic texture, maintain original identity.";
        }

        if (!maskCanvas || !finalPrompt) return;

        // Create a black background version of the mask for the API
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = maskCanvas.width;
        exportCanvas.height = maskCanvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) return;

        exportCtx.fillStyle = 'black';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        exportCtx.drawImage(maskCanvas, 0, 0); // White drawing on black background
        
        const maskDataUrl = exportCanvas.toDataURL('image/png');
        const originalImageAsUploaded = dataUrlToUploadedImage(sourceImage);
        const maskImageAsUploaded = dataUrlToUploadedImage(maskDataUrl);

        onSubmit(finalPrompt, originalImageAsUploaded, maskImageAsUploaded);
    };

    useEffect(() => {
        if (!isOpen || !sourceImage) return;

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = sourceImage;
        image.onload = () => {
            const imageCanvas = imageCanvasRef.current;
            const maskCanvas = maskCanvasRef.current;
            const container = containerRef.current;
            if (!imageCanvas || !maskCanvas || !container) return;
            
            const imageCtx = imageCanvas.getContext('2d');
            const maskCtx = maskCanvas.getContext('2d');
            if (!imageCtx || !maskCtx) return;
            
            const ratio = Math.min(container.clientWidth / image.width, container.clientHeight / image.height);
            const displayWidth = image.width * ratio;
            const displayHeight = image.height * ratio;
            
            [imageCanvas, maskCanvas].forEach(c => {
                c.width = image.width;
                c.height = image.height;
                c.style.width = `${displayWidth}px`;
                c.style.height = `${displayHeight}px`;
            });
            
            imageCtx.drawImage(image, 0, 0);
            maskCtx.clearRect(0, 0, image.width, image.height);
            setHistory([]);
        };
    }, [isOpen, sourceImage]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-6xl h-[95vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-white">
                        {mode === 'erase' ? 'Borracha Mágica' : mode === 'enhance' ? 'Melhorar Detalhes' : 'Edição Criativa'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                
                <div className="flex-grow flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
                    {/* Canvas Area */}
                    <div ref={containerRef} className="w-full md:w-2/3 h-full flex items-center justify-center relative bg-gray-900/50 rounded-lg">
                        <canvas ref={imageCanvasRef} className="absolute inset-0 m-auto" />
                        <canvas 
                            ref={maskCanvasRef} 
                            className={`absolute inset-0 m-auto opacity-40 mix-blend-screen ${
                                mode === 'erase' ? 'bg-red-500/20' : 
                                mode === 'enhance' ? 'bg-emerald-500/20' : 
                                'bg-indigo-500/20'
                            }`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            style={{ cursor: 'crosshair' }}
                        />
                        {mode === 'erase' && (
                            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md pointer-events-none">
                                MODO BORRACHA
                            </div>
                        )}
                        {mode === 'enhance' && (
                            <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md pointer-events-none">
                                MODO MELHORAR
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="w-full md:w-1/3 flex flex-col space-y-6">
                        <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
                           <h3 className="text-xl font-semibold">1. Selecione o Modo</h3>
                           
                           {/* Mode Toggle */}
                           <div className="flex p-1 bg-gray-800 rounded-lg gap-1">
                               <button 
                                   onClick={() => setMode('edit')}
                                   className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${mode === 'edit' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                               >
                                   Editar
                               </button>
                               <button 
                                   onClick={() => setMode('enhance')}
                                   className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${mode === 'enhance' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                               >
                                   Melhorar
                               </button>
                               <button 
                                   onClick={() => setMode('erase')}
                                   className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${mode === 'erase' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                               >
                                   Apagar
                               </button>
                           </div>

                           <div className="pt-2">
                                <label htmlFor="brush-size" className="block text-sm font-medium text-gray-400 mb-2">Tamanho do Pincel: {brushSize}px</label>
                                <input id="brush-size" type="range" min="5" max="150" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value, 10))} className="w-full accent-indigo-500" />
                           </div>
                           <div className="flex gap-2">
                                <button onClick={handleUndo} disabled={history.length === 0} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-600 text-white rounded-md text-sm font-semibold hover:bg-gray-700 disabled:bg-gray-700/50 disabled:cursor-not-allowed">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                                    Desfazer
                                </button>
                                <button onClick={handleClear} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-600 text-white rounded-md text-sm font-semibold hover:bg-gray-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    Limpar
                                </button>
                           </div>
                        </div>
                        
                        <div className="p-4 bg-gray-900/50 rounded-lg space-y-4 flex-grow flex flex-col">
                             <h3 className="text-xl font-semibold">2. Ação</h3>
                             
                             {mode === 'edit' && (
                                 <>
                                    <p className="text-sm text-gray-400">Descreva o que quer adicionar ou alterar na área pintada.</p>
                                    <textarea 
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                        placeholder="Ex: Adicione uns óculos de sol, mude a cor do cabelo..."
                                        className="w-full flex-grow p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors"
                                    />
                                 </>
                             )}
                             
                             {mode === 'enhance' && (
                                 <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 p-4 border-2 border-dashed border-emerald-700/50 rounded-lg bg-emerald-900/10">
                                     <div className="p-4 bg-emerald-500/10 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-emerald-400">Modo Melhorar Ativo</h4>
                                         <p className="text-sm text-gray-400 mt-2">Pinte sobre rostos ou áreas desfocadas. A IA irá aumentar a nitidez e recuperar detalhes automaticamente.</p>
                                     </div>
                                 </div>
                             )}

                             {mode === 'erase' && (
                                 <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4 p-4 border-2 border-dashed border-red-700/50 rounded-lg bg-red-900/10">
                                     <div className="p-4 bg-red-500/10 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                     </div>
                                     <div>
                                         <h4 className="font-bold text-red-400">Borracha Mágica Ativa</h4>
                                         <p className="text-sm text-gray-400 mt-2">Pinte sobre o que quer remover. A IA irá apagar o objeto e reconstruir o fundo automaticamente.</p>
                                     </div>
                                 </div>
                             )}
                        </div>
                        
                        <button 
                            onClick={handleSubmit}
                            disabled={mode === 'edit' && !prompt.trim()}
                            className={`w-full flex items-center justify-center px-6 py-4 font-semibold text-lg rounded-lg shadow-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed ${
                                mode === 'erase' ? 'bg-red-600 text-white hover:bg-red-700' :
                                mode === 'enhance' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                                'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            {mode === 'erase' ? 'Apagar Objeto' : mode === 'enhance' ? 'Melhorar Área' : 'Gerar Edição'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
