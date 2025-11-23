import React, { useState, useRef } from 'react';
import { Watermark, WatermarkSettings } from '../types';
import { processBatchWatermark } from '../services/imageProcessing';
import { Button } from './Button';
import { UploadCloud, Layers, Download, CheckCircle2 } from 'lucide-react';

interface BatchWatermarkViewProps {
  activeWatermark: Watermark | undefined;
  settings: WatermarkSettings;
  onOpenManager: () => void;
}

export const BatchWatermarkView: React.FC<BatchWatermarkViewProps> = ({ 
  activeWatermark, 
  settings,
  onOpenManager
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      setIsComplete(false);
      setProgress(0);
    }
  };

  const handleProcess = async () => {
    if (!activeWatermark) return;
    
    setIsProcessing(true);
    setProgress(0);

    try {
      await processBatchWatermark(files, activeWatermark, settings, (prog) => {
        setProgress(prog);
      });
      setIsComplete(true);
    } catch (error) {
      console.error("Batch error", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="bg-slate-800/50 p-8 rounded-xl border border-slate-700 mb-8 flex-1">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <Layers className="w-8 h-8 text-indigo-400" />
          Aplicação em Lote
        </h2>
        <p className="text-slate-400 mb-8">
          Aplique a sua marca d'água ativa a dezenas de imagens de uma só vez.
        </p>

        {/* Active Watermark Info */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded border border-slate-700 flex items-center justify-center overflow-hidden">
                {activeWatermark ? (
                    <img src={activeWatermark.previewUrl} className="max-w-full max-h-full" alt="WM" />
                ) : (
                    <span className="text-xs text-slate-500">N/A</span>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-200">
                    {activeWatermark ? activeWatermark.name : 'Nenhuma marca selecionada'}
                </p>
                <p className="text-xs text-slate-500">
                    {activeWatermark ? `Opacidade: ${settings.opacity}% • Posição: ${settings.position}` : 'Configure na biblioteca'}
                </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onOpenManager} className="text-xs">
            Alterar Marca
          </Button>
        </div>

        {/* Upload Area */}
        {!isProcessing && !isComplete && (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all group mb-8"
            >
                <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-lg text-slate-200 font-medium mb-2">
                    {files.length > 0 ? `${files.length} imagens selecionadas` : 'Arraste imagens ou clique aqui'}
                </p>
                <p className="text-sm text-slate-500">Suporta JPG e PNG</p>
                <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    accept="image/*" 
                    className="hidden" 
                />
            </div>
        )}

        {/* Progress State */}
        {isProcessing && (
            <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-full max-w-md bg-slate-700 rounded-full h-4 mb-4 overflow-hidden">
                    <div 
                        className="bg-indigo-500 h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-slate-300 animate-pulse">A processar {progress}%...</p>
            </div>
        )}

        {/* Complete State */}
        {isComplete && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Processamento Concluído!</h3>
                <p className="text-slate-400 mb-6">O seu ficheiro ZIP foi descarregado automaticamente.</p>
                <Button onClick={() => { setFiles([]); setIsComplete(false); }} variant="secondary">
                    Processar Mais
                </Button>
            </div>
        )}

        {/* Actions */}
        {!isProcessing && !isComplete && (
            <Button 
                onClick={handleProcess}
                disabled={files.length === 0 || !activeWatermark}
                className="w-full py-4 text-lg"
                icon={<Download className="w-5 h-5" />}
            >
                Aplicar e Descarregar ZIP
            </Button>
        )}
      </div>
    </div>
  );
};
