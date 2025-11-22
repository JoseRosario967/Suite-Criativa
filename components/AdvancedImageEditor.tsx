
import React, { useState, useRef, useEffect, useCallback, MouseEvent } from 'react';

// --- Helper Types & Constants ---
type Tool = 'adjust' | 'transform' | 'crop';
type AspectRatio = 'free' | '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
type CropAction = 'move' | 'resize-nw' | 'resize-n' | 'resize-ne' | 'resize-w' | 'resize-e' | 'resize-sw' | 'resize-s' | 'resize-se' | null;

interface EditState {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  sepia: number;
}

const INITIAL_EDIT_STATE: EditState = {
  rotation: 0,
  flipH: false,
  flipV: false,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
};

const ASPECT_RATIOS: Record<AspectRatio, number | null> = {
    'free': null,
    '1:1': 1,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '4:3': 4 / 3,
    '3:4': 3 / 4,
};


// --- Props ---
interface AdvancedImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onApply: (originalSrc: string, newSrc: string) => void;
}


// --- Main Component ---
export const AdvancedImageEditor: React.FC<AdvancedImageEditorProps> = ({ isOpen, onClose, imageSrc, onApply }) => {
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Component State
    const [activeTool, setActiveTool] = useState<Tool>('adjust');
    const [editState, setEditState] = useState<EditState>(INITIAL_EDIT_STATE);
    
    // Crop-specific State
    const [cropBox, setCropBox] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [cropDragStart, setCropDragStart] = useState<{ mouseX: number, mouseY: number, box: NonNullable<typeof cropBox> } | null>(null);
    const [cropAction, setCropAction] = useState<CropAction>(null);
    const [activeAspectRatio, setActiveAspectRatio] = useState<AspectRatio>('free');

    const updateEditState = (updates: Partial<EditState>) => {
        setEditState(prev => ({ ...prev, ...updates }));
    };

    const resetAdjustments = () => {
        updateEditState({
            brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0
        });
    };

    const resetTransforms = () => {
        updateEditState({ rotation: 0, flipH: false, flipV: false });
    };

    const resetAll = () => {
        setEditState(INITIAL_EDIT_STATE);
        const image = imageRef.current;
        if (image) {
            setCropBox({ x: 0, y: 0, width: image.width, height: image.height });
        } else {
            setCropBox(null);
        }
        setActiveAspectRatio('free');
    };
    
    // --- Canvas Drawing Logic ---
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        const container = containerRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !image || !container) return;

        const { rotation, flipH, flipV, ...adjustments } = editState;
        
        // Fit canvas in container
        const imageAspectRatio = image.width / image.height;
        let displayWidth = container.clientWidth;
        let displayHeight = displayWidth / imageAspectRatio;

        if (displayHeight > container.clientHeight) {
            displayHeight = container.clientHeight;
            displayWidth = displayHeight * imageAspectRatio;
        }
        
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        // Set canvas resolution to image resolution
        canvas.width = image.width;
        canvas.height = image.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply filters
        ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturate}%) grayscale(${adjustments.grayscale}%) sepia(${adjustments.sepia}%)`;

        // Apply transformations
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);
        ctx.restore();

        // Reset filter for drawing overlays
        ctx.filter = 'none';

        // Draw crop overlay
        if (activeTool === 'crop' && cropBox) {
            // Dim the area outside the crop box by drawing four rectangles around it
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            // Top rectangle
            ctx.fillRect(0, 0, canvas.width, cropBox.y);
            // Bottom rectangle
            ctx.fillRect(0, cropBox.y + cropBox.height, canvas.width, canvas.height - (cropBox.y + cropBox.height));
            // Left rectangle
            ctx.fillRect(0, cropBox.y, cropBox.x, cropBox.height);
            // Right rectangle
            ctx.fillRect(cropBox.x + cropBox.width, cropBox.y, canvas.width - (cropBox.x + cropBox.width), cropBox.height);


            // Draw border and rule of thirds grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);

            // Rule of thirds lines
            ctx.beginPath();
            ctx.moveTo(cropBox.x + cropBox.width / 3, cropBox.y);
            ctx.lineTo(cropBox.x + cropBox.width / 3, cropBox.y + cropBox.height);
            ctx.moveTo(cropBox.x + cropBox.width * 2 / 3, cropBox.y);
            ctx.lineTo(cropBox.x + cropBox.width * 2 / 3, cropBox.y + cropBox.height);
            ctx.moveTo(cropBox.x, cropBox.y + cropBox.height / 3);
            ctx.lineTo(cropBox.x + cropBox.width, cropBox.y + cropBox.height / 3);
            ctx.moveTo(cropBox.x, cropBox.y + cropBox.height * 2 / 3);
            ctx.lineTo(cropBox.x + cropBox.width, cropBox.y + cropBox.height * 2 / 3);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.stroke();
        }

    }, [editState, activeTool, cropBox]);
    
    // Load image and draw initially
    useEffect(() => {
        if (!isOpen || !imageSrc) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageSrc;
        img.onload = () => {
            imageRef.current = img;
            resetAll(); // Reset state when new image is loaded
            draw();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, imageSrc]);

    // Redraw when state changes
    useEffect(() => {
        draw();
    }, [editState, cropBox, activeTool, draw]);
    
     // Handle window resize
    useEffect(() => {
        window.addEventListener('resize', draw);
        return () => window.removeEventListener('resize', draw);
    }, [draw]);

    // --- Crop Logic ---
    useEffect(() => {
        if (activeTool === 'crop' && !cropBox && imageRef.current) {
            setCropBox({ x: 0, y: 0, width: imageRef.current.width, height: imageRef.current.height });
        }
    }, [activeTool, cropBox]);

    const getCropAction = (x: number, y: number, box: NonNullable<typeof cropBox>): CropAction => {
        const handleSize = 20; // Clickable area size for handles
        const { x: bx, y: by, width: bw, height: bh } = box;
        
        const onLeft = x > bx - handleSize && x < bx + handleSize;
        const onRight = x > bx + bw - handleSize && x < bx + bw + handleSize;
        const onTop = y > by - handleSize && y < by + handleSize;
        const onBottom = y > by + bh - handleSize && y < by + bh + handleSize;
        const onHorizontal = x > bx && x < bx + bw;
        const onVertical = y > by && y < by + bh;

        if (onTop && onLeft) return 'resize-nw';
        if (onTop && onRight) return 'resize-ne';
        if (onBottom && onLeft) return 'resize-sw';
        if (onBottom && onRight) return 'resize-se';
        if (onTop && onHorizontal) return 'resize-n';
        if (onBottom && onHorizontal) return 'resize-s';
        if (onLeft && onVertical) return 'resize-w';
        if (onRight && onVertical) return 'resize-e';
        if (onHorizontal && onVertical) return 'move';
        return null;
    }

    const handleCropMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'crop' || !cropBox) return;
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const action = getCropAction(mouseX, mouseY, cropBox);
        if(action) {
            setCropAction(action);
            setCropDragStart({ mouseX, mouseY, box: { ...cropBox } });
        }
    };

    const handleCropMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || activeTool !== 'crop' || !cropBox) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        if (cropDragStart) { // We are dragging
            const dx = mouseX - cropDragStart.mouseX;
            const dy = mouseY - cropDragStart.mouseY;
            const initialBox = cropDragStart.box;
            let newBox = { ...initialBox };

            const ratio = ASPECT_RATIOS[activeAspectRatio];
            const minSize = 20;

            switch(cropAction) {
                case 'move':
                    newBox.x = Math.max(0, Math.min(initialBox.x + dx, canvas.width - initialBox.width));
                    newBox.y = Math.max(0, Math.min(initialBox.y + dy, canvas.height - initialBox.height));
                    break;
                case 'resize-e':
                    newBox.width = Math.max(minSize, Math.min(initialBox.width + dx, canvas.width - initialBox.x));
                    if(ratio) newBox.height = newBox.width / ratio;
                    break;
                case 'resize-w':
                    newBox.width = Math.max(minSize, initialBox.width - dx);
                    newBox.x = initialBox.x + initialBox.width - newBox.width;
                    if(ratio) newBox.height = newBox.width / ratio;
                    break;
                case 'resize-s':
                    newBox.height = Math.max(minSize, Math.min(initialBox.height + dy, canvas.height - initialBox.y));
                    if(ratio) newBox.width = newBox.height * ratio;
                    break;
                case 'resize-n':
                    newBox.height = Math.max(minSize, initialBox.height - dy);
                    newBox.y = initialBox.y + initialBox.height - newBox.height;
                    if(ratio) newBox.width = newBox.height * ratio;
                    break;
                 case 'resize-se':
                    newBox.width = Math.max(minSize, Math.min(initialBox.width + dx, canvas.width - initialBox.x));
                    if(ratio) {
                        newBox.height = newBox.width / ratio;
                    } else {
                        newBox.height = Math.max(minSize, Math.min(initialBox.height + dy, canvas.height - initialBox.y));
                    }
                    break;
                case 'resize-sw':
                    newBox.width = Math.max(minSize, initialBox.width - dx);
                    newBox.x = initialBox.x + initialBox.width - newBox.width;
                     if(ratio) {
                        newBox.height = newBox.width / ratio;
                    } else {
                        newBox.height = Math.max(minSize, Math.min(initialBox.height + dy, canvas.height - initialBox.y));
                    }
                    break;
                case 'resize-ne':
                    newBox.width = Math.max(minSize, Math.min(initialBox.width + dx, canvas.width - initialBox.x));
                    if(ratio) {
                        const hChange = (newBox.width / ratio) - initialBox.height;
                        newBox.height = newBox.width / ratio;
                        newBox.y = initialBox.y - hChange;
                    } else {
                        newBox.height = Math.max(minSize, initialBox.height - dy);
                        newBox.y = initialBox.y + initialBox.height - newBox.height;
                    }
                    break;
                 case 'resize-nw':
                    newBox.width = Math.max(minSize, initialBox.width - dx);
                    newBox.x = initialBox.x + initialBox.width - newBox.width;
                    if(ratio) {
                        const hChange = (newBox.width / ratio) - initialBox.height;
                        newBox.height = newBox.width / ratio;
                        newBox.y = initialBox.y - hChange;
                    } else {
                         newBox.height = Math.max(minSize, initialBox.height - dy);
                         newBox.y = initialBox.y + initialBox.height - newBox.height;
                    }
                    break;
            }
            
            // Final boundary checks
            if (newBox.x < 0) { newBox.width += newBox.x; newBox.x = 0; }
            if (newBox.y < 0) { newBox.height += newBox.y; newBox.y = 0; }
            if (newBox.x + newBox.width > canvas.width) { newBox.width = canvas.width - newBox.x; }
            if (newBox.y + newBox.height > canvas.height) { newBox.height = canvas.height - newBox.y; }

            setCropBox(newBox);
        } else { // We are hovering
            const action = getCropAction(mouseX, mouseY, cropBox);
            const cursorMap: Record<NonNullable<CropAction>, string> = {
                'move': 'move',
                'resize-n': 'n-resize',
                'resize-s': 's-resize',
                'resize-e': 'e-resize',
                'resize-w': 'w-resize',
                'resize-ne': 'ne-resize',
                'resize-nw': 'nw-resize',
                'resize-se': 'se-resize',
                'resize-sw': 'sw-resize',
            }
            canvas.style.cursor = action ? cursorMap[action] : 'default';
        }
    };
    
    const handleCropMouseUp = () => {
        setCropDragStart(null);
        setCropAction(null);
    };
    
    const setCropAspectRatio = (ratioKey: AspectRatio) => {
        setActiveAspectRatio(ratioKey);
        const image = imageRef.current;
        if (!image) return;

        const ratio = ASPECT_RATIOS[ratioKey];
        if (!ratio) { // free
            setCropBox({ x: 0, y: 0, width: image.width, height: image.height });
            return;
        }

        const imageRatio = image.width / image.height;
        let newWidth = image.width;
        let newHeight = image.height;

        if (ratio > imageRatio) {
            newHeight = image.width / ratio;
        } else {
            newWidth = image.height * ratio;
        }
        
        const newX = (image.width - newWidth) / 2;
        const newY = (image.height - newHeight) / 2;
        
        setCropBox({ x: newX, y: newY, width: newWidth, height: newHeight });
    };


    // --- Final Apply Logic ---
    const handleApply = () => {
        const image = imageRef.current;
        if (!image) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Determine final dimensions
        const finalWidth = cropBox ? Math.round(cropBox.width) : image.width;
        const finalHeight = cropBox ? Math.round(cropBox.height) : image.height;
        
        tempCanvas.width = finalWidth;
        tempCanvas.height = finalHeight;
        
        const { rotation, flipH, flipV, ...adjustments } = editState;
        
        tempCtx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturate}%) grayscale(${adjustments.grayscale}%) sepia(${adjustments.sepia}%)`;

        tempCtx.save();
        
        tempCtx.translate(finalWidth / 2, finalHeight / 2);
        tempCtx.rotate(rotation * Math.PI / 180);
        tempCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        
        // Draw the relevant part of the original image
        const cropX = cropBox ? cropBox.x : 0;
        const cropY = cropBox ? cropBox.y : 0;
        const cropW = cropBox ? cropBox.width : image.width;
        const cropH = cropBox ? cropBox.height : image.height;
        
        tempCtx.drawImage(
            image,
            cropX, cropY, cropW, cropH, // Source rectangle
            -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight // Destination rectangle
        );
        
        tempCtx.restore();

        onApply(imageSrc, tempCanvas.toDataURL('image/png'));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-7xl h-[95vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Estúdio de Edição Avançada</h2>
                    <div className="flex items-center gap-4">
                        <button onClick={resetAll} className="px-3 py-1 text-sm bg-gray-600 rounded-md hover:bg-gray-700">Redefinir Tudo</button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>
                
                <div className="flex-grow flex gap-6 p-6 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-16 flex flex-col items-center gap-4">
                        {(['adjust', 'transform', 'crop'] as Tool[]).map(tool => (
                            <button key={tool} onClick={() => setActiveTool(tool)} className={`p-3 rounded-lg w-full ${activeTool === tool ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                                <IconForTool tool={tool} />
                            </button>
                        ))}
                    </div>
                    
                    {/* Canvas Area */}
                    <div ref={containerRef} className="flex-grow h-full flex items-center justify-center bg-gray-900/50 rounded-lg touch-none">
                       <canvas 
                            ref={canvasRef} 
                            onMouseDown={handleCropMouseDown}
                            onMouseMove={handleCropMouseMove}
                            onMouseUp={handleCropMouseUp}
                            onMouseLeave={handleCropMouseUp}
                       />
                    </div>

                    {/* Controls Panel */}
                    <div className="w-72 flex flex-col gap-4">
                        {activeTool === 'adjust' && <AdjustControls state={editState} onChange={updateEditState} onReset={resetAdjustments} />}
                        {activeTool === 'transform' && <TransformControls state={editState} onChange={updateEditState} onReset={resetTransforms} />}
                        {activeTool === 'crop' && <CropControls activeRatio={activeAspectRatio} onRatioChange={setCropAspectRatio} />}
                    </div>
                </div>

                <footer className="p-4 border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700">Cancelar</button>
                    <button onClick={handleApply} className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">Aplicar Alterações</button>
                </footer>
            </div>
        </div>
    );
};


// --- Sub-Components for Controls ---

const AdjustControls: React.FC<{ state: EditState, onChange: (u: Partial<EditState>) => void, onReset: () => void }> = ({ state, onChange, onReset }) => {
    
    const applyBlackAndWhite = () => {
        onChange({
            brightness: 100,
            contrast: 100,
            saturate: 100,
            grayscale: 100,
            sepia: 0,
        });
    };

    const applyVintage = () => {
        onChange({
            brightness: 105,
            contrast: 90,
            saturate: 120,
            grayscale: 0,
            sepia: 80,
        });
    };

    return (
        <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Ajustes</h3>
                <button onClick={onReset} className="text-xs text-indigo-400 hover:underline">Redefinir</button>
            </div>

            <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Filtros Rápidos</h4>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={applyBlackAndWhite} className="p-2 bg-gray-700 rounded-md text-sm hover:bg-gray-600 transition-colors">Preto e Branco</button>
                    <button onClick={applyVintage} className="p-2 bg-gray-700 rounded-md text-sm hover:bg-gray-600 transition-colors">Vintage</button>
                </div>
            </div>

            <SliderControl label="Brilho" value={state.brightness} onChange={v => onChange({ brightness: v })} min={0} max={200} />
            <SliderControl label="Contraste" value={state.contrast} onChange={v => onChange({ contrast: v })} min={0} max={200} />
            <SliderControl label="Saturação" value={state.saturate} onChange={v => onChange({ saturate: v })} min={0} max={200} />
            <SliderControl label="Tons de Cinzento" value={state.grayscale} onChange={v => onChange({ grayscale: v })} />
            <SliderControl label="Sépia" value={state.sepia} onChange={v => onChange({ sepia: v })} />
        </div>
    );
};

const SliderControl: React.FC<{ label: string, value: number, onChange: (v: number) => void, min?: number, max?: number }> = ({ label, value, onChange, min = 0, max = 100 }) => (
    <div>
        <label className="block text-sm text-gray-400">{label} ({value})</label>
        <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))} className="w-full" />
    </div>
);

const TransformControls: React.FC<{ state: EditState, onChange: (u: Partial<EditState>) => void, onReset: () => void }> = ({ state, onChange, onReset }) => (
    <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
        <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold">Transformar</h3>
             <button onClick={onReset} className="text-xs text-indigo-400 hover:underline">Redefinir</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onChange({ rotation: (state.rotation - 90) % 360 })} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600">Rodar 90° Esq.</button>
            <button onClick={() => onChange({ rotation: (state.rotation + 90) % 360 })} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600">Rodar 90° Dir.</button>
            <button onClick={() => onChange({ flipH: !state.flipH })} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600">Virar H</button>
            <button onClick={() => onChange({ flipV: !state.flipV })} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600">Virar V</button>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Rotação Precisa (15°)</label>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onChange({ rotation: (state.rotation - 15) % 360 })} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 text-sm">
                    -15°
                </button>
                <button onClick={() => onChange({ rotation: (state.rotation + 15) % 360 })} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 text-sm">
                    +15°
                </button>
            </div>
        </div>
        <div className="text-center text-xs text-gray-500">
            Rotação atual: {Math.round(state.rotation)}°
        </div>
    </div>
);

const CropControls: React.FC<{ activeRatio: AspectRatio, onRatioChange: (r: AspectRatio) => void }> = ({ activeRatio, onRatioChange }) => (
    <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold">Cortar</h3>
        <div className="flex flex-wrap gap-2">
            {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map(ratio => (
                <button key={ratio} onClick={() => onRatioChange(ratio)} className={`px-3 py-1 text-sm rounded-md ${activeRatio === ratio ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                    {ratio}
                </button>
            ))}
        </div>
    </div>
);


// --- Icon Components ---
const IconForTool: React.FC<{ tool: Tool }> = ({ tool }) => {
    switch (tool) {
        case 'adjust': return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 16v-2m8-8h2M4 12H2m15.364 6.364l1.414 1.414M4.222 4.222l1.414 1.414M19.778 4.222l-1.414 1.414M4.222 19.778l1.414-1.414M12 18a6 6 0 100-12 6 6 0 000 12z" /></svg>;
        case 'transform': return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 19v-5h-5M4 19h5v-5M20 4h-5v5" /></svg>;
        case 'crop': return <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19M4 4v5h5M19 4h-5v5" /></svg>;
        default: return null;
    }
};
