
import React, { useState, useEffect } from 'react';

interface ResizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onResizeComplete: (originalSrc: string, newSrc: string) => void;
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
    });
};

export const ResizeModal: React.FC<ResizeModalProps> = ({ isOpen, onClose, imageSrc, onResizeComplete }) => {
    const [width, setWidth] = useState<string>('');
    const [height, setHeight] = useState<string>('');
    const [originalAspectRatio, setOriginalAspectRatio] = useState<number>(1);
    const [isLocked, setIsLocked] = useState<boolean>(true);

    useEffect(() => {
        if (isOpen && imageSrc) {
            loadImage(imageSrc).then(img => {
                setWidth(String(img.naturalWidth));
                setHeight(String(img.naturalHeight));
                setOriginalAspectRatio(img.naturalWidth / img.naturalHeight);
            }).catch(e => console.error("Error loading image for resize:", e));
        }
    }, [isOpen, imageSrc]);

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = e.target.value;
        setWidth(newWidth);
        if (isLocked && newWidth && !isNaN(Number(newWidth))) {
            const calculatedHeight = Math.round(Number(newWidth) / originalAspectRatio);
            setHeight(String(calculatedHeight));
        }
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHeight = e.target.value;
        setHeight(newHeight);
        if (isLocked && newHeight && !isNaN(Number(newHeight))) {
            const calculatedWidth = Math.round(Number(newHeight) * originalAspectRatio);
            setWidth(String(calculatedWidth));
        }
    };
    
    const handleResize = async () => {
        const finalWidth = parseInt(width, 10);
        const finalHeight = parseInt(height, 10);

        if (isNaN(finalWidth) || isNaN(finalHeight) || finalWidth <= 0 || finalHeight <= 0) {
            // Can add user-facing error feedback here if needed
            return;
        }

        try {
            const image = await loadImage(imageSrc);
            const canvas = document.createElement('canvas');
            canvas.width = finalWidth;
            canvas.height = finalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            ctx.drawImage(image, 0, 0, finalWidth, finalHeight);
            const resizedDataUrl = canvas.toDataURL('image/png');
            onResizeComplete(imageSrc, resizedDataUrl);
        } catch (error) {
            console.error("Failed to resize image:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Redimensionar Imagem</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="p-6 space-y-6">
                    <div className="flex justify-center max-h-64">
                        <img src={imageSrc} alt="Pré-visualização" className="object-contain rounded-md" />
                    </div>
                    <div className="flex items-center justify-center gap-4">
                        <div className="w-2/5">
                            <label htmlFor="resize-width" className="block text-sm font-medium text-gray-400 mb-1">Largura (px)</label>
                            <input
                                id="resize-width"
                                type="number"
                                value={width}
                                onChange={handleWidthChange}
                                className="w-full p-2 bg-gray-900 border-2 border-gray-600 rounded-md text-gray-200"
                            />
                        </div>
                        <div className="pt-6">
                            <button onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Desbloquear proporções" : "Bloquear proporções"} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                                {isLocked ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 8a1 1 0 100-2 1 1 0 000 2z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <div className="w-2/5">
                            <label htmlFor="resize-height" className="block text-sm font-medium text-gray-400 mb-1">Altura (px)</label>
                            <input
                                id="resize-height"
                                type="number"
                                value={height}
                                onChange={handleHeightChange}
                                className="w-full p-2 bg-gray-900 border-2 border-gray-600 rounded-md text-gray-200"
                            />
                        </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700">Cancelar</button>
                        <button onClick={handleResize} className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Redimensionar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
