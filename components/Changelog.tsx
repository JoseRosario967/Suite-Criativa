
import React from 'react';

interface ChangelogProps {
    isOpen: boolean;
    onClose: () => void;
}

const changelogData = [
    {
        version: "v2.0.0",
        date: "2025-11-14",
        title: "A Grande Expansão: Novas Ferramentas e Melhorias",
        changes: [
            { type: "new", text: "Estúdio de Super Resolução: Amplie a qualidade e os detalhes das suas imagens com IA." },
            { type: "new", text: "Removedor de Fundo: Isole sujeitos das suas fotos com um clique." },
            { type: "new", text: "Estúdio de Vídeo: Crie vídeos curtos a partir de texto e imagens (beta)." },
            { type: "new", text: "Estúdio de Design de Interiores: Redecore divisões da sua casa com base em estilos." },
            { type: "new", text: "Estúdio de Poesia: Liberte o seu lado criativo com a geração de poemas, prosas e agora... Rap!" },
            { type: "improvement", text: "Editor de Texto reconstruído: Agora suporta múltiplas camadas de texto com edição individual e posicionamento livre." },
            { type: "improvement", text: "Interface reorganizada: A barra de navegação foi redesenhada para uma melhor organização e para evitar sobrecarga do ecrã." },
            { type: "fix", text: "Correções gerais de estabilidade e performance em vários módulos." },
        ]
    },
    {
        version: "v1.2.0",
        date: "2025-11-12",
        title: "Chaves na Mão: Gestão de API Pessoal",
        changes: [
            { type: "new", text: "Adicionada a opção para usar a sua própria chave de API da Google nas Definições." },
            { type: "note", text: "Agora, todas as chamadas à API usam a sua chave, se fornecida, oferecendo mais controlo sobre o uso." }
        ]
    },
    {
        version: "v1.1.0",
        date: "2025-11-10",
        title: "A Chegada do Navegador",
        changes: [
            { type: "new", text: "Adicionado o módulo de Novidades (este que está a ler!)." },
            { type: "note", text: "Um agradecimento especial a José Rosário por se juntar à tripulação. Que os ventos nos sejam favoráveis!" },
        ]
    },
    {
        version: "v1.0.0",
        date: "2025-11-08",
        title: "Lançamento Inicial",
        changes: [
            { type: "new", text: "Gerador e Editor de Imagens com IA." },
            { type: "new", text: "Módulos de Montagem, Restauro e Editor de Texto." },
            { type: "new", text: "Gestão de Marcas d'Água e Histórico." },
            { type: "new", text: "Ferramentas de Backup e sistema de Prompts." },
            { type: "new", text: "Gerador de chaves do Euromilhões." },
        ]
    }
];

const ChangeTypeIcon: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
        case 'new':
            return <span title="Novo" className="text-green-400">✨</span>;
        case 'fix':
            return <span title="Correção" className="text-yellow-400">🛠️</span>;
        case 'improvement':
            return <span title="Melhoria" className="text-cyan-400">🚀</span>;
        case 'note':
            return <span title="Nota" className="text-blue-400">📝</span>;
        default:
            return null;
    }
};

export const Changelog: React.FC<ChangelogProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300" role="dialog" aria-modal="true">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800">
                    <h2 className="text-2xl font-bold text-white">O que há de novo?</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="p-6 space-y-8 overflow-y-auto">
                    {changelogData.map(entry => (
                        <div key={entry.version} className="border-l-4 border-indigo-500 pl-4">
                            <div className="flex items-baseline space-x-3">
                                <h3 className="text-xl font-semibold text-white">{entry.title}</h3>
                                <span className="text-sm font-mono text-indigo-400 bg-gray-700 px-2 py-0.5 rounded">{entry.version}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-4">{entry.date}</p>
                            <ul className="space-y-2">
                                {entry.changes.map((change, index) => (
                                    <li key={index} className="flex items-start space-x-3 text-gray-300">
                                        <div className="flex-shrink-0 pt-1"><ChangeTypeIcon type={change.type} /></div>
                                        <span>{change.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
