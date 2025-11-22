
import React, { useState } from 'react';
import { getWeatherForecast } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';

interface WeatherStudioProps {
    onClose: () => void;
    personalApiKey: string;
}

interface WeatherData {
    current: {
        temp: string;
        condition: string;
        description: string;
        icon: string;
    };
    forecast: {
        date: string;
        min: string;
        max: string;
        summary: string;
        hourly: {
            time: string;
            temp: string;
            condition: string;
        }[];
    }[];
}

// Data Hierarchy
const PORTUGAL_DATA: Record<string, string[]> = {
    "Norte": ["Viana do Castelo", "Braga", "Porto", "Vila Real", "Bragança"],
    "Centro": ["Aveiro", "Viseu", "Guarda", "Coimbra", "Castelo Branco", "Leiria"],
    "Lisboa": ["Lisboa", "Santarém", "Setúbal"],
    "Alentejo": ["Portalegre", "Évora", "Beja"],
    "Algarve": ["Faro"],
    "Açores": ["Ponta Delgada", "Angra do Heroísmo", "Horta"],
    "Madeira": ["Funchal", "Porto Santo"]
};

const WEATHER_ICONS: Record<string, string> = {
    sun: '☀️',
    rain: '🌧️',
    cloud: '☁️',
    snow: '❄️',
    storm: '⚡',
    fog: '🌫️',
    partly_cloudy: '⛅'
};

const getIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('sol') || lower.includes('limpo')) return WEATHER_ICONS.sun;
    if (lower.includes('chuva') || lower.includes('aguaceiro')) return WEATHER_ICONS.rain;
    if (lower.includes('neve')) return WEATHER_ICONS.snow;
    if (lower.includes('trovoada')) return WEATHER_ICONS.storm;
    if (lower.includes('nevoeiro') || lower.includes('nublado') || lower.includes('nuvens')) return WEATHER_ICONS.cloud;
    return WEATHER_ICONS.cloud;
};

// Simplified SVG Map of Portugal Regions
const PortugalMap: React.FC<{ onSelect: (region: string) => void }> = ({ onSelect }) => {
    return (
        <svg viewBox="0 0 300 600" className="w-full h-full max-h-[500px] drop-shadow-xl animate-fade-in">
            {/* Norte */}
            <path 
                d="M80,20 L220,20 L200,150 L60,150 Z" 
                fill="#3B82F6" 
                className="cursor-pointer hover:fill-blue-400 transition-colors opacity-80 hover:opacity-100 hover:scale-[1.01] origin-center"
                onClick={() => onSelect("Norte")}
            />
            <text x="140" y="90" fill="white" fontSize="16" fontWeight="bold" pointerEvents="none" textAnchor="middle">Norte</text>

            {/* Centro */}
            <path 
                d="M60,155 L200,155 L180,280 L50,280 Z" 
                fill="#10B981" 
                className="cursor-pointer hover:fill-emerald-400 transition-colors opacity-80 hover:opacity-100 hover:scale-[1.01] origin-center"
                onClick={() => onSelect("Centro")}
            />
            <text x="125" y="220" fill="white" fontSize="16" fontWeight="bold" pointerEvents="none" textAnchor="middle">Centro</text>

            {/* Lisboa e Vale do Tejo */}
            <path 
                d="M40,285 L100,285 L80,350 L30,350 Z" 
                fill="#F59E0B" 
                className="cursor-pointer hover:fill-amber-400 transition-colors opacity-80 hover:opacity-100 hover:scale-[1.01] origin-center"
                onClick={() => onSelect("Lisboa")}
            />
            <text x="65" y="320" fill="white" fontSize="14" fontWeight="bold" pointerEvents="none" textAnchor="middle">Lisboa</text>

            {/* Alentejo */}
            <path 
                d="M105,285 L230,285 L210,450 L50,450 L85,350 L105,285 Z" 
                fill="#D97706" 
                className="cursor-pointer hover:fill-amber-600 transition-colors opacity-80 hover:opacity-100 hover:scale-[1.01] origin-center"
                onClick={() => onSelect("Alentejo")}
            />
            <text x="150" y="380" fill="white" fontSize="16" fontWeight="bold" pointerEvents="none" textAnchor="middle">Alentejo</text>

            {/* Algarve */}
            <path 
                d="M50,455 L210,455 L200,500 L60,500 Z" 
                fill="#EF4444" 
                className="cursor-pointer hover:fill-red-400 transition-colors opacity-80 hover:opacity-100 hover:scale-[1.01] origin-center"
                onClick={() => onSelect("Algarve")}
            />
            <text x="130" y="480" fill="white" fontSize="16" fontWeight="bold" pointerEvents="none" textAnchor="middle">Algarve</text>

            {/* Ilhas (Stylized) */}
            <g className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onSelect("Açores")}>
                <rect x="10" y="520" width="80" height="40" rx="5" fill="#6366F1" />
                <text x="50" y="545" fill="white" fontSize="14" textAnchor="middle" pointerEvents="none">Açores</text>
            </g>

            <g className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onSelect("Madeira")}>
                <rect x="210" y="520" width="80" height="40" rx="5" fill="#8B5CF6" />
                <text x="250" y="545" fill="white" fontSize="14" textAnchor="middle" pointerEvents="none">Madeira</text>
            </g>
        </svg>
    );
};

