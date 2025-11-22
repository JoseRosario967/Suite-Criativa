
import React, { useState } from 'react';

interface ApiKeyPanelProps {
    isOpen: boolean;
    onClose: () => void;
    personalApiKey: string;
    setPersonalApiKey: (key: string) => void;
}

const ApiKeyManager: React.FC<{ personalApiKey: string; setPersonalApiKey: (key: string) => void; }> = ({ personalApiKey, setPersonalApiKey }) => {
    const [keyInput, setKeyInput] = useState(personalApiKey);
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

    const handleSave = () => {
        setPersonalApiKey(keyInput);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const handleClear = () => {
        setKeyInput('');
        setPersonalApiKey('');
    };
    
    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-400">
                Se tiver a sua própria chave de API da Google AI, pode inseri-la aqui. Se o campo estiver vazio, a aplicação usará a chave padrão.
            </p>
            <div className="relative">
                <input 
                    type={isKeyVisible ? "text" : "password"}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Cole a sua chave de API aqui"
                    className="w-full p-2 pr-10 bg-gray-900 border-2 border-gray-600 rounded-md text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                    onClick={() => setIsKeyVisible(!isKeyVisible)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-white"
                    aria-label={isKeyVisible ? "Ocultar chave" : "Mostrar chave"}
                >
                    {isKeyVisible ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                    ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                    )}
                </button>
            </div>
             <div className="flex gap-2">
                <button onClick={handleSave} className="flex-1 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700">
                    {saveStatus === 'saved' ? 'Guardada!' : 'Guardar Chave'}
                </button>
                <button onClick={handleClear} className="flex-1 py-2 bg-gray-600 text-white rounded-md text-sm font-semibold hover:bg-gray-700">
                    Limpar e usar Padrão
                </button>
            </div>
            <p className="text-xs text-center text-gray-500">
                {personalApiKey ? "A usar a sua chave pessoal." : "A usar a chave padrão da aplicação."}
            </p>
        </div>
    )
}

export const ApiKeyPanel: React.FC<ApiKeyPanelProps> = ({ isOpen, onClose, personalApiKey, setPersonalApiKey }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
             <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Chave API</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="p-4">
                    <ApiKeyManager personalApiKey={personalApiKey} setPersonalApiKey={setPersonalApiKey} />
                </div>
             </div>
        </div>
    );
}
