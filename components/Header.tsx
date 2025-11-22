
import React from 'react';
import type { ActiveView } from '../types';

interface HeaderProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    onOpenDiscoverer: () => void;
    onOpenBatchWatermarker: () => void;
    onOpenChangelog: () => void;
    credits: number;
    onOpenCreditStore: () => void;
}

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M19 3v4M17 5h4M12 2v4M10 4h4M8 21v-4M10 19H6M16 21v-4M14 19h4M12 21v-4M10 19h4" />
    </svg>
);

const NavButton: React.FC<{
    onClick: () => void;
    title: string;
    isActive: boolean;
    children: React.ReactNode;
}> = ({ onClick, title, isActive, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-3 py-2 text-sm font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-200 ${
            isActive ? 'bg-indigo-600 text-white' : 'bg-gray-700/50 text-indigo-300 hover:bg-gray-700'
        }`}
        title={title}
    >
        {children}
    </button>
);


export const Header: React.FC<HeaderProps> = ({ 
    activeView, setActiveView, onOpenDiscoverer, 
    onOpenBatchWatermarker, onOpenChangelog, credits, onOpenCreditStore 
}) => {
    
  return (
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10 print:hidden">
        <div className="container mx-auto px-4 py-3 md:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveView('dashboard')}>
                <SparklesIcon />
                <h1 className={`text-lg md:text-2xl font-bold tracking-tight transition-colors ${activeView === 'dashboard' ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                    Suite Criativa AI
                </h1>
            </div>
            
            <div className="flex items-center space-x-4">
                {/* Quick Nav for core tools when deep inside sub-views */}
                {activeView !== 'dashboard' && (
                    <div className="hidden md:flex items-center space-x-2 mr-4">
                        <NavButton onClick={() => setActiveView('dashboard')} title="Menu Principal" isActive={false}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                            <span>Menu</span>
                        </NavButton>
                    </div>
                )}

                <button 
                    onClick={onOpenCreditStore}
                    className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-full border border-yellow-500/50 transition-all group"
                    title="Abrir Loja de Créditos"
                >
                    <span className="text-xl group-hover:scale-110 transition-transform">🪙</span>
                    <span className={`font-bold ${credits > 0 ? 'text-yellow-400' : 'text-red-400'}`}>{credits}</span>
                </button>

                <div className="flex items-center space-x-2">
                    <button onClick={onOpenDiscoverer} title="Descobrir Prompt" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" /></svg>
                    </button>
                    <button onClick={onOpenBatchWatermarker} title="Lote" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </button>
                    <button onClick={onOpenChangelog} title="Novidades" className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </button>
                </div>
            </div>
          </div>
        </div>
      </header>
  );
};
