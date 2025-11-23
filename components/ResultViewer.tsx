
import React, { useState } from 'react';
import { Download, AlertCircle, ImageIcon, PenLine, Bookmark, Check } from 'lucide-react';
import { GeneratedImageResult } from '../types';
import { saveImageToGallery } from '../services/galleryService';
import { Button } from './Button';

interface ResultViewerProps {
  result: GeneratedImageResult | null;
  isLoading: boolean;
  error: string | null;
  onEdit?: (imageUrl: string) => void;
  prompt?: string; // Passed to allow saving to gallery
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ result, isLoading, error, onEdit, prompt }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleDownload = () => {
    if (result?.imageUrl) {
      const link = document.createElement('a');
      link.href = result.imageUrl;
      link.download = `nexus-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSaveToGallery = async () => {
      if (result?.imageUrl) {
          setIsSaving(true);
          try {
              await saveImageToGallery(result.imageUrl, prompt || "Sem descrição");
              setIsSaved(true);
              setTimeout(() => setIsSaved(false), 3000); // Reset after 3s
          } catch (e) {
              console.error("Failed to save", e);
          } finally {
              setIsSaving(false);
          }
      }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-700/50 backdrop-blur-sm overflow-hidden relative flex items-center justify-center min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 animate-pulse-fast">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-slate-400 font-medium">A idealizar a sua imagem...</p>
            <p className="text-xs text-slate-500">Isto pode demorar alguns segundos</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-red-200">Falha na Geração</h3>
            <p className="text-sm text-red-300/70 max-w-xs">{error}</p>
          </div>
        ) : result?.imageUrl ? (
          <div className="relative w-full h-full flex items-center justify-center p-4 group">
            <img 
              src={result.imageUrl} 
              alt="Generated content" 
              className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            />
          </div>
        ) : result?.textOutput ? (
            <div className="p-8 max-w-lg text-center">
                <p className="text-slate-300 leading-relaxed mb-4">
                    O modelo devolveu texto em vez de uma imagem. Isto acontece geralmente se o pedido for conversacional ou se os filtros de segurança forem ativados.
                </p>
                <div className="bg-slate-800 p-4 rounded-lg text-left text-sm font-mono text-indigo-300 border border-slate-700">
                    {result.textOutput}
                </div>
            </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <ImageIcon className="w-12 h-12 opacity-20" />
            <p>A sua criação aparecerá aqui</p>
          </div>
        )}
      </div>

      {result?.imageUrl && (
        <div className="mt-4 flex gap-3 justify-end flex-wrap">
          <Button 
             onClick={handleSaveToGallery}
             variant="secondary"
             disabled={isSaving || isSaved}
             icon={isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4" />}
             className={isSaved ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" : ""}
          >
              {isSaved ? "Guardada!" : "Guardar na Galeria"}
          </Button>

          {onEdit && (
            <Button 
              onClick={() => result.imageUrl && onEdit(result.imageUrl)} 
              variant="secondary"
              icon={<PenLine className="w-4 h-4" />}
            >
              Editar
            </Button>
          )}
          <Button 
            onClick={handleDownload} 
            variant="primary"
            icon={<Download className="w-4 h-4" />}
          >
            Descarregar
          </Button>
        </div>
      )}
    </div>
  );
};
