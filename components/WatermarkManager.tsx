
import React, { useRef } from 'react';
import { Watermark, WatermarkSettings, WatermarkPosition } from '../types';
import { Button } from './Button';
import { UploadCloud, Trash2, X, Grid3X3, Check } from 'lucide-react';

interface WatermarkManagerProps {
  isOpen: boolean;
  onClose: () => void;
  library: Watermark[];
  settings: WatermarkSettings;
  onAddWatermark: (wm: Watermark) => void;
  onDeleteWatermark: (id: string) => void;
  onUpdateSettings: (newSettings: WatermarkSettings) => void;
}

export const WatermarkManager: React.FC<WatermarkManagerProps> = ({
  isOpen,
  onClose,
  library,
  settings,
  onAddWatermark,
  onDeleteWatermark,
  onUpdateSettings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const newWatermark: Watermark = {
          id: Date.now().toString(),
          name: file.name.split('.')[0],
          base64Data: result.split(',')[1],
          previewUrl: result
        };
        
        onAddWatermark(newWatermark);
        
        // Auto select if it's the first one
        if (library.length === 0) {
            onUpdateSettings({ ...settings, activeWatermarkId: newWatermark.id });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteWatermark(id);
    
    // If deleted current active, reset selection
    if (settings.activeWatermarkId === id) {
       const remaining = library.filter(w => w.id !== id);
       onUpdateSettings({ ...settings, activeWatermarkId: remaining.length > 0 ? remaining[0].id : null });
    }
  };

  const renderPositionGrid = () => {
    const positions: WatermarkPosition[] = [
      'top-left', 'top-center', 'top-right',
      'middle-left', 'middle-center', 'middle-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    ];

    return (
      <div className="grid grid-cols-3 gap-1 w-24 h-24 bg-slate-800 rounded p-1 border border-slate-700">
        {positions.map(pos => (
          <button
            key={pos}
            onClick={() => onUpdateSettings({ ...settings, position: pos })}
            className={`
              rounded transition-colors
              ${settings.position === pos 
                ? 'bg-indigo-500' 
                : 'bg-slate-700 hover:bg-slate-600'}
            `}
            title={pos}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-indigo-400" />
            Gestor de Marcas d'Água
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Library Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">A Minha Biblioteca</h3>
              <Button 
                variant="secondary" 
                onClick={() => fileInputRef.current?.click()}
                icon={<UploadCloud className="w-4 h-4" />}
                className="text-xs"
              >
                Carregar Nova
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/png,image/jpeg" className="hidden" />
            </div>

            {library.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                <p className="text-slate-500">Nenhuma marca d'água carregada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {library.map(wm => (
                  <div 
                    key={wm.id}
                    onClick={() => onUpdateSettings({ ...settings, activeWatermarkId: wm.id })}
                    className={`
                      relative group cursor-pointer rounded-lg p-2 border-2 transition-all
                      ${settings.activeWatermarkId === wm.id 
                        ? 'border-indigo-500 bg-indigo-500/10' 
                        : 'border-slate-800 bg-slate-800 hover:border-slate-600'}
                    `}
                  >
                    <div className="aspect-square bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] rounded overflow-hidden mb-2 flex items-center justify-center">
                        <img src={wm.previewUrl} alt={wm.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <p className="text-xs font-medium text-slate-300 truncate text-center">{wm.name}</p>
                    {settings.activeWatermarkId === wm.id && (
                        <div className="absolute top-2 left-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                        </div>
                    )}
                    <button 
                      onClick={(e) => handleDelete(wm.id, e)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Settings Section */}
          <section className={`transition-opacity ${!settings.activeWatermarkId ? 'opacity-50 pointer-events-none' : ''}`}>
             <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Configuração da Marca Ativa</h3>
             
             <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Position */}
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-3">Posição</label>
                    <div className="flex justify-center md:justify-start">
                        {renderPositionGrid()}
                    </div>
                </div>

                {/* Sliders: Opacity & Scale */}
                <div className="space-y-6">
                    {/* Opacity */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-slate-400">Opacidade</label>
                            <span className="text-sm font-bold text-indigo-400">{settings.opacity}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={settings.opacity} 
                            onChange={(e) => onUpdateSettings({ ...settings, opacity: Number(e.target.value) })}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    {/* Scale */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-slate-400">Tamanho</label>
                            <span className="text-sm font-bold text-indigo-400">{Math.round((settings.scale || 0.2) * 100)}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="5" 
                            max="100" 
                            value={(settings.scale || 0.2) * 100} 
                            onChange={(e) => onUpdateSettings({ ...settings, scale: Number(e.target.value) / 100 })}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <p className="text-xs text-indigo-300">
                            <strong>Nota:</strong> Estas definições serão aplicadas automaticamente a todas as imagens geradas se o interruptor "Marca d'Água" estiver ligado no painel principal.
                        </p>
                    </div>
                </div>
             </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end">
          <Button onClick={onClose} variant="primary">
            Concluído
          </Button>
        </div>
      </div>
    </div>
  );
};
