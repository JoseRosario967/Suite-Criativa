
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

interface TransformState {
    scale: number;
    x: number;
    y: number;
}


const ImageDisplayComponent: React.FC<ImageDisplayProps> = ({ images, isLoading, onEditImage, onEditWithMask, setGeneratedImages }) => {
  const [transforms, setTransforms] = useState<Record<number, TransformState>>({});
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

  const handleZoom = (index: number, factor: number) => {
      setTransforms(prev => {
          const current = prev[index] || { scale: 1, x: 0, y: 0 };
          const newScale = Math.max(1, current.scale * factor);
          
          if (newScale === 1) {
              return { ...prev, [index]: { scale: 1, x: 0, y: 0 } };
          }

          return { ...prev, [index]: { ...current, scale: newScale } };
      });
  };

  const handleReset = (index: number) => {
      setTransforms(prev => ({
          ...prev,
          [index]: { scale: 1, x: 0, y: 0 }
      }));
  };

  const handleMouseDown = (index: number, e: MouseEvent<HTMLDivElement>) => {
      const currentScale = transforms[index]?.scale || 1;
      if (currentScale > 1) {
          e.preventDefault();
          setDragging({
              index,
              startX: e.clientX - (transforms[index]?.x || 0),
              startY: e.clientY - (transforms[index]?.y || 0),
          });
      }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
      if (!dragging) return;
      e.preventDefault();
      const newX = e.clientX - dragging.startX;
      const newY = e.clientY - dragging.startY;
      
      setTransforms(prev => ({
          ...prev,
          [dragging.index]: {
              ...(prev[dragging.index] || { scale: 1, x: 0, y: 0 }),
              x: newX,
              y: newY,
          }
      }));
  };

  const handleMouseUp = () => {
      setDragging(null);
  };

  const handleImageResized = (originalSrc: string, newSrc: string) => {
    setGeneratedImages(prevImages => 
      prevImages.map(img => (img === originalSrc ? newSrc : img))
    );
    setImageToResize(null); // Close modal
  };


  const hasImages = images.length > 0;

  return (
    <>
        <div className="w-full max-w-full max-h-[60vh] aspect-square bg-gray-800/50 border-2 border-gray-700 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 p-4">
        {isLoading && !hasImages ? (
            <div className="text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-400">A gerar a sua obra-prima...</p>
            </div>
        ) : hasImages ? (
            <div className="w-full h-full overflow-y-auto">
            <div className={`grid gap-4 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {images.map((image, index) => {
                const transform = transforms[index] || { scale: 1, x: 0, y: 0 };
                const isZoomed = transform.scale > 1;
                const isDragging = !!dragging && dragging.index === index;
                return (
                <div 
                    key={index} 
                    className="relative w-full aspect-square group overflow-hidden bg-gray-900/50 rounded-md"
                    style={{ cursor: isDragging ? 'grabbing' : isZoomed ? 'grab' : 'default' }}
                    onMouseDown={(e) => handleMouseDown(index, e)}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <img 
                    src={image} 
                    alt={`Gerado por IA ${index + 1}`} 
                    className="object-contain w-full h-full transition-transform duration-200"
                    style={{ 
                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        willChange: 'transform',
                        pointerEvents: 'none', // Make image non-interactive to allow parent to handle drag
                    }}
                    draggable={false}
                    />

                    {/* Save Button Container */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDownload(image); }} 
                            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors pointer-events-auto"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Guardar Imagem</span>
                        </button>
                    </div>
                    
                    {/* Action Buttons Container */}
                    <div className="absolute top-2 right-2 flex flex-col space-y-2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditImage(image); }}
                            title="Editar esta Imagem"
                            className="p-2 bg-gray-900/60 text-white hover:bg-indigo-600 rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditWithMask(image); }}
                            title="Edição Precisa com Máscara"
                            className="p-2 bg-gray-900/60 text-white hover:bg-indigo-600 rounded-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 9a1 1 0 01-1-1V4a1 1 0 012 0v4a1 1 0 01-1 1zm13-5a1 1 0 00-1 1v4a1 1 0 102 0V5a1 1 0 00-1-1zM9 16a1 1 0 01-1 1H4a1 1 0 110-2h4a1 1 0 011 1zm7-1a1 1 0 00-1-1h-4a1 1 0 100 2h4a1 1 0 001-1zM10 8a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.46 12.043c.29.29.77.29 1.06 0l4.354-4.353a.5.5 0 01.708 0l2.12 2.121a.5.5 0 00.708 0l2.121-2.12a.5.5 0 01.708 0l4.353 4.353c.29.29.29.77 0 1.06l-4.353 4.354a.5.5 0 01-.708 0L9.31 15.54a.5.5 0 00-.708 0l-2.12 2.121a.5.5 0 01-.708 0l-4.354-4.353-.001-.002z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setImageToResize(image); }}
                            title="Redimensionar Imagem"
                            className="p-2 bg-gray-900/60 text-white hover:bg-indigo-600 rounded-full"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" />
                           </svg>
                        </button>
                    </div>


                    {/* Zoom Controls Container */}
                    <div className="absolute bottom-2 right-2 flex items-center space-x-1 bg-gray-900/60 p-1 rounded-lg pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button onClick={(e) => { e.stopPropagation(); handleZoom(index, 1.2); }} title="Aproximar" className="p-1.5 text-white hover:bg-gray-700 rounded-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleZoom(index, 1 / 1.2); }} title="Afastar" className="p-1.5 text-white hover:bg-gray-700 rounded-md disabled:text-gray-500 disabled:cursor-not-allowed" disabled={!isZoomed}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleReset(index); }} title="Repor Zoom" className="p-1.5 text-white hover:bg-gray-700 rounded-md disabled:text-gray-500 disabled:cursor-not-allowed" disabled={!isZoomed}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>
                        </button>
                    </div>
                </div>
                ))}
                {isLoading && (
                    <div className="relative w-full aspect-square flex items-center justify-center bg-gray-700/50 rounded-md">
                        <Spinner />
                    </div>
                )}
            </div>
            </div>
        ) : (
            <div className="text-center text-gray-500 p-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 font-semibold text-lg">A sua imagem gerada aparecerá aqui</p>
                <p className="text-sm mt-1">Insira um prompt e clique em "Gerar" para começar.</p>
            </div>
        )}
        </div>
        <Suspense fallback={null}>
            {imageToResize && (
                <ResizeModal 
                    isOpen={true}
                    onClose={() => setImageToResize(null)}
                    imageSrc={imageToResize}
                    onResizeComplete={handleImageResized}
                />
            )}
        </Suspense>
    </>
  );
};

export const ImageDisplay = memo(ImageDisplayComponent);
