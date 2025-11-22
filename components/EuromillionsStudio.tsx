
import React, { useState, useCallback, useMemo } from 'react';
import { Spinner } from './Spinner';

interface EuromillionsStudioProps {
    onClose: () => void;
}

interface LuckyKey {
    main: number[];
    stars: number[];
}

// Conjunto de dados de resultados passados para análise estatística
const pastResults: LuckyKey[] = [
    { main: [5, 12, 22, 34, 48], stars: [3, 9] },
    { main: [7, 19, 21, 40, 43], stars: [2, 10] },
    { main: [1, 15, 25, 30, 49], stars: [1, 8] },
    { main: [3, 11, 22, 33, 41], stars: [5, 11] },
    { main: [10, 20, 30, 40, 50], stars: [4, 6] },
    { main: [2, 18, 28, 38, 42], stars: [7, 12] },
    { main: [5, 13, 22, 35, 47], stars: [1, 9] },
    { main: [9, 14, 23, 31, 44], stars: [2, 3] },
    { main: [6, 17, 24, 34, 46], stars: [8, 10] },
    { main: [4, 12, 29, 39, 45], stars: [6, 11] },
];

// Analisa a frequência dos números e estrelas
const analyzeFrequencies = (results: LuckyKey[]): { mainFreq: Record<number, number>, starFreq: Record<number, number> } => {
    const mainFreq: Record<number, number> = {};
    const starFreq: Record<number, number> = {};

    // Inicializa todos os números com um peso base de 1 para garantir que todos podem ser escolhidos
    for (let i = 1; i <= 50; i++) mainFreq[i] = 1;
    for (let i = 1; i <= 12; i++) starFreq[i] = 1;

    results.forEach(result => {
        result.main.forEach(num => {
            mainFreq[num]++;
        });
        result.stars.forEach(star => {
            starFreq[star]++;
        });
    });

    return { mainFreq, starFreq };
};

// Seleciona um número aleatório com base na sua frequência (peso)
const getWeightedRandom = (freqMap: Record<number, number>): number => {
    const weightedArray: number[] = [];
    for (const num in freqMap) {
        // Quanto maior a frequência, mais vezes o número é adicionado ao array, aumentando a sua probabilidade
        for (let i = 0; i < freqMap[num]; i++) {
            weightedArray.push(parseInt(num, 10));
        }
    }
    const randomIndex = Math.floor(Math.random() * weightedArray.length);
    return weightedArray[randomIndex];
};

// Gera uma chave única usando a análise estatística
const generateStatisticallyAnalyzedKey = (mainFreq: Record<number, number>, starFreq: Record<number, number>): LuckyKey => {
    const mainNumbers = new Set<number>();
    while (mainNumbers.size < 5) {
        mainNumbers.add(getWeightedRandom(mainFreq));
    }

    const stars = new Set<number>();
    while (stars.size < 2) {
        stars.add(getWeightedRandom(starFreq));
    }

    return {
        main: Array.from(mainNumbers).sort((a, b) => a - b),
        stars: Array.from(stars).sort((a, b) => a - b),
    };
};

export const EuromillionsStudio: React.FC<EuromillionsStudioProps> = ({ onClose }) => {
    const [luckyKey, setLuckyKey] = useState<LuckyKey | null>(null);
    const [multipleKeys, setMultipleKeys] = useState<LuckyKey[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Memoiza as frequências para não as recalcular a cada renderização
    const frequencies = useMemo(() => analyzeFrequencies(pastResults), []);

    const handleGenerateSingle = useCallback(() => {
        setIsLoading(true);
        setLuckyKey(null);
        setMultipleKeys(null);

        setTimeout(() => {
            setLuckyKey(generateStatisticallyAnalyzedKey(frequencies.mainFreq, frequencies.starFreq));
            setIsLoading(false);
        }, 1200);
    }, [frequencies]);

    const handleGenerateMultiple = useCallback(() => {
        setIsLoading(true);
        setLuckyKey(null);
        setMultipleKeys(null);
        
        setTimeout(() => {
            const keys = Array.from({ length: 5 }, () => generateStatisticallyAnalyzedKey(frequencies.mainFreq, frequencies.starFreq));
            setMultipleKeys(keys);
            setIsLoading(false);
        }, 1800);
    }, [frequencies]);

    return (
        <div className="relative w-full max-w-4xl mx-auto">
            <button 
                onClick={onClose} 
                className="absolute -top-4 -right-4 z-10 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar Gerador do Euromilhões"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700 text-center flex flex-col items-center gap-8">
                <h2 className="text-3xl font-bold text-white">Gerador de Chaves do Euromilhões</h2>
                <p className="text-gray-400 max-w-xl">
                    Use o nosso motor de análise estatística para gerar chaves com base nos resultados mais frequentes, aumentando as suas probabilidades. Gere uma chave única ou um conjunto de 5 chaves de uma vez!
                </p>

                <div className="w-full min-h-[12rem] flex items-center justify-center bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-700 p-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center">
                            <Spinner size="lg" />
                            <p className="mt-4 text-gray-400">A analisar dados estatísticos...</p>
                        </div>
                    ) : multipleKeys ? (
                         <div className="flex flex-col items-center gap-3 animate-fade-in w-full max-w-md">
                            {multipleKeys.map((key, index) => (
                                <div key={index} className="flex items-center gap-4 p-2 bg-gray-700/50 rounded-lg w-full justify-center">
                                    <div className="flex gap-2">
                                        {key.main.map(num => (
                                            <div key={num} className="h-10 w-10 flex items-center justify-center bg-gray-800 text-white font-bold text-lg rounded-full shadow-md">
                                                {num}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        {key.stars.map(star => (
                                            <div key={star} className="h-10 w-10 flex items-center justify-center bg-yellow-500 text-gray-900 font-bold text-lg rounded-full shadow-md">
                                                {star}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : luckyKey ? (
                        <div className="flex flex-col items-center gap-4 animate-fade-in">
                             <div>
                                <h3 className="text-lg font-semibold text-gray-300 mb-2">Números da Sorte</h3>
                                <div className="flex gap-3">
                                    {luckyKey.main.map(num => (
                                        <div key={num} className="h-14 w-14 flex items-center justify-center bg-indigo-600 text-white font-bold text-2xl rounded-full shadow-lg">
                                            {num}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-300 mb-2">Estrelas da Sorte</h3>
                                <div className="flex gap-3">
                                    {luckyKey.stars.map(star => (
                                        <div key={star} className="h-14 w-14 flex items-center justify-center bg-yellow-500 text-gray-900 font-bold text-2xl rounded-full shadow-lg">
                                            {star}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                         <p className="text-gray-500">As suas chaves da sorte aparecerão aqui.</p>
                    )}
                </div>

                <div className="w-full md:w-5/6 flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleGenerateSingle}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center px-6 py-4 bg-gray-600 text-white font-semibold text-lg rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        Gerar 1 Chave da Sorte
                    </button>
                    <button
                        onClick={handleGenerateMultiple}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center px-6 py-4 bg-indigo-600 text-white font-semibold text-lg rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Gerar 5 Chaves (Desdobramento)
                    </button>
                </div>
            </div>
        </div>
    );
};