export const WeatherStudio: React.FC<WeatherStudioProps> = ({ onClose, personalApiKey }) => {
    const [location, setLocation] = useState('');
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    
    // Navigation State
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

    const handleSearch = async (loc: string = location) => {
        if (!loc.trim()) {
            setError("Por favor, escreva o nome da terra ou selecione no mapa.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setWeatherData(null);
        setSelectedDayIndex(0);
        setLastUpdated(null);
        
        // Update input if searching via map click
        if (loc !== location) setLocation(loc);

        try {
            // Ensure we are searching in Portugal for context
            const searchQuery = loc.toLowerCase().includes('portugal') ? loc : `${loc}, Portugal`;
            
            const data = await getWeatherForecast(searchQuery, personalApiKey);
            setWeatherData(data);
            
            const now = new Date();
            setLastUpdated(now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }));
        } catch (e: any) {
            setError(e.message || "Não foi possível obter a previsão do tempo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegionSelect = (region: string) => {
        setSelectedRegion(region);
    };

    const handleDistrictSelect = (district: string) => {
        handleSearch(district);
    };

    const handleBackToMap = () => {
        setSelectedRegion(null);
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar Estúdio de Meteorologia"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="mb-6 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="text-4xl">🌦️</span>
                    <h2 className="text-3xl font-bold text-white">O Tempo à Antiga</h2>
                </div>
                <p className="text-gray-400 mt-2">
                    Previsões simples e diretas. Escolha a região e o distrito para saber se vai chover ou fazer sol na sua terra.
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 min-h-0 flex-grow">
                {/* Left Panel: Search & Navigation */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    {/* Search Bar */}
                    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 space-y-4">
                        <label className="block text-lg font-semibold text-gray-300">Pesquisa Rápida</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Ex: Covilhã, Portimão, Sintra..."
                                className="flex-grow p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                            />
                            <button 
                                onClick={() => handleSearch()}
                                disabled={isLoading}
                                className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-600 transition-colors"
                            >
                                {isLoading ? <Spinner size="sm" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">Escreva o concelho exato para maior precisão, ou navegue pelo mapa abaixo.</p>
                    </div>

                    {/* Navigation Area (Map or Districts) */}
                    <div className="flex-grow bg-gray-800/30 rounded-xl border border-gray-700 p-4 flex flex-col relative overflow-hidden">
                        {!selectedRegion ? (
                            // VIEW 1: MAP
                            <>
                                <h3 className="text-center text-gray-400 text-sm mb-2 font-medium">Selecione a Região</h3>
                                <div className="flex-grow flex items-center justify-center">
                                    <PortugalMap onSelect={handleRegionSelect} />
                                </div>
                            </>
                        ) : (
                            // VIEW 2: DISTRICTS LIST
                            <div className="flex flex-col h-full animate-fade-in">
                                <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
                                    <h3 className="font-bold text-xl text-white">{selectedRegion}</h3>
                                    <button 
                                        onClick={handleBackToMap}
                                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                        Voltar ao Mapa
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2">
                                    {PORTUGAL_DATA[selectedRegion]?.map((district) => (
                                        <button
                                            key={district}
                                            onClick={() => handleDistrictSelect(district)}
                                            className="p-4 bg-gray-700/50 hover:bg-blue-600 hover:text-white rounded-lg transition-all text-left text-gray-300 text-sm font-medium flex items-center justify-between group"
                                        >
                                            {district}
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-auto pt-4 text-center">
                                    <p className="text-xs text-gray-500 italic">Selecione o distrito para ver a previsão da capital.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Forecast */}
                <div className="w-full lg:w-2/3 bg-gradient-to-br from-blue-900/40 to-gray-900/40 rounded-xl border border-blue-800/30 p-6 overflow-y-auto h-[600px] lg:h-auto">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-blue-300">
                            <Spinner size="lg" />
                            <p className="mt-4 text-lg animate-pulse">A consultar os satélites...</p>
                        </div>
                    ) : weatherData ? (
                        <div className="space-y-8 animate-fade-in">
                            {/* Current Weather Card */}
                            <div className="bg-blue-600/20 border border-blue-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative">
                                {lastUpdated && (
                                    <span className="absolute top-4 right-4 text-xs text-blue-200 opacity-60">
                                        Atualizado às {lastUpdated}
                                    </span>
                                )}
                                <div className="text-center md:text-left">
                                    <h3 className="text-xl text-blue-200 font-semibold mb-1">Agora mesmo</h3>
                                    <div className="text-6xl font-bold text-white">{weatherData.current.temp}</div>
                                    <p className="text-blue-100 text-lg mt-2">{weatherData.current.condition}</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-8xl drop-shadow-lg">{getIcon(weatherData.current.icon || weatherData.current.condition)}</div>
                                </div>
                                <div className="bg-blue-900/40 p-4 rounded-xl max-w-xs border border-blue-700/30">
                                    <p className="text-gray-200 italic">"{weatherData.current.description}"</p>
                                </div>
                            </div>

                            {/* Daily Selection */}
                            <div>
                                <h4 className="text-gray-300 font-semibold mb-3">Próximos Dias</h4>
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800">
                                    {weatherData.forecast.map((day, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedDayIndex(i)}
                                            className={`flex-shrink-0 p-4 rounded-xl border transition-all min-w-[140px] text-center ${
                                                selectedDayIndex === i 
                                                ? 'bg-blue-600 text-white border-blue-400 shadow-lg scale-105' 
                                                : 'bg-gray-800/40 text-gray-300 border-gray-700 hover:bg-gray-700'
                                            }`}
                                        >
                                            <p className="font-bold text-sm mb-1">{day.date}</p>
                                            <div className="text-sm space-x-2 mb-2">
                                                <span className="text-blue-300">{day.min}</span>
                                                <span className="text-gray-400">/</span>
                                                <span className="text-orange-300">{day.max}</span>
                                            </div>
                                            <p className="text-xs truncate opacity-80 border-t border-white/10 pt-2">{day.summary}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Hourly Forecast for Selected Day */}
                            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-6">
                                <h4 className="text-gray-200 font-semibold mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Previsão Horária para {weatherData.forecast[selectedDayIndex].date}
                                </h4>
                                
                                {weatherData.forecast[selectedDayIndex].hourly.length > 0 ? (
                                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800">
                                        {weatherData.forecast[selectedDayIndex].hourly.map((hour, i) => (
                                            <div key={i} className="flex-shrink-0 bg-gray-800 p-4 rounded-lg border border-gray-700 min-w-[100px] text-center flex flex-col gap-2 shadow-md">
                                                <span className="text-sm text-gray-400 font-mono">{hour.time}</span>
                                                <span className="text-3xl my-2">{getIcon(hour.condition)}</span>
                                                <span className="font-bold text-white text-lg">{hour.temp}</span>
                                                <span className="text-xs text-gray-400 truncate max-w-[90px] mx-auto" title={hour.condition}>{hour.condition}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-4">Sem dados horários detalhados para este dia.</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <div className="text-7xl mb-4 opacity-20">🌍</div>
                            <p className="text-xl font-semibold">Sem dados para mostrar</p>
                            <p className="text-sm mt-2">Navegue pelo mapa ou pesquise uma localidade.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
