import React, { useState } from 'react';
import { GeneratedImageResult, Watermark, WatermarkSettings, AdvancedSettings } from '../types';
import { generateImageFromText } from '../services/geminiService';
import { applyWatermarkToImage } from '../services/imageProcessing';
import { Button } from './Button';
import { AdvancedSettingsPanel } from './AdvancedSettingsPanel';
import { ResultViewer } from './ResultViewer';
import { PromptTemplatesPanel } from './PromptTemplatesPanel';
import { Wand2, Stamp, History, Download, PenLine, BookTemplate } from 'lucide-react';

interface GeneratorViewProps {
  watermarkSettings: WatermarkSettings;
  activeWatermark: Watermark | undefined;
  onToggleWatermark: (enabled: boolean) => void;
  onQuickEdit: (imageUrl: string) => void;
}

export const GeneratorView: React.FC<GeneratorViewProps> = ({ 
  watermarkSettings, 
  activeWatermark, 
  onToggleWatermark,
  onQuickEdit
}) => {
  const [prompt, setPrompt] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
      quality: 'standard',
      aspectRatio: '1:1',
      negativePrompt: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GeneratedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTemplatePanelOpen, setIsTemplatePanelOpen] = useState(false);
  
  // Session History State
  const [history, setHistory] = useState<GeneratedImageResult[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Generate Raw Image
      const data = await generateImageFromText(
          prompt, 
          advancedSettings.aspectRatio, 
          advancedSettings.quality, 
          advancedSettings.negativePrompt
      );
      
      // 2. Apply Watermark if enabled and available
      if (data.imageUrl && watermarkSettings.isEnabled && activeWatermark) {
         const watermarkedUrl = await applyWatermarkToImage(
             data.imageUrl, 
             activeWatermark, 
             watermarkSettings
         );
         data.imageUrl = watermarkedUrl;
      }

      setResult(data);
      
      // Add to history if successful
      if (data.imageUrl) {
          setHistory(prev => [data, ...prev]);
      }

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (url: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `nexus-history-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleApplyTemplate = (templateContent: string) => {
    // Smart Insertion Logic
    if (templateContent.includes('{prompt}')) {
        // If template has placeholder, wrap existing text
        const currentText = prompt.trim();
        const newText = templateContent.replace('{prompt}', currentText);
        setPrompt(newText);
    } else {
        // If no placeholder, append or replace (here we replace for simplicity, or append?)
        // Let's replace to be clean, user can undo with Ctrl+Z usually or just copy paste
        setPrompt(templateContent);
    }
    setIsTemplatePanelOpen(false);
  };

  return (
    <div className="flex flex-col h-full gap-8">
        
        {/* Main Generator Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
            <div className="flex flex-col gap-6">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-indigo-400" />
                    Gerar
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-slate-300">
                                Descrição
                            </label>
                            <button 
                                onClick={() => setIsTemplatePanelOpen(true)}
                                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                <BookTemplate className="w-3 h-3" />
                                Modelos
                            </button>
                        </div>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Descreva a imagem que pretende criar em detalhe... (ex: Uma cidade futurista com carros voadores ao pôr do sol, estilo cyberpunk)"
                            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            disabled={isLoading}
                        />
                    </div>

                    <AdvancedSettingsPanel 
                        settings={advancedSettings}
                        onChange={setAdvancedSettings}
                        mode="generation"
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
                    disabled={!prompt.trim()}
                    className="w-full mt-4"
                    icon={<Wand2 className="w-4 h-4" />}
                    >
                    Gerar Imagem
                    </Button>
                </div>
                </div>
                
                <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 hidden lg:block">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Dicas para melhores resultados</h3>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    <li>Seja específico sobre a iluminação (ex: "iluminação cinematográfica")</li>
                    <li>Mencione o estilo artístico (ex: "pintura a óleo", "pixel art")</li>
                </ul>
                </div>
            </div>

            <div className="h-full">
                <ResultViewer 
                    result={result} 
                    isLoading={isLoading} 
                    error={error} 
                    onEdit={onQuickEdit}
                />
            </div>
        </div>

        {/* History Section */}
        {history.length > 0 && (
            <div className="border-t border-slate-800 pt-8 animate-in slide-in-from-bottom-10 fade-in duration-500">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-400" />
                    Histórico Recente
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {history.map((item, idx) => (
                        <div key={idx} className="group relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 aspect-square">
                            {item.imageUrl && (
                                <>
                                    <img 
                                        src={item.imageUrl} 
                                        alt={`History ${idx}`} 
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                    />
                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                        <button 
                                            onClick={() => item.imageUrl && onQuickEdit(item.imageUrl)}
                                            className="p-2 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 transition-colors"
                                            title="Editar"
                                        >
                                            <PenLine className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => item.imageUrl && downloadImage(item.imageUrl)}
                                            className="p-2 bg-slate-700 rounded-full text-white hover:bg-slate-600 transition-colors"
                                            title="Descarregar"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Template Modal */}
        <PromptTemplatesPanel 
            isOpen={isTemplatePanelOpen}
            onClose={() => setIsTemplatePanelOpen(false)}
            onSelectTemplate={handleApplyTemplate}
        />
    </div>
  );
};