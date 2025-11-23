import React, { useState, useEffect } from 'react';
import { generateMagicKey, GeneratedKey } from '../services/lotteryService';
import { Button } from './Button';
import { Clover, Sparkles, RefreshCw } from 'lucide-react';

export const LotteryView: React.FC = () => {
  const [currentKey, setCurrentKey] = useState<GeneratedKey | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [history, setHistory] = useState<GeneratedKey[]>([]);

  const handleGenerate = () => {
    setIsRolling(true);
    setCurrentKey(null);

    // Simulate "thinking" and rolling time
    setTimeout(() => {
      const newKey = generateMagicKey();
      setCurrentKey(newKey);
      setIsRolling(false);
      setHistory(prev => [newKey, ...prev].slice(0, 5)); // Keep last 5
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col items-center">
      
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex p-4 bg-indigo-900/30 rounded-full mb-4 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          <Clover className="w-12 h-12 text-indigo-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
          Sorte & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Magia</span>
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          Algoritmo estatístico que equilibra números "quentes" e "frios" para criar chaves com maior probabilidade harmónica.
        </p>
      </div>

      {/* Main Stage */}
      <div className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl p-8 md:p-12 mb-8 relative overflow-hidden min-h-[300px] flex flex-col items-center justify-center">
        
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-indigo-500 rounded-full blur-[80px]" />
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-500 rounded-full blur-[80px]" />
        </div>

        {/* The Key Display */}
        <div className="relative z-10 flex flex-col gap-8 items-center">
            
            {/* Numbers Row */}
            <div className="flex flex-wrap justify-center gap-3 md:gap-6">
                {[0, 1, 2, 3, 4].map((idx) => (
                    <NumberBall 
                        key={`num-${idx}`} 
                        value={currentKey?.numbers[idx]} 
                        isRolling={isRolling} 
                        delay={idx * 100}
                    />
                ))}
            </div>

            {/* Stars Row */}
            <div className="flex justify-center gap-6 mt-2">
                 {[0, 1].map((idx) => (
                    <StarBall 
                        key={`star-${idx}`} 
                        value={currentKey?.stars[idx]} 
                        isRolling={isRolling}
                        delay={600 + (idx * 150)}
                    />
                ))}
            </div>

        </div>

        {/* Action Button */}
        <div className="mt-12 relative z-20">
            <Button 
                onClick={handleGenerate} 
                disabled={isRolling}
                className="px-8 py-4 text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all transform hover:scale-105"
                icon={isRolling ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            >
                {isRolling ? 'A Sorte está a Rolar...' : 'Gerar Nova Chave'}
            </Button>
        </div>

      </div>

      {/* History */}
      {history.length > 0 && (
          <div className="w-full max-w-2xl animate-in slide-in-from-bottom-8">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">Chaves Recentes</h3>
              <div className="space-y-3">
                  {history.map((key, i) => (
                      <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                          <div className="flex gap-2">
                              {key.numbers.map(n => (
                                  <span key={n} className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-200">
                                      {n}
                                  </span>
                              ))}
                          </div>
                          <div className="flex gap-2">
                              {key.stars.map(n => (
                                  <span key={n} className="w-8 h-8 flex items-center justify-center text-sm font-bold text-amber-400">
                                      ★ {n}
                                  </span>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

    </div>
  );
};

// ----- Sub Components -----

interface BallProps {
    value?: number;
    isRolling: boolean;
    delay: number;
}

const NumberBall: React.FC<BallProps> = ({ value, isRolling, delay }) => {
    return (
        <div 
            className={`
                w-14 h-14 md:w-20 md:h-20 rounded-full 
                bg-gradient-to-br from-indigo-500 to-indigo-700 
                shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.3)]
                flex items-center justify-center
                border-2 border-indigo-400/30
                transition-all duration-500
                ${isRolling ? 'animate-pulse' : 'animate-in zoom-in-50 bounce-in'}
            `}
            style={{ animationDelay: isRolling ? '0ms' : `${delay}ms`, animationFillMode: 'both' }}
        >
            <span className="text-2xl md:text-4xl font-bold text-white drop-shadow-md">
                {isRolling ? '?' : (value || '?')}
            </span>
        </div>
    );
};

const StarBall: React.FC<BallProps> = ({ value, isRolling, delay }) => {
    return (
        <div 
            className={`
                relative w-16 h-16 md:w-24 md:h-24 flex items-center justify-center
                transition-all duration-500
                ${isRolling ? 'opacity-50' : 'animate-in zoom-in-0 spin-in-12'}
            `}
            style={{ animationDelay: isRolling ? '0ms' : `${delay}ms`, animationFillMode: 'both' }}
        >
            {/* SVG Star Shape */}
            <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            
            <span className="relative z-10 text-xl md:text-3xl font-bold text-amber-900 mt-1">
                {isRolling ? '?' : (value || '?')}
            </span>
        </div>
    );
};