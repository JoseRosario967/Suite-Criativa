import React, { useRef } from 'react';

interface BackupManagerProps {
    getBackupData: () => object;
    loadBackupData: (data: object) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ getBackupData, loadBackupData }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        try {
            const data = getBackupData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-image-editor-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data:", error);
            alert("Falha ao exportar dados. Verifique a consola para mais detalhes.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = e.target?.result as string;
                    if (!json) throw new Error("Ficheiro vazio ou ilegível.");
                    
                    const data = JSON.parse(json);
                    loadBackupData(data);
                    alert("Importação concluída. Verifique se os seus dados foram restaurados. Se houver um problema, uma mensagem de erro aparecerá no topo da página.");
                } catch (error: any) {
                    console.error("Failed to import data:", error);
                    alert(`Falha ao importar dados: ${error.message}. O ficheiro pode estar corrompido ou mal formatado.`);
                } finally {
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            };
            reader.onerror = () => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                alert("Ocorreu um erro ao ler o ficheiro.");
            }
            reader.readAsText(file);
        }
    };

    return (
        <div className="flex flex-col space-y-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-gray-400">Backup e Restauro</h2>
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={handleExport} className="flex-1 px-4 py-2 bg-gray-700 text-indigo-300 font-semibold rounded-lg hover:bg-gray-600 transition-colors">
                    Exportar Ficheiro
                </button>
                <button onClick={handleImportClick} className="flex-1 px-4 py-2 bg-gray-700 text-indigo-300 font-semibold rounded-lg hover:bg-gray-600 transition-colors">
                    Importar Ficheiro
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/json"
                    className="hidden"
                />
            </div>
        </div>
    );
};