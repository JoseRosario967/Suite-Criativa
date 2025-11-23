import React, { useState, useRef, useEffect } from 'react';
import { AspectRatio, GeneratedImageResult, UploadedFile, EditorInitialState, Watermark, WatermarkSettings, AdvancedSettings } from '../types';
import { editImageWithPrompt } from '../services/geminiService';
import { applyWatermarkToImage } from '../services/imageProcessing';
import { Button } from './Button';
import { ResultViewer } from './ResultViewer';
import { AdvancedSettingsPanel } from './AdvancedSettingsPanel';
import { ImagePlus, X, PenTool, UploadCloud, Stamp } from 'lucide-react';

// Helper to find the closest supported aspect ratio
const determineAspectRatio = (width: number, height: number): AspectRatio => {
  const ratio = width / height;
  const options: { r: AspectRatio; val: number }[] = [
    { r: '1:1', val: 1 },
    { r: '16:9', val: 16 / 9 },
    { r: '9:16', val: 9 / 16 },
    { r: '4:3', val: 4 / 3 },
    { r: '3:4', val: 3 / 4 },
  ];
  
  return options.reduce((prev, curr) => 
    Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev
  ).r;
};

interface EditorViewProps {
  initialState?: EditorInitialState | null;
  onClearInitialState?: () => void;
  watermarkSettings: WatermarkSettings;
  activeWatermark: Watermark | undefined;
  onToggleWatermark: (enabled: boolean) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({ 
    initialState, 
    onClearInitialState,
    watermarkSettings,
    activeWatermark,
    onToggleWatermark
}) => {
  const [prompt, setPrompt] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
      quality: 'standard',
      aspectRatio: '1:1', // Will be overwritten by image detection
      negativePrompt: '' // Not used in editor
  });

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from props if available
  useEffect(() => {
    if (initialState) {
      setUploadedFile(initialState.image);
      setPrompt(initialState.prompt);
      
      // Attempt to set aspect ratio based on loaded image
      const img = new Image();
      img.onload = () => {
        const ratio = determineAspectRatio(img.width, img.height);
        setAdvancedSettings(prev => ({ ...prev, aspectRatio: ratio }));
      };
      img.src = initialState.image.previewUrl;
      
      // Clear the initial state so it doesn't re-apply if user clears manually later
      if (onClearInitialState) onClearInitialState();
    }
  }, [initialState, onClearInitialState]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        // Extract base64 part
        const base64Data = resultStr.split(',')[1];

        // Auto-detect aspect ratio from the uploaded image
        const img = new Image();
        img.onload = () => {
            const bestRatio = determineAspectRatio(img.width, img.height);
            setAdvancedSettings(prev => ({ ...prev, aspectRatio: bestRatio }));
            
            setUploadedFile({
              file,
              previewUrl: resultStr,
              base64Data,
              mimeType: file.type
            });
        };
        img.src = resultStr;
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setAdvancedSettings(prev => ({ ...prev, aspectRatio: '1:1' })); // Reset to default
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !uploadedFile) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await editImageWithPrompt(
        uploadedFile.base64Data,
        uploadedFile.mimeType,
        prompt,
        advancedSettings.aspectRatio,
        advancedSettings.quality
      );

       // Apply Watermark if enabled
       if (data.imageUrl && watermarkSettings.isEnabled && activeWatermark) {
        const watermarkedUrl = await applyWatermarkToImage(
            data.imageUrl, 
            activeWatermark, 
            watermarkSettings
        );
        data.imageUrl = watermarkedUrl;
     }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <div className="flex flex-col gap-6">
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-indigo-400" />
            Editar Imagem
          </h2>
          
          <div className="space-y-4">
            
            {/* File Upload Area */}
            <div className="w-full">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Imagem de Origem
                </label>
                
                {!uploadedFile ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-600 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800/50 transition-all group"
                    >
                        <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-6 h-6 text-indigo-400" />
                        </div>
                        <p className="text-sm text-slate-300 font-medium">Clique para carregar imagem</p>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG até 5MB</p>
                    </div>
                ) : (
                    <div className="relative rounded-lg overflow-hidden border border-slate-600 bg-slate-900 group">
                        <img 
                            src={uploadedFile.previewUrl} 
                            alt="Preview" 
                            className="w-full h-48 object-contain bg-black/20"
                        />
                        <button 
                            onClick={handleClearFile}
                            className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Instruções de Edição
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="O que gostaria de alterar? (ex: Torne-a numa pintura a aguarela, Adicione um chapéu vermelho ao gato)"
                className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                disabled={isLoading}
              />
            </div>

            <AdvancedSettingsPanel 
                settings={advancedSettings}
                onChange={setAdvancedSettings}
                mode="editing"
                disabled={isLoading}
            />

            {/* Watermark Toggle */}
            <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                    <Stamp className={`w-4 h-4 ${watermarkSettings.isEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-sm text-slate-300">Marca d'Água Automática</span>
                </div>
                <div className="flex items-center gap-2">
                    {watermarkSettings.isEnabled && !activeWatermark && (
                        <span className="text-[10px] text-red-400 mr-2">Nenhuma selecionada</span>
                    )}
                    <button 
                        onClick={() => onToggleWatermark(!watermarkSettings.isEnabled)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${watermarkSettings.isEnabled ? 'bg-indigo-600' : 'bg-slate-600'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${watermarkSettings.isEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              isLoading={isLoading} 
              disabled={!prompt.trim() || !uploadedFile}
              className="w-full mt-4"
              icon={<ImagePlus className="w-4 h-4" />}
            >
              Gerar Edição
            </Button>
          </div>
        </div>
      </div>

      <div className="h-full min-h-[500px]">
        <ResultViewer result={result} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
};
