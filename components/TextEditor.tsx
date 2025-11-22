import React, { useState, useRef, useEffect, useCallback, MouseEvent } from 'react';
import type { Watermark, TextLayer } from '../types';
import { applyWatermark } from '../utils/imageUtils';

const FONT_FACES = ['Impact', 'Arial', 'Helvetica', 'Verdana', 'Georgia', 'Courier New', 'Comic Sans MS'];

// --- Type Guards ---
const isInput = (target: EventTarget | null): target is HTMLInputElement => !!target && target instanceof HTMLInputElement;
const isSelect = (target: EventTarget | null): target is HTMLSelectElement => !!target && target instanceof HTMLSelectElement;
const isTextArea = (target: EventTarget | null): target is HTMLTextAreaElement => !!target && target instanceof HTMLTextAreaElement;


// --- Main Component ---
interface TextEditorProps {
    onClose: () => void;
    isWatermarkEnabled: boolean;
    activeWatermark: Watermark | null;
}

export const TextEditor: React.FC<TextEditorProps> = ({ onClose, isWatermarkEnabled, activeWatermark }) => {
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [layers, setLayers] = useState<TextLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    
    // Interaction State
    const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    const selectedLayer = layers.find(l => l.id === selectedLayerId) || null;
    
    // --- Helper for Dimension Calculation ---
    const calculateLayerDimensions = useCallback((layer: Pick<TextLayer, 'text' | 'font' | 'fontSize'>): { width: number; height: number } => {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return { width: 50, height: 20 }; // Fallback

        ctx.font = `${layer.fontSize}px ${layer.font}`;
        const lines = layer.text.split('\n');
        const metrics = lines.map(line => ctx.measureText(line));
        const width = Math.max(1, ...metrics.map(m => m.width));
        const lineHeight = layer.fontSize * 1.2;
        const height = Math.max(1, lines.length * lineHeight);

        return { width, height };
    }, []);

    // --- Layer Management ---
    const addLayer = useCallback(() => {
        if (!image) return; // Use the image as the guard to ensure dimensions are available.

        const partialLayer = {
            text: 'Novo Texto',
            font: 'Impact',
            fontSize: 50,
            color: '#FFFFFF',
            x: image.width / 2, // Position relative to the actual image dimensions
            y: image.height / 2,
            textAlign: 'center' as CanvasTextAlign,
        };
        
        const dimensions = calculateLayerDimensions(partialLayer);

        const newLayer: TextLayer = {
            id: crypto.randomUUID(),
            ...partialLayer,
            ...dimensions
        };

        setLayers(prev => [...prev, newLayer]);
        setSelectedLayerId(newLayer.id);
    }, [calculateLayerDimensions, image]); // Depend on image

    const updateLayer = useCallback((id: string, updates: Partial<TextLayer>) => {
        setLayers(prev => prev.map(l => {
            if (l.id === id) {
                const updatedLayer = { ...l, ...updates };
                if ('text' in updates || 'fontSize' in updates || 'font' in updates) {
                    const { width, height } = calculateLayerDimensions(updatedLayer);
                    return { ...updatedLayer, width, height };
                }
                return updatedLayer;
            }
            return l;
        }));
    }, [calculateLayerDimensions]);

    const deleteLayer = (id: string) => {
        setLayers(prev => prev.filter(l => l.id !== id));
        if (selectedLayerId === id) {
            setSelectedLayerId(null);
        }
    };
    
    const moveLayer = (id: string, direction: 'up' | 'down') => {
        setLayers(currentLayers => {
            const index = currentLayers.findIndex(l => l.id === id);
            if (index === -1) return currentLayers;
            
            const newLayers = [...currentLayers];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;

            if (targetIndex >= 0 && targetIndex < newLayers.length) {
                [newLayers[index], newLayers[targetIndex]] = [newLayers[targetIndex], newLayers[index]];
            }
            return newLayers;
        });
    };
    
    // --- Canvas Drawing ---
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !image) return;

        // Scale canvas to fit container while maintaining aspect ratio
        const container = containerRef.current;
        if(!container) return;

        const ratio = Math.min(container.clientWidth / image.width, container.clientHeight / image.height, 1);
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.style.width = `${image.width * ratio}px`;
        canvas.style.height = `${image.height * ratio}px`;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        // Draw layers from bottom to top
        layers.forEach(layer => {
            ctx.font = `${layer.fontSize}px ${layer.font}`;
            ctx.fillStyle = layer.color;
            ctx.textAlign = layer.textAlign;
            ctx.textBaseline = 'top';

            const lines = layer.text.split('\n');
            const lineHeight = layer.fontSize * 1.2;
            
            lines.forEach((line, index) => {
                ctx.fillText(line, layer.x, layer.y + (index * lineHeight));
            });

            // Draw bounding box for selected layer
            if (layer.id === selectedLayerId) {
                ctx.strokeStyle = '#6366F1';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 3]);
                const boxX = layer.textAlign === 'center' ? layer.x - layer.width / 2 : layer.textAlign === 'right' ? layer.x - layer.width : layer.x;
                ctx.strokeRect(boxX - 5, layer.y - 5, layer.width + 10, layer.height + 10);
                ctx.setLineDash([]);
            }
        });
    }, [image, layers, selectedLayerId]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    useEffect(() => {
        const handleResize = () => drawCanvas();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [drawCanvas]);

    // --- Event Handlers ---
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    setImage(img);
                    setLayers([]);
                    setSelectedLayerId(null);
                }
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
        if(event.currentTarget) event.currentTarget.value = '';
    };

    const handleCanvasMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        // Check for hit on a layer, from top to bottom
        let hitLayer: TextLayer | null = null;
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            const boxX = layer.textAlign === 'center' ? layer.x - layer.width / 2 : layer.textAlign === 'right' ? layer.x - layer.width : layer.x;
            if (mouseX >= boxX && mouseX <= boxX + layer.width && mouseY >= layer.y && mouseY <= layer.y + layer.height) {
                hitLayer = layer;
                break;
            }
        }
        
        if (hitLayer) {
            setSelectedLayerId(hitLayer.id);
            setDragging({
                id: hitLayer.id,
                offsetX: mouseX - hitLayer.x,
                offsetY: mouseY - hitLayer.y,
            });
        } else {
            setSelectedLayerId(null);
        }
    };
    
    const handleCanvasMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
        if (!dragging) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        updateLayer(dragging.id, { x: mouseX - dragging.offsetX, y: mouseY - dragging.offsetY });
    };

    const handleCanvasMouseUp = () => {
        setDragging(null);
    };

    const handleCanvasDoubleClick = () => {
        if (selectedLayer) {
            setEditingLayerId(selectedLayer.id);
            setEditText(selectedLayer.text);
        }
    };

    const handleSaveTextEdit = () => {
        if (editingLayerId) {
            updateLayer(editingLayerId, { text: editText });
            setEditingLayerId(null);
        }
    };

    const handleControlChange = (e: React.ChangeEvent) => {
        if (!selectedLayer) return;

        const target = e.target;
        let value: any;
        if (isInput(target)) {
            value = target.type === 'number' ? parseInt(target.value, 10) : target.value;
        } else if (isSelect(target) || isTextArea(target)) {
            value = target.value;
        }

        const name = (target as HTMLInputElement).name;
        updateLayer(selectedLayer.id, { [name]: value });
    };
    
     const handleDownload = useCallback(async () => {
        if (!image) return;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(image, 0, 0);
        
        layers.forEach(layer => {
            ctx.font = `${layer.fontSize}px ${layer.font}`;
            ctx.fillStyle = layer.color;
            ctx.textAlign = layer.textAlign;
            ctx.textBaseline = 'top';
            const lines = layer.text.split('\n');
            lines.forEach((line, index) => {
                ctx.fillText(line, layer.x, layer.y + (index * layer.fontSize * 1.2));
            });
        });
        
        let finalDataUrl = tempCanvas.toDataURL('image/png');

        if (isWatermarkEnabled && activeWatermark) {
            finalDataUrl = await applyWatermark(finalDataUrl, activeWatermark);
        }

        const link = document.createElement('a');
        link.download = `edited-image-${Date.now()}.png`;
        link.href = finalDataUrl;
        link.click();

    }, [image, layers, isWatermarkEnabled, activeWatermark]);
    
    const handleClearAll = () => {
        setImage(null);
        setLayers([]);
        setSelectedLayerId(null);
    }
    
    // --- Render ---
    return (
        <div className="relative w-full">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-20 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar Editor de Texto"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Control Panel */}
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 w-full lg:w-1/3 flex flex-col space-y-4">
                    <h2 className="text-2xl font-bold text-white mb-2">Editor de Texto</h2>
                    
                    {/* Layer Manager */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-300">Camadas de Texto</h3>
                        <div className="h-40 bg-gray-900/50 rounded-md p-2 overflow-y-auto space-y-2">
                            {layers.map((layer, index) => (
                                <div key={layer.id} onClick={() => setSelectedLayerId(layer.id)}
                                     className={`p-2 rounded-md flex justify-between items-center cursor-pointer transition-colors ${selectedLayerId === layer.id ? 'bg-indigo-600/50' : 'bg-gray-700/50 hover:bg-gray-600/50'}`}>
                                    <span className="truncate flex-grow">{layer.text}</span>
                                    <div className="flex-shrink-0 flex items-center">
                                        <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }} disabled={index === 0} className="p-1 disabled:opacity-20"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg></button>
                                        <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }} disabled={index === layers.length-1} className="p-1 disabled:opacity-20"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg></button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }} className="p-1 text-red-400 hover:text-red-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={addLayer} disabled={!image} className="w-full py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-md text-sm">Adicionar Texto</button>
                    </div>

                    {/* Properties Panel */}
                     <div className={`space-y-4 pt-4 border-t border-gray-700 transition-opacity ${!selectedLayer ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Fonte</label>
                                <select name="font" value={selectedLayer?.font || ''} onChange={handleControlChange} disabled={!selectedLayer} className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-sm">
                                    {FONT_FACES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Tamanho</label>
                                <input type="number" name="fontSize" value={selectedLayer?.fontSize || ''} onChange={handleControlChange} disabled={!selectedLayer} min="1" className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-sm" />
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Cor</label>
                            <input type="color" name="color" value={selectedLayer?.color || '#FFFFFF'} onChange={handleControlChange} disabled={!selectedLayer} className="w-full h-10 p-1 bg-gray-800 border border-gray-600 rounded-md cursor-pointer" />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-400 mb-1">Alinhamento</label>
                             <div className="flex space-x-2">
                                {(['left', 'center', 'right'] as const).map(a => (
                                    <button key={a} onClick={() => selectedLayer && updateLayer(selectedLayer.id, { textAlign: a })} disabled={!selectedLayer} className={`flex-1 py-2 text-sm capitalize rounded-md ${selectedLayer?.textAlign === a ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{a}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-grow flex flex-col justify-end space-y-4 pt-4">
                        <button onClick={handleDownload} disabled={!image} className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed">Descarregar Imagem</button>
                        <button onClick={handleClearAll} className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">Limpar e Começar de Novo</button>
                    </div>
                </div>

                {/* Image Preview Area */}
                <div ref={containerRef} className="w-full lg:w-2/3 h-[80vh] bg-gray-900/50 border-2 border-gray-700 rounded-lg flex items-center justify-center p-4">
                    {image ? (
                        <canvas 
                            ref={canvasRef} 
                            className="max-w-full max-h-full"
                            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            onMouseLeave={handleCanvasMouseUp}
                            onDoubleClick={handleCanvasDoubleClick}
                        />
                    ) : (
                        <div className="text-center text-gray-500">
                             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <h3 className="mt-4 font-semibold text-lg">Carregue uma imagem para começar</h3>
                            <button onClick={() => fileInputRef.current?.click()} className="mt-6 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700">
                                Carregar Imagem
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Text Modal */}
            {editingLayerId && selectedLayer && (
                <div className="fixed inset-0 bg-black/80 z-20 flex items-center justify-center p-4">
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 w-full max-w-lg space-y-4">
                        <h3 className="text-xl font-semibold">Editar Texto</h3>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full h-32 p-2 bg-gray-900 rounded-md" />
                        <div className="flex gap-4">
                            <button onClick={() => setEditingLayerId(null)} className="flex-1 py-2 bg-gray-600 rounded-md">Cancelar</button>
                            <button onClick={handleSaveTextEdit} className="flex-1 py-2 bg-indigo-600 rounded-md">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};