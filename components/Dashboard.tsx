
import React from 'react';
import type { ActiveView } from '../types';

interface DashboardProps {
    setActiveView: (view: ActiveView) => void;
}

interface ToolCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
    badge?: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, description, icon, color, onClick, badge }) => (
    <button 
        onClick={onClick}
        className="group relative flex flex-col items-start text-left p-6 bg-gray-800 border border-gray-700 rounded-2xl hover:border-gray-500 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden w-full h-full"
    >
        <div className={`absolute top-0 left-0 w-full h-1.5 ${color}`} />
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 ${color} transition-opacity duration-300`} />
        
        <div className="flex justify-between w-full items-start mb-4">
            <div className={`p-3 rounded-xl bg-gray-900 ${color.replace('bg-', 'text-')} ring-1 ring-gray-700 group-hover:ring-gray-500 transition-all`}>
                {icon}
            </div>
            {badge && (
                <span className="bg-gray-700 text-xs font-bold px-2 py-1 rounded-md text-gray-300 uppercase tracking-wide">
                    {badge}
                </span>
            )}
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gray-100 transition-colors">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
        
        <div className="mt-auto pt-6 flex items-center text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
            Abrir Ferramenta
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </div>
    </button>
);

export const Dashboard: React.FC<DashboardProps> = ({ setActiveView }) => {
    const tools = [
        {
            id: 'generator',
            title: "Gerador Principal",
            description: "Crie imagens incríveis a partir de texto ou edite as suas fotos existentes com o poder do Imagen 4.",
            color: "bg-indigo-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
            badge: "Core"
        },
        {
            id: 'gardening',
            title: "Estúdio de Jardinagem",
            description: "O seu Borda d'Água digital. Saiba o que plantar e como tratar a sua horta mês a mês.",
            color: "bg-green-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
        {
            id: 'weather',
            title: "O Tempo à Antiga",
            description: "Previsão meteorológica em tempo real com linguagem popular. Vai chover ou fazer sol?",
            color: "bg-blue-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
            badge: "Novo"
        },
        {
            id: 'chef',
            title: "Chef AI Michelin",
            description: "Tem ingredientes mas não tem ideias? A IA cria receitas gourmet e mostra-lhe o prato final.",
            color: "bg-orange-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /><path d="M20.488 9H15V3.5a1 1 0 00-1-1h-2a1 1 0 00-1 1V9H6.512a1 1 0 00-.832 1.554L8 14h8l2.32-3.446a1 1 0 00-.832-1.554zM12 14v6" /></svg>,
        },
        {
            id: 'magicEraser',
            title: "Borracha Mágica",
            description: "Remova objetos indesejados, pessoas ou marcas d'água de qualquer fotografia instantaneamente.",
            color: "bg-red-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
        },
        {
            id: 'video',
            title: "Estúdio de Vídeo",
            description: "Transforme os seus prompts em vídeos curtos cinematográficos. O futuro do movimento.",
            color: "bg-purple-600",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
            badge: "Beta"
        },
        {
            id: 'translator',
            title: "Tradutor Universal",
            description: "Tradução de texto inteligente com deteção automática de língua e respeito pelo contexto cultural.",
            color: "bg-cyan-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>,
        },
        {
            id: 'portrait',
            title: "Retratos AI",
            description: "Crie retratos compósitos combinando características de várias pessoas numa só.",
            color: "bg-pink-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        },
        {
            id: 'interiorDesign',
            title: "Design de Interiores",
            description: "Redecore qualquer divisão. Carregue uma foto e aplique novos estilos de decoração.",
            color: "bg-teal-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
        },
        {
            id: 'upscaler',
            title: "Super Resolução",
            description: "Amplie imagens pequenas e aumente a nitidez e detalhes com qualidade profissional.",
            color: "bg-blue-600",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>,
        },
        {
            id: 'restoration',
            title: "Restauro de Fotos",
            description: "Recupere fotografias antigas, danificadas ou desbotadas para a sua glória original.",
            color: "bg-amber-600",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
        {
            id: 'backgroundRemover',
            title: "Removedor de Fundo",
            description: "Isole sujeitos e torne o fundo transparente com um único clique.",
            color: "bg-gray-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        },
        {
            id: 'montage',
            title: "Estúdio de Montagem",
            description: "Crie composições realistas inserindo pessoas ou objetos em novos fundos.",
            color: "bg-green-600",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>,
        },
        {
            id: 'textEditor',
            title: "Editor de Texto",
            description: "Adicione tipografia estilosa, memes ou legendas às suas imagens.",
            color: "bg-orange-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
        },
        {
            id: 'transcription',
            title: "Transcrição de Áudio",
            description: "Converta ficheiros de áudio e gravações em texto claro e formatado.",
            color: "bg-cyan-600",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
        },
        {
            id: 'poetry',
            title: "Estúdio de Poesia",
            description: "Gere poemas, letras de música e prosa criativa com a ajuda da IA.",
            color: "bg-rose-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
        },
        {
            id: 'euromillions',
            title: "Euromilhões",
            description: "Gere chaves aleatórias baseadas em estatística para testar a sua sorte.",
            color: "bg-yellow-500",
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                    A Sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Suite Criativa</span>
                </h2>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Selecione uma das ferramentas especializadas abaixo para começar a criar, editar ou transformar os seus conteúdos com Inteligência Artificial.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tools.map((tool) => (
                    <ToolCard
                        key={tool.id}
                        title={tool.title}
                        description={tool.description}
                        icon={tool.icon}
                        color={tool.color}
                        badge={tool.badge}
                        onClick={() => setActiveView(tool.id as ActiveView)}
                    />
                ))}
            </div>
        </div>
    );
};