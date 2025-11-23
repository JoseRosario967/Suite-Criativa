
import React, { useState, useRef } from 'react';
import { exportData, validateBackupFile, restoreBackup } from '../services/backupService';
import { Button } from './Button';
import { Database, Download, Upload, AlertTriangle, X, CheckCircle2, FileJson, RefreshCw } from 'lucide-react';

interface BackupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'menu' | 'confirm' | 'success'>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingBackupData, setPendingBackupData] = useState<any | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await exportData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await validateBackupFile(file);
        setPendingBackupData(data);
        setStep('confirm'); // Move to danger zone
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
      }
    }
  };

  const executeRestore = async () => {
    if (!pendingBackupData) return;
    
    setIsLoading(true);
    try {
      await restoreBackup(pendingBackupData);
      setStep('success');
    } catch (err: any) {
      setError(err.message);
      setStep('menu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('menu');
    setError(null);
    setPendingBackupData(null);
    onClose();
  };

  const handleHardReset = async () => {
      if (window.confirm("Isto irá limpar a cache da aplicação e recarregar a página para corrigir ficheiros antigos. Os seus dados guardados (IndexedDB) não serão apagados. Continuar?")) {
        // Unregister SW
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }
        // Clear Caches
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
            await caches.delete(name);
        }
        // Force Reload
        window.location.reload();
      }
  };

  const renderContent = () => {
    switch (step) {
      case 'confirm':
        return (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Atenção: Ação Destrutiva</h3>
            <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-lg text-left text-sm text-red-200 leading-relaxed">
              <p className="font-bold mb-2">Está prestes a substituir todos os seus dados.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>A sua Galeria atual será <strong>apagada permanentemente</strong>.</li>
                <li>As suas Marcas d'Água serão <strong>substituídas</strong>.</li>
                <li>Esta ação <strong>não pode ser desfeita</strong>.</li>
              </ul>
            </div>
            <p className="text-slate-400 text-sm">
                Backup selecionado: <span className="text-white font-mono">{pendingBackupData?.gallery.length} imagens</span> e <span className="text-white font-mono">{pendingBackupData?.watermarks.length} marcas</span>.
            </p>
            <div className="flex gap-4 pt-4">
              <Button onClick={() => setStep('menu')} variant="secondary" className="flex-1">
                Cancelar
              </Button>
              <button 
                onClick={executeRestore}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? 'A apagar e importar...' : 'Sim, Apagar e Importar'}
              </button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8 animate-in zoom-in-50 duration-300">
             <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Importação Concluída!</h3>
             <p className="text-slate-400 mb-8 max-w-xs mx-auto">
                 Os seus dados foram restaurados com sucesso.
             </p>
             <Button 
                onClick={() => window.location.reload()} 
                className="w-full bg-emerald-600 hover:bg-emerald-500"
             >
                 Recarregar Aplicação
             </Button>
          </div>
        );

      default: // 'menu'
        return (
          <div className="space-y-8">
            <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-600/20 rounded-lg">
                        <Download className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-1">Exportar Dados</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Cria um ficheiro de segurança com todas as suas imagens, etiquetas e configurações.
                        </p>
                        <Button 
                            onClick={handleExport} 
                            isLoading={isLoading} 
                            variant="secondary"
                            className="w-full sm:w-auto"
                            icon={<FileJson className="w-4 h-4" />}
                        >
                            Exportar JSON
                        </Button>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-slate-900 text-slate-500">OU</span>
                </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-start gap-4">
                     <div className="p-3 bg-slate-700/50 rounded-lg">
                        <Upload className="w-6 h-6 text-slate-300" />
                    </div>
                    <div className="w-full">
                        <h3 className="text-lg font-semibold text-white mb-1">Importar Dados</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Restaure um backup anterior. <span className="text-red-400">Isto irá apagar os dados atuais.</span>
                        </p>
                        <Button 
                            onClick={() => fileInputRef.current?.click()}
                            isLoading={isLoading} 
                            variant="secondary"
                            className="w-full sm:w-auto border-slate-600 hover:bg-slate-700"
                        >
                            Selecionar Ficheiro JSON
                        </Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept=".json" 
                            onChange={handleFileSelect}
                            onClick={(e) => (e.currentTarget.value = '')} 
                            className="hidden" 
                        />
                    </div>
                </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Backup e Restauro
          </h2>
          {step !== 'success' && (
              <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6">
                   <div className="flex items-start gap-3 mb-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold">Erro ao processar</p>
                   </div>
                   <p className="text-xs mb-3 text-red-300">{error}</p>
                   
                   {error.includes("quota") && (
                       <button 
                            onClick={handleHardReset}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-200 rounded text-xs transition-colors border border-red-500/30"
                       >
                           <RefreshCw className="w-3 h-3" />
                           Forçar Atualização (Limpar Cache)
                       </button>
                   )}
                </div>
            )}
            
            {renderContent()}
        </div>
      </div>
    </div>
  );
};
