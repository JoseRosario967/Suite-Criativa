import React, { useState, useRef } from 'react';
import { UploadedFile } from '../types';
import { analyzeImageDifference } from '../services/geminiService';
import { Button } from './Button';
import { ScanSearch, UploadCloud, X, Copy, Check, ArrowRight } from 'lucide-react';

interface PromptDiscoveryViewProps {
  onApplyPrompt: (file: UploadedFile, prompt: string) => void;
}

export const PromptDiscoveryView: React.FC<PromptDiscoveryViewProps> = ({ onApplyPrompt }) => {
  const [originalImage, setOriginalImage] = useState<UploadedFile | null>(null);
  const [editedImage, setEditedImage] = useState<UploadedFile | null>(null);
  const [detectedPrompt, setDetectedPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const originalInputRef = useRef<HTMLInputElement>(null);
  const editedInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isOriginal: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        const base64Data = resultStr.split(',')[1];
        
        const fileData: UploadedFile = {
          file,
          previewUrl: resultStr,
          base64Data,
          mimeType: file.type
        };

        if (isOriginal) setOriginalImage(fileData);
        else setEditedImage(fileData);
        
        // Reset results if image changes
        setDetectedPrompt(null);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleDiscover = async () => {
    if (!originalImage || !editedImage) return;

    setIsLoading(true);
    setError(null);
    setDetectedPrompt(null);

    try {
      const prompt = await analyzeImageDifference(
        originalImage.base64Data,
        originalImage.mimeType,
        editedImage.base64Data,
        editedImage.mimeType
      );
      setDetectedPrompt(prompt);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao analisar as imagens.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (detectedPrompt) {
      navigator.clipboard.writeText(detectedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const ImageUploader = ({ 
    label, 
    image, 
    onClear, 
    inputRef, 
    onChange 
  }: { 
    label: string, 
    image: UploadedFile | null, 
    onClear: () => void, 
    inputRef: React.RefObject<HTMLInputElement | null>,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  }) => (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label}
      </label>
      
      {!image ? (
        <div 
          onClick={() => inputRef.current?.click()}
          className="h-48 border-2 border-dashed border-slate-600 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all group"
        >
          <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-sm text-slate-300 font-medium text-center">Carregar Imagem</p>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-slate-600 bg-slate-900 group h-48">
          <img 
            src={image.previewUrl} 
            alt={label} 
            className="w-full h-full object-contain bg-black/20"
          />
          <button 
            onClick={onClear}
            className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <input 
        type="file" 
        ref={inputRef}
        onChange={onChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mb-8">
        <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <ScanSearch className="w-6 h-6 text-indigo-400" />
          Descobridor de Incentivos
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Carregue a imagem original e a versão editada. A IA irá analisar as diferenças e tentar descobrir qual foi o prompt utilizado.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ImageUploader 
            label="1. Imagem Original" 
            image={originalImage} 
            onClear={() => setOriginalImage(null)}
            inputRef={originalInputRef}
            onChange={(e) => handleFileSelect(e, true)}
          />
          <ImageUploader 
            label="2. Imagem Editada" 
            image={editedImage} 
            onClear={() => setEditedImage(null)}
            inputRef={editedInputRef}
            onChange={(e) => handleFileSelect(e, false)}
          />
        </div>

        <Button 
          onClick={handleDiscover} 
          isLoading={isLoading} 
          disabled={!originalImage || !editedImage}
          className="w-full"
          icon={<ScanSearch className="w-4 h-4" />}
        >
          Descobrir o Prompt
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg text-center mb-6">
          {error}
        </div>
      )}

      {detectedPrompt && (
        <div className="bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border border-indigo-500/30 rounded-xl p-6 animate-pulse-once">
          <h3 className="text-sm font-medium text-indigo-300 mb-3 uppercase tracking-wider">
            Prompt Detetado
          </h3>
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 text-slate-100 text-lg leading-relaxed mb-6">
            "{detectedPrompt}"
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <Button 
              variant="secondary" 
              onClick={handleCopy}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </Button>
            
            <Button 
              onClick={() => originalImage && onApplyPrompt(originalImage, detectedPrompt)}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Usar este Prompt e Imagem Original
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};