import React, { useState, MouseEvent, memo, lazy, Suspense } from 'react';
import { Spinner } from './Spinner';

const ResizeModal = lazy(() => import('./ResizeModal').then(m => ({ default: m.ResizeModal })));

interface ImageDisplayProps {
  images: string[];
  isLoading: boolean;
  onEditImage: (imageUrl: string) => void;
  onEditWithMask: (imageUrl: string) => void;
  setGeneratedImages: React.Dispatch<React.SetStateAction<string[]>>;
}

const ImageDisplayComponent: React.FC<ImageDisplayProps> = ({ images, isLoading, onEditImage, onEditWithMask, setGeneratedImages }) => {
  const [transforms, setTransforms] = useState<Record<number, { scale: number; x: number; y: number }>>({});
  const [dragging, setDragging] = useState<{ index: number; startX: number; startY: number } | null>(null);
  const [imageToResize, setImageToResize] = useState<string | null>(null);

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `gerado-ia-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTransform = (index: number) => transforms[index] || { scale: 1, x: 0, y: 0 };

  const updateTransform = (index: number, newTransform: { scale: number; x: number; y: number }) => {
      setTransforms(prev => ({ ...prev, [index]: newTransform }));
  };

  const handleZoom = (index: number, factor: number) => {
      const current = getTransform(index);
      const newScale = Math.max(1, current.scale * factor);
      updateTransform(index, newScale === 1 ? { scale: 1, x: 0, y: 0 } : { ...current, scale: newScale });
  };

  const handleMouseDown = (index: number, e: MouseEvent<HTMLDivElement>) => {
      const current = getTransform(index);
      if (current.scale > 1) {
          e.preventDefault();
          setDragging({ index, startX: e.clientX - current.x, startY: e.clientY - current.y });
      }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
      if (!dragging) return;
      e.preventDefault();
      const current = getTransform(dragging.index);
      updateTransform(dragging.index, { ...current, x: e.clientX - dragging.startX, y: e.clientY - dragging.startY });
  };

  const handleMouseUp = () => setDragging(null);

  const handleImageResized = (originalSrc: string, newSrc: string) => {
    setGeneratedImages(prev => prev.map(img => (img === originalSrc ? newSrc : img)));
    setImageToResize(null);
  };

  return (
    <>
        <div className="w-full max-w-full max-h-[60vh] aspect-square bg-gray-800/50 border-2 border-gray-700 rounded-lg flex items-center justify-center overflow-hidden p-4">
        {isLoading && images.length === 0 ? (
            <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-400">A gerar a sua obra-prima...</p>
            </div>
        ) : images.length > 0 ? (
            <div className="w-full h-full overflow-y-auto">
            <div className={`grid gap-4 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {images.map((image, index) => {
                    const t = getTransform(index);
                    return (
                        <div 
                            key={index} 
                            className="relative w-full aspect-square group overflow-hidden bg-gray-900/50 rounded-md"
                            style={{ cursor: dragging?.index === index ? 'grabbing' : t.scale > 1 ? 'grab' : 'default' }}
                            onMouseDown={(e) => handleMouseDown(index, e)}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <img 
                                src={image} 
                                alt={`Gerado ${index}`} 
                                className="object-contain w-full h-full transition-transform duration-200"
                                style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})`, pointerEvents: 'none' }}
                            />
                            {/* Botoes de Acao */}
                            <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto">
                                <button onClick={(e) => { e.stopPropagation(); onEditImage(image); }} className="p-2 bg-gray-900/60 text-white hover:bg-indigo-600 rounded-full"><svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                                <button onClick={(e) => { e.stopPropagation(); onEditWithMask(image); }} className="p-2 bg-gray-900/60 text-white hover:bg-indigo-600 rounded-full"><svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 9a1 1 0 01-1-1V4a1 1 0 012 0v4a1 1 0 01-1 1zm13-5a1 1 0 00-1 1v4a1 1 0 102 0V5a1 1 0 00-1-1zM9 16a1 1 0 01-1 1H4a1 1 0 110-2h4a1 1 0 011 1zm7-1a1 1 0 00-1-1h-4a1 1 0 100 2h4a1 1 0 001-1zM10 8a2 2 0 100-4 2 2 0 000 4z" /></svg></button>
                                <button onClick={(e) => { e.stopPropagation(); setImageToResize(image); }} className="p-2 bg-gray-900/60 text-white hover:bg-indigo-600 rounded-full"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" /></svg></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDownload(image); }} className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                            </div>
                            {/* Zoom Controls */}
                            <div className="absolute bottom-2 right-2 flex space-x-1 bg-gray-900/60 p-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-auto">
                                <button onClick={(e) => { e.stopPropagation(); handleZoom(index, 1.2); }} className="p-1 text-white hover:bg-gray-700 rounded text-xs">+</button>
                                <button onClick={(e) => { e.stopPropagation(); handleZoom(index, 0.8); }} className="p-1 text-white hover:bg-gray-700 rounded text-xs">-</button>
                                <button onClick={(e) => { e.stopPropagation(); updateTransform(index, {scale:1,x:0,y:0}); }} className="p-1 text-white hover:bg-gray-700 rounded text-xs">R</button>
                            </div>
                        </div>
                    );
                })}
                {isLoading && <div className="relative w-full aspect-square flex items-center justify-center bg-gray-700/50 rounded-md"><Spinner /></div>}
            </div>
            </div>
        ) : (
            <div className="text-center text-gray-500 p-8">
                <p className="font-semibold text-lg">A sua imagem gerada aparecerá aqui</p>
            </div>
        )}
        </div>
        <Suspense fallback={null}>
            {imageToResize && <ResizeModal isOpen={true} onClose={() => setImageToResize(null)} imageSrc={imageToResize} onResizeComplete={handleImageResized} />}
        </Suspense>
    </>
  );
};

export const ImageDisplay = memo(ImageDisplayComponent);
