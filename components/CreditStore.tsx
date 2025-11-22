
import React from 'react';

interface CreditStoreProps {
    isOpen: boolean;
    onClose: () => void;
    onAddCredits: (amount: number) => void;
}

const CreditCard: React.FC<{ 
    title: string; 
    amount: number; 
    description: string; 
    color: string; 
    onBuy: () => void 
}> = ({ title, amount, description, color, onBuy }) => (
    <div className={`relative p-6 rounded-xl border border-gray-700 bg-gray-800/80 flex flex-col items-center text-center space-y-4 hover:scale-105 transition-transform duration-200 shadow-lg overflow-hidden group`}>
        <div className={`absolute top-0 left-0 w-full h-1 ${color}`} />
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <div className="text-4xl font-extrabold text-white flex items-center">
            <span className="mr-1">🪙</span>{amount}
        </div>
        <p className="text-gray-400 text-sm min-h-[40px]">{description}</p>
        <button 
            onClick={onBuy}
            className={`w-full py-2 px-4 rounded-lg font-bold text-white transition-colors ${color.replace('bg-', 'hover:bg-opacity-80 ')} bg-opacity-100 bg-indigo-600`}
        >
            Obter Grátis
        </button>
    </div>
);

export const CreditStore: React.FC<CreditStoreProps> = ({ isOpen, onClose, onAddCredits }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Loja de Créditos Virtual</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="p-8 overflow-y-auto">
                    <div className="text-center mb-8">
                        <p className="text-gray-300 text-lg">
                            Acabaram-se os créditos? Não há problema!
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            Nesta aplicação, a criatividade não tem preço. Recarregue a sua carteira virtual sem gastar um cêntimo.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CreditCard 
                            title="Pacote Iniciante" 
                            amount={20} 
                            description="O dobro do plafond diário para começar bem." 
                            color="bg-blue-500" 
                            onBuy={() => { onAddCredits(20); onClose(); }}
                        />
                        <CreditCard 
                            title="Pacote Criativo" 
                            amount={50} 
                            description="Para sessões longas de geração e edição." 
                            color="bg-purple-500" 
                            onBuy={() => { onAddCredits(50); onClose(); }}
                        />
                        <CreditCard 
                            title="Pacote Ilimitado" 
                            amount={100} 
                            description="Créditos massivos para quem não quer parar." 
                            color="bg-yellow-500" 
                            onBuy={() => { onAddCredits(100); onClose(); }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
