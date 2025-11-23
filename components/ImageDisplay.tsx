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
  const [imageToResize, setImageToResize] = useState<string | null>(null);

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `gerado-ia-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                {images.map((image, index) => (
                    <div key={index} className="relative w-full aspect-square group overflow-hidden bg-gray-900/50 rounded-md">
                        <img src={image} alt={`Gerado ${index}`} className="object-contain w-full h-full" />
                        <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => onEditImage(image)} className="p-2 bg-gray-900/60 text-white hover:bg-indigo-600 rounded-full" title="Editar">✏️</button>
                            <button onClick={() => onEditWithMask(image)} className="p-2 bg-gray-900/60 text-white hover:bg-indigo-600 rounded-full" title="Máscara">🖌️</button>
                            <button onClick={() => setImageToResize(image)} className="p-2 bg-gray-900/60 text-white hover:bg-indigo-600 rounded-full" title="Redimensionar">📐</button>
                            <button onClick={() => handleDownload(image)} className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500" title="Download">⬇️</button>
                        </div>
                    </div>
                ))}
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
