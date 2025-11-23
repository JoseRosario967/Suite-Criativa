
import React, { useState, useEffect, Component } from 'react';
import { AppView, EditorInitialState, UploadedFile, Watermark, WatermarkSettings, SavedImage } from './types';
import { GeneratorView } from './components/GeneratorView';
import { EditorView } from './components/EditorView';
import { PromptDiscoveryView } from './components/PromptDiscoveryView';
import { TextEditorView } from './components/TextEditorView';
import { BatchWatermarkView } from './components/BatchWatermarkView';
import { LotteryView } from './components/LotteryView';
import { MontageView } from './components/MontageView';
import { WatermarkManager } from './components/WatermarkManager';
import { GalleryModal } from './components/GalleryModal';
import { BackupManager } from './components/BackupManager'; 
import { PromptTemplatesPanel } from './components/PromptTemplatesPanel'; // Import Template Panel
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { getAllWatermarks, saveWatermark, deleteWatermark } from './services/galleryService'; 
import { Menu, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary Component to prevent white screen crashes
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
                <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Ops! Algo correu mal.</h1>
            <p className="text-slate-400 mb-8 max-w-md">
                A aplicação encontrou um erro crítico e não conseguiu carregar. 
            </p>
            <div className="bg-slate-900 p-4 rounded border border-slate-800 text-left overflow-auto max-w-2xl w-full mb-8 max-h-48">
                <p className="text-red-400 font-mono text-xs">{this.state.error?.message}</p>
            </div>
            <button 
                onClick={() => {
                    localStorage.clear(); 
                    window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
                }}
                className="px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
                Limpar Cache e Resetar
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWatermarkManagerOpen, setIsWatermarkManagerOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false); // New State
  
  const [editorInitialState, setEditorInitialState] = useState<EditorInitialState | null>(null);

  // Watermark Global State
  const [watermarks, setWatermarks] = useState<Watermark[]>([]);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>({
      activeWatermarkId: null,
      opacity: 80,
      position: 'bottom-right',
      scale: 0.2,
      isEnabled: false
  });

  // INITIALIZATION: Load from DB + Migrate from LocalStorage
  useEffect(() => {
    const initData = async () => {
        try {
            try {
                const legacyCheck = localStorage.getItem('nexus_watermarks');
                if (legacyCheck && legacyCheck.length > 4000000) { 
                    console.warn("Legacy storage too large, clearing to prevent crash.");
                    localStorage.removeItem('nexus_watermarks');
                }
            } catch (e) {
                localStorage.removeItem('nexus_watermarks');
            }

            const legacyCheck = localStorage.getItem('nexus_watermarks');
            
            let wms: Watermark[] = [];
            try {
                wms = await getAllWatermarks();
            } catch (dbError) {
                console.error("Failed to load watermarks from DB:", dbError);
            }

            if (legacyCheck) {
                try {
                    const parsed = JSON.parse(legacyCheck);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        console.log("Migrating watermarks from LocalStorage to IndexedDB...");
                        for (const wm of parsed) {
                            if (!wms.find(w => w.id === wm.id)) {
                                await saveWatermark(wm);
                            }
                        }
                        wms = await getAllWatermarks();
                    }
                } catch (e) { console.error("Migration failed", e); }
                localStorage.removeItem('nexus_watermarks');
            }

            setWatermarks(wms);

            const savedSettings = localStorage.getItem('nexus_watermark_settings');
            if (savedSettings) {
                setWatermarkSettings(JSON.parse(savedSettings));
            }
        } catch (e) {
            console.error("Failed to initialize app data", e);
        }
    };

    const timer = setTimeout(() => {
        initData();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleAddWatermark = async (wm: Watermark) => {
      try {
          await saveWatermark(wm);
          setWatermarks(prev => [...prev, wm]);
      } catch (e) {
          console.error("Failed to save watermark", e);
          alert("Erro ao guardar marca d'água.");
      }
  };

  const handleDeleteWatermark = async (id: string) => {
      try {
          await deleteWatermark(id);
          setWatermarks(prev => prev.filter(w => w.id !== id));
      } catch (e) {
          console.error("Failed to delete watermark", e);
      }
  };

  const updateWatermarkSettings = (newSettings: WatermarkSettings) => {
      setWatermarkSettings(newSettings);
      localStorage.setItem('nexus_watermark_settings', JSON.stringify(newSettings));
  };

  const handleApplyDiscovery = (file: UploadedFile, prompt: string) => {
    setEditorInitialState({ image: file, prompt: prompt });
    setCurrentView(AppView.EDITOR);
  };

  const handleQuickEdit = (imageUrl: string) => {
      try {
          const arr = imageUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
          const bstr = arr[1];

          const fileData: UploadedFile = {
              previewUrl: imageUrl,
              base64Data: bstr,
              mimeType: mime
          };

          setEditorInitialState({
              image: fileData,
              prompt: "" 
          });
          setCurrentView(AppView.EDITOR);

      } catch (e) {
          console.error("Failed to parse image for editing", e);
      }
  };

  const handleEditFromGallery = (savedImage: SavedImage) => {
      setIsGalleryOpen(false);
      
      const fileData: UploadedFile = {
          previewUrl: `data:${savedImage.mimeType};base64,${savedImage.base64Data}`,
          base64Data: savedImage.base64Data,
          mimeType: savedImage.mimeType
      };

      setEditorInitialState({
          image: fileData,
          prompt: "" 
      });
      setCurrentView(AppView.EDITOR);
  };

  const getActiveWatermark = () => {
      return watermarks.find(w => w.id === watermarkSettings.activeWatermarkId);
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.GENERATOR:
        return (
            <GeneratorView 
                watermarkSettings={watermarkSettings}
                activeWatermark={getActiveWatermark()}
                onToggleWatermark={(enabled) => updateWatermarkSettings({...watermarkSettings, isEnabled: enabled})}
                onQuickEdit={handleQuickEdit}
            />
        );
      case AppView.EDITOR:
        return (
            <EditorView 
                initialState={editorInitialState} 
                onClearInitialState={() => setEditorInitialState(null)}
                watermarkSettings={watermarkSettings}
                activeWatermark={getActiveWatermark()}
                onToggleWatermark={(enabled) => updateWatermarkSettings({...watermarkSettings, isEnabled: enabled})}
            />
        );
      case AppView.MONTAGE:
        return <MontageView />;
      case AppView.DISCOVERY:
        return <PromptDiscoveryView onApplyPrompt={handleApplyDiscovery} />;
      case AppView.TEXT_EDITOR:
        return <TextEditorView />;
      case AppView.BATCH_WATERMARK:
        return (
            <BatchWatermarkView 
                activeWatermark={getActiveWatermark()}
                settings={watermarkSettings}
                onOpenManager={() => setIsWatermarkManagerOpen(true)}
            />
        );
      case AppView.LOTTERY:
        return <LotteryView />;
      case AppView.DASHBOARD:
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  const getPageTitle = () => {
    switch (currentView) {
      case AppView.GENERATOR: return 'Gerador de Imagens';
      case AppView.EDITOR: return 'Editor Mágico';
      case AppView.MONTAGE: return 'Estúdio de Montagem';
      case AppView.DISCOVERY: return 'Descobridor de Incentivos';
      case AppView.TEXT_EDITOR: return 'Editor de Texto';
      case AppView.BATCH_WATERMARK: return 'Marca d\'Água em Lote';
      case AppView.LOTTERY: return 'Sorte & Magia';
      case AppView.DASHBOARD: return 'Início';
      default: return 'Nexus AI';
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 selection:bg-indigo-500/30 flex">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenWatermarkManager={() => setIsWatermarkManagerOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
      />

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen transition-all duration-300">
        <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-slate-800 h-16 px-4 md:px-8 flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <h1 className="text-xl font-semibold text-white">
            {getPageTitle()}
          </h1>

          <div className="ml-auto hidden md:block">
              <button 
                onClick={() => setIsGalleryOpen(true)}
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                  Abrir Galeria
              </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto h-full">
            {renderView()}
          </div>
        </main>
        
        <footer className="border-t border-slate-800 py-6 px-8">
          <div className="max-w-7xl mx-auto text-center md:text-left text-slate-500 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <p>Nexus AI © 2024 - Desenvolvido com Google Gemini</p>
            <div className="flex gap-4">
              <span className="text-xs text-emerald-500/70">v7.0 (Auto-Recovery)</span>
              <span className="hover:text-slate-300 cursor-pointer">Termos</span>
              <span className="hover:text-slate-300 cursor-pointer">Privacidade</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <WatermarkManager 
        isOpen={isWatermarkManagerOpen}
        onClose={() => setIsWatermarkManagerOpen(false)}
        library={watermarks}
        settings={watermarkSettings}
        onAddWatermark={handleAddWatermark}
        onDeleteWatermark={handleDeleteWatermark}
        onUpdateSettings={updateWatermarkSettings}
      />

      <GalleryModal 
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onEditImage={handleEditFromGallery}
      />

      <BackupManager
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
      />

      <PromptTemplatesPanel 
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        onSelectTemplate={(content) => {
            navigator.clipboard.writeText(content);
            setIsTemplateManagerOpen(false);
            // In a real app, we might want a toast notification here
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
};

export default App;
