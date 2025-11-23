
import React, { useState, useEffect } from 'react';
import { SavedImage } from '../types';
import { getAllImages, deleteImageFromGallery, updateImageTags } from '../services/galleryService';
import { Button } from './Button';
import { X, Search, Trash2, Download, Share2, PenLine, Eye, Tag, Plus, LayoutGrid } from 'lucide-react';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditImage: (image: SavedImage) => void;
}

export const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, onEditImage }) => {
  const [images, setImages] = useState<SavedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null); // For fullscreen
  const [taggingImageId, setTaggingImageId] = useState<string | null>(null); // For tag editing
  const [newTagInput, setNewTagInput] = useState('');

  // Load images when opened
  useEffect(() => {
    if (isOpen) {
      loadGallery();
    }
  }, [isOpen]);

  const loadGallery = async () => {
    setLoading(true);
    try {
      const data = await getAllImages();
      setImages(data);
    } catch (e) {
      console.error("Failed to load gallery", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Tem a certeza que deseja eliminar esta imagem permanentemente?")) {
      await deleteImageFromGallery(id);
      setImages(prev => prev.filter(img => img.id !== id));
      if (selectedImageId === id) setSelectedImageId(null);
    }
  };

  const handleDownload = (img: SavedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `data:${img.mimeType};base64,${img.base64Data}`;
    link.download = `nexus-gallery-${img.timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (img: SavedImage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
        // Convert base64 to blob for sharing
        const res = await fetch(`data:${img.mimeType};base64,${img.base64Data}`);
        const blob = await res.blob();
        const file = new File([blob], "image.png", { type: img.mimeType });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Imagem criada com Nexus AI',
                text: img.prompt
            });
        } else {
            alert("A partilha de ficheiros não é suportada neste navegador.");
        }
    } catch (error) {
        console.error("Error sharing", error);
    }
  };

  const handleEdit = (img: SavedImage, e: React.MouseEvent) => {
      e.stopPropagation();
      onEditImage(img); // This will close gallery and navigate in App.tsx
  };

  const handleAddTag = async () => {
    if (taggingImageId && newTagInput.trim()) {
        const img = images.find(i => i.id === taggingImageId);
        if (img && !img.tags.includes(newTagInput.trim())) {
            const updatedTags = [...img.tags, newTagInput.trim()];
            await updateImageTags(taggingImageId, updatedTags);
            
            // Update local state
            setImages(prev => prev.map(i => i.id === taggingImageId ? { ...i, tags: updatedTags } : i));
            setNewTagInput('');
        }
    }
  };

  const handleRemoveTag = async (imgId: string, tagToRemove: string) => {
    const img = images.find(i => i.id === imgId);
    if (img) {
        const updatedTags = img.tags.filter(t => t !== tagToRemove);
        await updateImageTags(imgId, updatedTags);
        setImages(prev => prev.map(i => i.id === imgId ? { ...i, tags: updatedTags } : i));
    }
  };

  const filteredImages = images.filter(img => {
      const search = filter.toLowerCase();
      return (
          img.prompt.toLowerCase().includes(search) ||
          img.tags.some(t => t.toLowerCase().includes(search))
      );
  });

  const getFilteredView = () => {
    if (selectedImageId) {
        const img = images.find(i => i.id === selectedImageId);
        if (!img) return null;

        return (
            <div className="absolute inset-0 z-20 bg-black/95 flex flex-col items-center justify-center p-4">
                <div className="absolute top-4 right-4 flex gap-4">
                     <button 
                        onClick={(e) => handleEdit(img, e)}
                        className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 transition-colors"
                        title="Editar no Estúdio"
                     >
                         <PenLine className="w-5 h-5" />
                     </button>
                    <button onClick={() => setSelectedImageId(null)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <img 
                    src={`data:${img.mimeType};base64,${img.base64Data}`} 
                    className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-sm"
                    alt={img.prompt}
                />
                
                <p className="mt-6 text-slate-300 text-center max-w-2xl bg-black/50 p-2 rounded">
                    {img.prompt}
                </p>
                <div className="flex gap-2 mt-2">
                    {img.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>
        );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
                <LayoutGrid className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Galeria</h2>
            <span className="text-sm text-slate-500 px-2 py-0.5 bg-slate-800 rounded-full">
                {images.length} imagens
            </span>
        </div>

        <div className="flex-1 max-w-md mx-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar por etiqueta ou prompt..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
        </div>

        <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
        >
            <X className="w-6 h-6" />
        </button>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
        {loading ? (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <p>Nenhuma imagem encontrada.</p>
                {filter && <button onClick={() => setFilter('')} className="text-indigo-400 text-sm mt-2 hover:underline">Limpar filtros</button>}
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredImages.map(img => (
                    <div key={img.id} className="group relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all">
                        <img 
                            src={`data:${img.mimeType};base64,${img.base64Data}`} 
                            alt="Gallery item"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                        
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setSelectedImageId(img.id)} className="p-2 bg-slate-800/80 rounded-full hover:bg-white text-white hover:text-black transition-colors" title="Ver">
                                    <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => handleDelete(img.id, e)} className="p-2 bg-red-500/80 rounded-full text-white hover:bg-red-600 transition-colors" title="Apagar">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex justify-center gap-2">
                                <button onClick={(e) => handleEdit(img, e)} className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 shadow-lg transform hover:scale-105" title="Editar">
                                    <PenLine className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex justify-between items-end">
                                <button onClick={() => setTaggingImageId(taggingImageId === img.id ? null : img.id)} className={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${img.tags.length > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'} hover:bg-slate-700`}>
                                    <Tag className="w-3 h-3" />
                                    {img.tags.length > 0 ? img.tags.length : '+Tag'}
                                </button>
                                <div className="flex gap-1">
                                    <button onClick={(e) => handleShare(img, e)} className="p-2 bg-slate-800/80 rounded-full hover:bg-slate-700 text-white" title="Partilhar">
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => handleDownload(img, e)} className="p-2 bg-slate-800/80 rounded-full hover:bg-slate-700 text-white" title="Download">
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tagging Popover */}
                        {taggingImageId === img.id && (
                            <div className="absolute inset-x-2 bottom-12 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl z-10 animate-in slide-in-from-bottom-2">
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {img.tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] rounded border border-indigo-500/30">
                                            {tag}
                                            <button onClick={() => handleRemoveTag(img.id, tag)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-1">
                                    <input 
                                        type="text" 
                                        value={newTagInput}
                                        onChange={(e) => setNewTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                        placeholder="Nova etiqueta..."
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                        autoFocus
                                    />
                                    <button onClick={handleAddTag} className="p-1 bg-indigo-600 rounded hover:bg-indigo-500">
                                        <Plus className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Fullscreen Viewer */}
      {getFilteredView()}

    </div>
  );
};
