
import React from 'react';
import { AppView } from '../types';
import { 
  LayoutDashboard, 
  Wand2, 
  PenTool, 
  ChefHat, 
  Sprout, 
  CloudSun, 
  Video, 
  Music, 
  X,
  Sparkles,
  ScanSearch,
  Type,
  Stamp,
  Layers,
  Images,
  Database,
  Clover,
  Scissors,
  BookTemplate // New Icon
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenWatermarkManager: () => void;
  onOpenGallery: () => void;
  onOpenBackup: () => void;
  onOpenTemplateManager: () => void; // New Prop
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    currentView, 
    onChangeView, 
    isOpen, 
    onClose,
    onOpenWatermarkManager,
    onOpenGallery,
    onOpenBackup,
    onOpenTemplateManager
}) => {
  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Início', icon: <LayoutDashboard className="w-5 h-5" /> },
    { type: 'divider', label: 'Imagens' },
    { id: AppView.GENERATOR, label: 'Gerador de Imagens', icon: <Wand2 className="w-5 h-5" /> },
    { id: AppView.EDITOR, label: 'Editor Mágico', icon: <PenTool className="w-5 h-5" /> },
    { id: AppView.MONTAGE, label: 'Estúdio de Montagem', icon: <Scissors className="w-5 h-5" /> },
    { id: AppView.TEXT_EDITOR, label: 'Editor de Texto', icon: <Type className="w-5 h-5" /> },
    { id: AppView.DISCOVERY, label: 'Descobridor Prompt', icon: <ScanSearch className="w-5 h-5" /> },
    { id: AppView.BATCH_WATERMARK, label: 'Marca d\'Água em Lote', icon: <Layers className="w-5 h-5" /> },
    { type: 'divider', label: 'Utilidades' },
    { id: AppView.LOTTERY, label: 'Sorte & Magia', icon: <Clover className="w-5 h-5" /> },
    { type: 'divider', label: 'Vida & Útil (Em Breve)' },
    { id: AppView.CHEF, label: 'Chef Michelin', icon: <ChefHat className="w-5 h-5" />, disabled: true },
    { id: AppView.GARDEN, label: 'Jardinagem', icon: <Sprout className="w-5 h-5" />, disabled: true },
    { id: AppView.WEATHER, label: 'Meteorologia', icon: <CloudSun className="w-5 h-5" />, disabled: true },
    { type: 'divider', label: 'Estúdio Criativo (Em Breve)' },
    { id: AppView.VIDEO, label: 'Vídeo AI', icon: <Video className="w-5 h-5" />, disabled: true },
    { id: AppView.POETRY, label: 'Poesia & Música', icon: <Music className="w-5 h-5" />, disabled: true },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Nexus AI
              </span>
            </div>
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
            {menuItems.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div key={`div-${index}`} className="px-3 mt-6 mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {item.label}
                    </p>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      onChangeView(item.id as AppView);
                      if (window.innerWidth < 1024) onClose();
                    }
                  }}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${currentView === item.id 
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {item.icon}
                  {item.label}
                  {item.disabled && (
                    <span className="ml-auto text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                      Breve
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User / Footer area */}
          <div className="p-4 border-t border-slate-800 space-y-3">
             {/* Gallery Quick Access */}
             <button 
                onClick={onOpenGallery}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-300 hover:text-white text-sm transition-all border border-emerald-500/30"
             >
                <Images className="w-4 h-4" />
                Minha Galeria
             </button>

             {/* Prompt Templates Quick Access */}
             <button 
                onClick={onOpenTemplateManager}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors border border-slate-700"
             >
                <BookTemplate className="w-4 h-4" />
                Modelos de Prompts
             </button>

             {/* Watermark Manager Quick Access */}
             <button 
                onClick={onOpenWatermarkManager}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors border border-slate-700"
             >
                <Stamp className="w-4 h-4" />
                Marcas d'Água
             </button>

             {/* Backup Quick Access */}
             <button 
                onClick={onOpenBackup}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors border border-slate-700"
             >
                <Database className="w-4 h-4" />
                Backup & Dados
             </button>

            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                PT
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-slate-200 truncate">Utilizador</p>
                <p className="text-xs text-slate-500 truncate">Plano Gratuito</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
