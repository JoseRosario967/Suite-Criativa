import React, { useState, useRef } from 'react';
import { UploadedFile, GeneratedImageResult } from '../types';
import { createMontage } from '../services/geminiService';
import { Button } from './Button';
import { ResultViewer } from './ResultViewer';
import { UploadCloud, Scissors, X, ArrowRight, ImagePlus } from 'lucide-react';

export const MontageView: React.FC = () => {
  const [backgroundImage, setBackgroundImage] = useState<UploadedFile | null>(null);
  const [subjectImage, setSubjectImage] = useState<UploadedFile | null>(null);
  const [instructions, setInstructions] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isBg: boolean) => {
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

        if (isBg) setBackgroundImage(fileData);
        else setSubjectImage(fileData);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!backgroundImage || !subjectImage || !instructions.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await createMontage(
        backgroundImage.base64Data,
        backgroundImage.mimeType,
        subjectImage.base64Data,
        subjectImage.mimeType,
        instructions
      );
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar montagem');
    } finally {
      setIsLoading(false);
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
    <div className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700">
      <label className="block text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <ImagePlus className="w-4 h-4 text-indigo-400" />
        {label}
      </label>
      
      {!image ? (
        <div 
          onClick={() => inputRef.current?.click()}
          className="h-40 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800 transition-all group"
        >
          <div className="p-2 bg-slate-700 rounded-full mb-2 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-xs text-slate-400 text-center px-4">Carregar Imagem</p>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-slate-600 bg-slate-900 group h-40">
          <img 
            src={image.previewUrl} 
            alt={label} 
            className="w-full h-full object-cover opacity-80"
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
    <div className="flex flex-col gap-8 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Area */}
        <div className="flex flex-col gap-6">
            <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Scissors className="w-6 h-6 text-indigo-400" />
                    Estúdio de Montagem
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                    Combine duas imagens numa só. Escolha um cenário de fundo e um objeto para inserir nele.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <ImageUploader 
                        label="1. Imagem de Fundo" 
                        image={backgroundImage} 
                        onClear={() => setBackgroundImage(null)}
                        inputRef={bgInputRef}
                        onChange={(e) => handleFileSelect(e, true)}
                    />
                    <div className="hidden sm:flex items-center justify-center text-slate-600">
                        <ArrowRight className="w-6 h-6" />
                    </div>
                    <ImageUploader 
                        label="2. Sujeito / Objeto" 
                        image={subjectImage} 
                        onClear={() => setSubjectImage(null)}
                        inputRef={subjectInputRef}
                        onChange={(e) => handleFileSelect(e, false)}
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Instruções de Montagem
                    </label>
                    <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Ex: Coloque a pessoa da segunda imagem a caminhar na areia da praia da primeira imagem. Ajuste a iluminação para parecer natural."
                        className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        disabled={isLoading}
                    />
                </div>

                <Button 
                    onClick={handleGenerate} 
                    isLoading={isLoading} 
                    disabled={!backgroundImage || !subjectImage || !instructions.trim()}
                    className="w-full"
                    icon={<Scissors className="w-4 h-4" />}
                >
                    Gerar Montagem
                </Button>
            </div>
        </div>

        {/* Result Area */}
        <div className="h-full min-h-[400px]">
             <ResultViewer 
                result={result} 
                isLoading={isLoading} 
                error={error}
                prompt={instructions} // Allows saving to gallery with the instructions as metadata
             />
        </div>

      </div>
    </div>
  );
};