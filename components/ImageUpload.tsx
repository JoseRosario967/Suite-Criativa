
import React, { useRef, useState } from 'react';
import type { UploadedImage } from '../types';

interface ImageUploadProps {
  uploadedImages: UploadedImage[];
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFilesDrop: (files: FileList) => void;
  onClearImage: (id: string) => void;
  onClearAllImages: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
    uploadedImages, onFileChange, onFilesDrop, onClearImage, onClearAllImages
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasImages = uploadedImages.length > 0;

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    onFilesDrop(event.dataTransfer.files);
  };

  return (
    <div className="flex flex-col h-full">
        <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-400">
                Ou edite uma imagem existente (opcional)
                </h2>
                {hasImages && (
                    <button onClick={onClearAllImages} className="text-sm text-indigo-400 hover:text-indigo-300">
                        Limpar Tudo
                    </button>
                )}
            </div>
            
            <div 
                className={`h-48 w-full border-2 border-dashed rounded-lg bg-gray-800/50 p-2 transition-colors ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="relative w-full h-full overflow-y-auto">
                {hasImages ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                    {uploadedImages.map((image) => (
                        <div key={image.id} className="relative group aspect-square">
                        <img src={image.dataUrl} alt="Pré-visualização" className="w-full h-full object-cover rounded-md" />
                        <button
                            onClick={() => onClearImage(image.id)}
                            className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remover imagem"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        </div>
                    ))}
                    <label htmlFor="image-upload-multi" className="aspect-square flex flex-col items-center justify-center bg-gray-700/50 border-2 border-dashed border-gray-500 rounded-md cursor-pointer hover:border-indigo-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-xs text-gray-400 mt-1">Adicionar</span>
                    </label>
                    </div>
                ) : (
                    <label htmlFor="image-upload-multi" className="w-full h-full flex flex-col items-center justify-center text-center text-gray-500 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm">Arraste e solte ou clique para carregar</p>
                    </label>
                )}
                <input 
                    ref={fileInputRef}
                    id="image-upload-multi"
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={onFileChange}
                    className="hidden"
                    multiple
                />
                </div>
            </div>
        </div>
    </div>
  );
};
