
import React from 'react';
import { AppView } from '../types';
import { 
  Wand2, 
  PenTool, 
  ChefHat, 
  Sprout, 
  CloudSun, 
  ArrowRight,
  Video,
  Music,
  Dna,
  ScanSearch,
  Type,
  Layers,
  Clover,
  Scissors
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const tools = [
    {
      id: AppView.GENERATOR,
      title: 'Gerador de Imagens',
      description: 'Crie visuais deslumbrantes a partir de texto com o Gemini 2.5.',
      icon: <Wand2 className="w-6 h-6" />,
      color: 'from-indigo-500 to-violet-500',
      active: true
    },
    {
      id: AppView.EDITOR,
      title: 'Editor Mágico',
      description: 'Edite e transforme imagens existentes usando instruções naturais.',
      icon: <PenTool className="w-6 h-6" />,
      color: 'from-pink-500 to-rose-500',
      active: true
    },
    {
      id: AppView.MONTAGE,
      title: 'Estúdio de Montagem',
      description: 'Combine duas imagens (Fundo + Sujeito) numa composição realista.',
      icon: <Scissors className="w-6 h-6" />,
      color: 'from-orange-500 to-red-500',
      active: true
    },
    {
      id: AppView.TEXT_EDITOR,
      title: 'Editor de Texto',
      description: 'Adicione textos, legendas e marcas de água às suas imagens em tempo real.',
      icon: <Type className="w-6 h-6" />,
      color: 'from-emerald-500 to-teal-500',
      active: true
    },
    {
      id: AppView.DISCOVERY,
      title: 'Descobridor Prompt',
      description: 'Engenharia reversa: descubra qual o prompt usado para alterar uma imagem.',
      icon: <ScanSearch className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-500',
      active: true
    },
    {
        id: AppView.BATCH_WATERMARK,
        title: 'Marca d\'Água em Lote',
        description: 'Aplique o seu logótipo a centenas de imagens de uma só vez.',
        icon: <Layers className="w-6 h-6" />,
        color: 'from-slate-500 to-gray-500',
        active: true
      },
    {
        id: AppView.LOTTERY,
        title: 'Sorte & Magia',
        description: 'Gerador de chaves Euromilhões baseado em estatísticas quentes/frias.',
        icon: <Clover className="w-6 h-6" />,
        color: 'from-amber-400 to-yellow-600',
        active: true
    },
    {
      id: AppView.CHEF,
      title: 'Chef Michelin',
      description: 'Receitas personalizadas com base no que tem no frigorífico.',
      icon: <ChefHat className="w-6 h-6" />,
      color: 'from-orange-500 to-amber-500',
      active: false
    },
    {
      id: AppView.GARDEN,
      title: 'Estúdio de Jardinagem',
      description: 'O seu guia agrícola baseado na região e na época do ano.',
      icon: <Sprout className="w-6 h-6" />,
      color: 'from-emerald-500 to-green-500',
      active: false
    },
    {
      id: AppView.WEATHER,
      title: 'Meteorologia',
      description: 'Previsões detalhadas com linguagem popular portuguesa.',
      icon: <CloudSun className="w-6 h-6" />,
      color: 'from-sky-500 to-blue-500',
      active: false
    },
    {
      id: AppView.VIDEO,
      title: 'Vídeo AI',
      description: 'Gere vídeos curtos criativos a partir de descrições.',
      icon: <Video className="w-6 h-6" />,
      color: 'from-red-500 to-orange-500',
      active: false
    },
    {
        id: AppView.POETRY,
        title: 'Poesia & Música',
        description: 'Crie poemas e letras de músicas originais.',
        icon: <Music className="w-6 h-6" />,
        color: 'from-purple-500 to-fuchsia-500',
        active: false
      }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-900/50 to-slate-900 border border-indigo-500/20 p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Dê vida às suas ideias com Inteligência Artificial
          </h1>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed">
            Uma suite completa de ferramentas criativas potenciada pelos modelos mais avançados da Google. 
            Comece a criar hoje.
          </p>
          <button 
            onClick={() => onNavigate(AppView.GENERATOR)}
            className="px-6 py-3 bg-white text-indigo-900 font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            Começar a Criar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Decorative background element */}
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none">
          <Dna className="w-full h-full text-indigo-400" />
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Ferramentas Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div 
              key={tool.id}
              onClick={() => tool.active && onNavigate(tool.id as AppView)}
              className={`
                group relative p-6 rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm
                transition-all duration-300
                ${tool.active 
                  ? 'hover:border-indigo-500/50 hover:bg-slate-800 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10' 
                  : 'opacity-60 cursor-not-allowed grayscale-[0.5]'}
              `}
            >
              <div className={`
                w-12 h-12 rounded-lg bg-gradient-to-br ${tool.color} 
                flex items-center justify-center text-white mb-4 shadow-lg
              `}>
                {tool.icon}
              </div>
              
              <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-indigo-400 transition-colors">
                {tool.title}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {tool.description}
              </p>
              
              {!tool.active && (
                <div className="absolute top-4 right-4 bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-1 rounded border border-slate-700">
                  BREVEMENTE
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};