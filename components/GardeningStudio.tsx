
import React, { useState } from 'react';
import { generateGardeningAdvice, generateOrEditImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Watermark } from '../types';

interface GardeningStudioProps {
    onClose: () => void;
    personalApiKey: string;
    activeWatermark?: Watermark | null;
    isWatermarkEnabled?: boolean;
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const REGIONS = [
    'Norte', 'Centro', 'Sul (Alentejo/Algarve)', 'Açores', 'Madeira'
];

const MODES = [
    { id: 'cultivate', label: 'Novas Culturas' },
    { id: 'maintain', label: 'Manutenção' },
    { id: 'guide', label: 'Pesquisar Cultura' },
    { id: 'treatment', label: 'Preparar Tratamento' }
];

const CULTIVATE_ACTIONS = [
    'Semear (Sementes)', 'Plantar (Mudas)'
];

const CROP_CATEGORIES = [
    'Hortaliças', 'Leguminosas', 'Raízes e Tubérculos', 'Cereais', 'Frutíferas', 'Ervas Aromáticas', 'Flores Comestíveis'
];

const MAINTENANCE_TYPES = [
    'Podas', 'Limpeza da Horta', 'Proteção (Frio/Calor/Estufas)', 'Fertilização (Lenta/Rápida)', 'Rega', 'Controlo de Pragas'
];

export const GardeningStudio: React.FC<GardeningStudioProps> = ({ onClose, personalApiKey, activeWatermark, isWatermarkEnabled }) => {
    const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
    const [region, setRegion] = useState('Centro');
    const [mode, setMode] = useState<'cultivate' | 'maintain' | 'guide' | 'treatment'>('cultivate');
    
    // Cultivate State
    const [action, setAction] = useState('Semear (Sementes)');
    const [category, setCategory] = useState('Hortaliças');
    
    // Maintenance State
    const [maintenanceType, setMaintenanceType] = useState('Podas');

    // Guide/Search State & Treatment State (Shared Input)
    const [cropName, setCropName] = useState(''); // Used for crop name or treatment name

    const [specificQuestion, setSpecificQuestion] = useState('');
    
    const [result, setResult] = useState<{ 
        generalTips: string; 
        crops?: any[]; 
        maintenanceTasks?: any[];
        cropGuide?: any;
        treatmentGuide?: any;
    } | null>(null);
    
    // New State for Crop Image
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [isImageLoading, setIsImageLoading] = useState(false);
    
    const [selectedItem, setSelectedItem] = useState<any | null>(null); // Shared for crops or tasks details
    const [isLoading, setIsLoading] = useState(false);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConsult = async () => {
        if ((mode === 'guide' || mode === 'treatment') && !cropName.trim()) {
            setError(mode === 'guide' ? "Por favor, escreva o nome da cultura." : "Por favor, escreva o nome do tratamento.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        setSelectedItem(null);
        setCropImage(null); // Reset image
        
        try {
            const advice = await generateGardeningAdvice(
                month, 
                region, 
                mode,
                {
                    action: mode === 'cultivate' ? action : undefined,
                    category: mode === 'cultivate' ? category : undefined,
                    maintenanceType: mode === 'maintain' ? maintenanceType : undefined
                },
                (mode === 'guide' || mode === 'treatment') ? cropName : specificQuestion, 
                personalApiKey
            );
            setResult(advice);

            // If in guide mode, generate the image
            if (mode === 'guide' && advice.cropGuide) {
                setIsImageLoading(true);
                try {
                     const imgPrompt = `Botanical photography of ${advice.cropGuide.name} (${advice.cropGuide.scientificName}). High resolution, natural lighting, photorealistic, isolated on simple background.`;
                     // Use standard quality and aspect ratio
                     const imgUrl = await generateOrEditImage(imgPrompt, undefined, { aspectRatio: '16:9', quality: 'high' }, personalApiKey);
                     setCropImage(imgUrl);
                } catch(imgErr) {
                    console.error("Failed to generate plant image", imgErr);
                } finally {
                    setIsImageLoading(false);
                }
            }

        } catch (e: any) {
            setError(e.message || "Erro ao consultar o oráculo da horta.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePDF = async () => {
        const element = document.getElementById('gardening-guide-content');
        if (!element) return; // Only proceed if content area exists

        setIsPdfGenerating(true);

        try {
            // Create a clone for PDF rendering
            const clone = element.cloneNode(true) as HTMLElement;
            
            // Style for A4 paper
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '794px'; // A4 width at 96 DPI
            clone.style.minHeight = '1123px';
            clone.style.padding = '40px';
            clone.style.backgroundColor = 'white';
            clone.style.color = '#1a1a1a';
            clone.style.fontFamily = 'sans-serif';

            // Inject Watermark if enabled
            if (isWatermarkEnabled && activeWatermark) {
                const watermarkImg = document.createElement('img');
                watermarkImg.src = activeWatermark.dataUrl;
                watermarkImg.style.position = 'absolute';
                watermarkImg.style.bottom = '20px';
                watermarkImg.style.right = '20px';
                watermarkImg.style.width = '80px'; // Fixed width for PDF
                watermarkImg.style.opacity = '0.8';
                watermarkImg.style.zIndex = '1000';
                clone.appendChild(watermarkImg);
            }

            // Inject Agronomist Tips as Footer if they exist and we aren't in treatment mode (which has its own format)
            if (result?.generalTips && mode !== 'treatment') {
                const footerDiv = document.createElement('div');
                footerDiv.style.marginTop = '40px';
                footerDiv.style.padding = '20px';
                footerDiv.style.backgroundColor = '#f0fdf4'; // green-50
                footerDiv.style.border = '1px solid #bbf7d0'; // green-200
                footerDiv.style.borderRadius = '8px';
                footerDiv.style.color = '#14532d'; // green-900
                // Force page break avoidance inside this block
                footerDiv.style.breakInside = 'avoid'; 
                footerDiv.style.pageBreakInside = 'avoid';
                
                const footerTitle = document.createElement('h3');
                footerTitle.innerText = '💡 Conselhos do Agrónomo';
                footerTitle.style.fontWeight = 'bold';
                footerTitle.style.marginBottom = '10px';
                footerTitle.style.fontSize = '18px';
                
                const footerText = document.createElement('p');
                footerText.innerText = result.generalTips;
                footerText.style.fontSize = '14px';
                footerText.style.lineHeight = '1.5';

                footerDiv.appendChild(footerTitle);
                footerDiv.appendChild(footerText);
                clone.appendChild(footerDiv);
            }

            // Inject Branding Footer
            const brandFooter = document.createElement('div');
            brandFooter.style.marginTop = '20px';
            brandFooter.style.textAlign = 'center';
            brandFooter.style.fontSize = '10px';
            brandFooter.style.color = '#9ca3af';
            brandFooter.style.borderTop = '1px solid #e5e7eb';
            brandFooter.style.paddingTop = '10px';
            brandFooter.innerText = `Gerado por Suite Criativa AI - ${new Date().toLocaleDateString()}`;
            clone.appendChild(brandFooter);


            // Force light theme styles on the clone and correct colors
            const allElements = clone.querySelectorAll('*');
            allElements.forEach((el) => {
                if (el instanceof HTMLElement) {
                    el.style.borderColor = '#e5e7eb'; // Light borders
                    el.style.boxShadow = 'none';
                    
                    // Force page break rules on common containers
                    if (el.tagName === 'DIV' || el.tagName === 'P' || el.tagName === 'UL') {
                         // Try to avoid breaking inside elements if possible
                         el.style.breakInside = 'avoid';
                         el.style.pageBreakInside = 'avoid';
                    }
                    
                    // Special handling for Header Text inside Overlay
                    if (el.classList.contains('header-overlay-text') || el.closest('.header-overlay-text')) {
                        el.style.color = '#ffffff'; // Keep white on dark image
                        el.style.textShadow = '0 2px 8px rgba(0,0,0,0.9)'; // Stronger shadow for readability
                    } else {
                         el.style.color = '#1a1a1a'; // Black text for body
                    }
                    
                    // Remove dark background classes and apply light ones
                    if (el.classList.contains('bg-gray-800')) {
                        el.style.backgroundColor = '#ffffff';
                        el.style.border = '1px solid #e5e7eb';
                    }
                    if (el.classList.contains('bg-gray-900/50')) {
                        el.style.backgroundColor = '#f3f4f6'; // Light gray
                    }
                     if (el.classList.contains('bg-gray-900/30')) {
                        el.style.backgroundColor = '#ffffff'; // Light gray
                    }
                    // Specific treatment for Treatment Mode containers
                    if (el.classList.contains('bg-teal-900/10')) {
                        el.style.backgroundColor = '#f0fdfa'; // teal-50
                        el.style.borderColor = '#ccfbf1'; // teal-200
                        el.style.color = '#134e4a'; // teal-900
                    }

                    // List items
                    if (el.tagName === 'LI') {
                        el.style.color = '#374151';
                    }
                }
            });

            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, {
                scale: 2,
                backgroundColor: '#ffffff',
                windowWidth: 794,
                useCORS: true // Important for images
            });

            document.body.removeChild(clone);

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const safeName = (result?.cropGuide?.name || result?.treatmentGuide?.name || "Guia").replace(/[^a-z0-9]/gi, '_');
            pdf.save(`Ficha_${safeName}.pdf`);

        } catch (err) {
            console.error("PDF Generation Error:", err);
            setError("Erro ao gerar o ficheiro PDF.");
        } finally {
            setIsPdfGenerating(false);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white print:hidden" 
                aria-label="Fechar Estúdio de Jardinagem"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="mb-6 text-center md:text-left print:hidden">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="text-4xl">🥬</span>
                    <h2 className="text-3xl font-bold text-white">Estúdio de Jardinagem AI</h2>
                </div>
                <p className="text-gray-400 mt-2">
                    O seu "Borda d'Água" digital. Descubra o que plantar, como tratar e quando colher, 100% biológico.
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 min-h-0 relative">
                {/* Left: Controls */}
                <div className="w-full lg:w-1/3 bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex flex-col space-y-6 h-fit print:hidden">
                    
                    {/* Mode Switcher */}
                    <div className="p-1 bg-gray-900 rounded-lg flex flex-wrap gap-1">
                        {MODES.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id as any)}
                                className={`flex-1 py-2 px-1 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${mode === m.id ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {mode === 'cultivate' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Mês</label>
                                <select value={month} onChange={e => setMonth(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white text-sm">
                                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Região</label>
                                <select value={region} onChange={e => setRegion(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white text-sm">
                                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {mode === 'cultivate' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Método</label>
                                <div className="flex space-x-2">
                                    {CULTIVATE_ACTIONS.map(act => (
                                        <button
                                            key={act}
                                            onClick={() => setAction(act)}
                                            className={`flex-1 py-2 px-2 text-xs sm:text-sm rounded-md border transition-colors ${action === act ? 'bg-green-700/50 border-green-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                        >
                                            {act}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Família da Cultura</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white">
                                    {CROP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                    
                    {mode === 'maintain' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Mês</label>
                                    <select value={month} onChange={e => setMonth(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white text-sm">
                                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Região</label>
                                    <select value={region} onChange={e => setRegion(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white text-sm">
                                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Tarefa</label>
                                <select value={maintenanceType} onChange={e => setMaintenanceType(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white">
                                    {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {(mode === 'guide' || mode === 'treatment') && (
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">{mode === 'guide' ? 'Nome da Cultura' : 'Nome do Tratamento'}</label>
                            <input 
                                type="text"
                                value={cropName}
                                onChange={e => setCropName(e.target.value)}
                                placeholder={mode === 'guide' ? "Ex: Favas, Laranjeira, Tomate..." : "Ex: Calda Bordalesa, Chorume de Urtiga..."}
                                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    )}

                    {mode === 'cultivate' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Dúvidas Específicas (Opcional)</label>
                            <textarea 
                                value={specificQuestion}
                                onChange={e => setSpecificQuestion(e.target.value)}
                                placeholder="Ex: Quero plantar batatas mas o solo é argiloso..."
                                className="w-full h-20 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 text-sm focus:ring-green-500 focus:border-green-500 resize-none"
                            />
                        </div>
                    )}

                    <button 
                        onClick={handleConsult} 
                        disabled={isLoading}
                        className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner size="sm" className="text-white" /> A consultar almanaque...</div> : (mode === 'guide' ? 'Pesquisar Guia' : mode === 'treatment' ? 'Gerar Receita' : 'Consultar Horta')}
                    </button>
                </div>

                {/* Right: Results */}
                <div className="w-full lg:w-2/3 bg-gray-900/30 rounded-xl border border-gray-700 overflow-hidden flex flex-col min-h-[500px]">
                    {isLoading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-10">
                            <Spinner size="lg" className="text-green-500" />
                            <p className="mt-4 text-xl font-semibold animate-pulse">A analisar a natureza...</p>
                        </div>
                    ) : result ? (
                        <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
                            {/* General Advice (Show for cultivate/maintain) */}
                            {result.generalTips && mode !== 'treatment' && (
                                <div className="bg-green-900/20 border border-green-800/50 p-4 rounded-lg">
                                    <h3 className="text-xl font-bold text-green-400 mb-2 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Conselhos do Agrónomo
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{result.generalTips}</p>
                                </div>
                            )}

                            {/* TREATMENT GUIDE RESULT (BIO LAB) */}
                            {result.treatmentGuide && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex justify-end print:hidden">
                                        <button 
                                            onClick={handleSavePDF}
                                            disabled={isPdfGenerating}
                                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                        >
                                            {isPdfGenerating ? <Spinner size="sm" className="text-white" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                            {isPdfGenerating ? 'A gerar PDF...' : 'Guardar Receita (PDF)'}
                                        </button>
                                    </div>

                                    <div id="gardening-guide-content" className="bg-gray-900/30 p-6 rounded-xl space-y-6">
                                        <div className="text-center border-b border-gray-700 pb-6">
                                            <div className="flex justify-center mb-4">
                                                <div className="p-4 bg-teal-900/30 rounded-full border-2 border-teal-500/50">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                                </div>
                                            </div>
                                            <h2 className="text-3xl font-bold text-white mb-2">{result.treatmentGuide.name}</h2>
                                            <p className="text-teal-200 text-lg italic">{result.treatmentGuide.description}</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                                                <h4 className="text-teal-400 font-bold mb-3 flex items-center gap-2 text-lg">🧪 Ingredientes</h4>
                                                <ul className="space-y-2">
                                                    {result.treatmentGuide.ingredients.map((ing: string, i: number) => (
                                                        <li key={i} className="flex items-start text-gray-300 text-sm">
                                                            <span className="text-teal-500 mr-2 font-bold">•</span>
                                                            {ing}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                                                <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2 text-lg">🥣 Equipamento</h4>
                                                <ul className="space-y-2">
                                                    {result.treatmentGuide.equipment.map((eq: string, i: number) => (
                                                        <li key={i} className="flex items-start text-gray-300 text-sm">
                                                            <span className="text-blue-500 mr-2 font-bold">•</span>
                                                            {eq}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                            <h4 className="text-amber-400 font-bold mb-4 flex items-center gap-2 text-lg">📝 Preparação Passo-a-Passo</h4>
                                            <ol className="space-y-4">
                                                {result.treatmentGuide.preparation.map((step: string, i: number) => (
                                                    <li key={i} className="flex gap-4">
                                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-900/50 text-amber-400 flex items-center justify-center font-bold text-sm border border-amber-700">{i + 1}</span>
                                                        <p className="text-gray-300 text-sm leading-relaxed pt-0.5">{step}</p>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
                                                <h4 className="text-green-400 font-bold mb-3 flex items-center gap-2 text-lg">🚿 Como Aplicar</h4>
                                                <p className="text-gray-300 text-sm leading-relaxed">{result.treatmentGuide.application}</p>
                                            </div>
                                            <div className="bg-red-900/10 p-5 rounded-xl border border-red-900/30">
                                                <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2 text-lg">⚠️ Precauções</h4>
                                                <p className="text-gray-300 text-sm leading-relaxed">{result.treatmentGuide.precautions}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CROP GUIDE RESULT */}
                            {result.cropGuide && (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Download Button */}
                                    <div className="flex justify-end print:hidden">
                                        <button 
                                            onClick={handleSavePDF}
                                            disabled={isPdfGenerating}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                        >
                                            {isPdfGenerating ? <Spinner size="sm" className="text-white" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                            {isPdfGenerating ? 'A gerar PDF...' : 'Guardar Ficha (PDF)'}
                                        </button>
                                    </div>

                                    {/* Content to Capture */}
                                    <div id="gardening-guide-content" className="space-y-6 bg-gray-900/30 p-6 rounded-xl">
                                        {/* Top Image & Header */}
                                        <div className="relative rounded-xl overflow-hidden mb-6 bg-gray-800 min-h-[200px] break-inside-avoid">
                                            {cropImage ? (
                                                <div className="relative w-full h-64">
                                                    <img src={cropImage} alt={result.cropGuide.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                                    {isWatermarkEnabled && activeWatermark && (
                                                        <img 
                                                            src={activeWatermark.dataUrl} 
                                                            alt="Watermark" 
                                                            className="absolute bottom-2 right-2 w-20 opacity-50 pointer-events-none"
                                                            style={{ 
                                                                opacity: activeWatermark.opacity,
                                                                width: `${activeWatermark.scale * 200}px`
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            ) : isImageLoading ? (
                                                <div className="w-full h-64 flex items-center justify-center">
                                                    <Spinner size="lg" className="text-green-500" />
                                                </div>
                                            ) : (
                                                <div className="w-full h-64 bg-gray-700 flex items-center justify-center text-gray-500">
                                                    <span>Imagem não disponível</span>
                                                </div>
                                            )}
                                            <div className="header-overlay-text absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pt-20">
                                                <h2 className="header-overlay-text text-4xl font-bold text-white drop-shadow-md">{result.cropGuide.name}</h2>
                                                <div className="flex items-center gap-2 text-green-300 mt-1 header-overlay-text">
                                                    <span className="italic font-serif text-lg header-overlay-text">{result.cropGuide.scientificName}</span>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="text-sm bg-green-900/50 px-2 py-0.5 rounded border border-green-700/50 header-overlay-text">{result.cropGuide.origin}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 break-inside-avoid">
                                                <h4 className="text-amber-500 font-bold mb-2 flex items-center gap-2">📅 Calendário</h4>
                                                <p className="text-gray-300 text-sm">{result.cropGuide.season}</p>
                                                <div className="mt-4">
                                                    <h4 className="text-amber-500 font-bold mb-2 flex items-center gap-2">🧺 Colheita</h4>
                                                    <p className="text-gray-300 text-sm">{result.cropGuide.harvest}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4 break-inside-avoid">
                                                <div>
                                                    <h4 className="text-blue-400 font-bold mb-1 flex items-center gap-2">💧 Rega</h4>
                                                    <p className="text-gray-300 text-sm">{result.cropGuide.water}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-yellow-400 font-bold mb-1 flex items-center gap-2">☀️ Sol</h4>
                                                    <p className="text-gray-300 text-sm">{result.cropGuide.sun}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-amber-700 font-bold mb-1 flex items-center gap-2">🟤 Solo</h4>
                                                    <p className="text-gray-300 text-sm">{result.cropGuide.soil}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 break-inside-avoid">
                                            <h4 className="text-red-400 font-bold mb-3 flex items-center gap-2">🩺 Saúde da Planta (Biologia)</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Pragas Comuns</span>
                                                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                                                        {result.cropGuide.pests?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Doenças Comuns</span>
                                                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                                                        {result.cropGuide.diseases?.map((d: string, i: number) => <li key={i}>{d}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-gray-700">
                                                <span className="text-xs font-bold text-green-500 uppercase block mb-1">Tratamentos Recomendados</span>
                                                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                                                    {result.cropGuide.treatments?.map((t: string, i: number) => <li key={i}>{t}</li>)}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid">
                                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                                <h4 className="text-purple-400 font-bold mb-2">✂️ Podas</h4>
                                                <p className="text-gray-300 text-sm">{result.cropGuide.pruning}</p>
                                            </div>
                                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                                <h4 className="text-pink-400 font-bold mb-2">🤝 Consociações</h4>
                                                <p className="text-gray-300 text-sm">{result.cropGuide.companions}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LIST VIEW (Original functionality) */}
                            {(result.crops || result.maintenanceTasks) && (
                                <>
                                    <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                                        {result.crops ? "Culturas Recomendadas" : "Tarefas Recomendadas"} (Clique para detalhes)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {result.crops?.map((crop, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => setSelectedItem({ type: 'crop', data: crop })}
                                                className="bg-gray-800 hover:bg-green-900/30 p-4 rounded-xl border border-gray-700 hover:border-green-500 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer shadow-lg h-full"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-gray-700 group-hover:bg-green-800/50 flex items-center justify-center text-2xl transition-colors">
                                                    🌱
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="font-bold text-lg text-gray-200 group-hover:text-green-400 transition-colors leading-tight">{crop.name}</h4>
                                                    <span className="text-xs text-gray-500 mt-1 block group-hover:text-gray-400">Ver ficha de cultivo</span>
                                                </div>
                                            </button>
                                        ))}

                                        {result.maintenanceTasks?.map((task, idx) => (
                                            <button 
                                                key={idx} 
                                                onClick={() => setSelectedItem({ type: 'task', data: task })}
                                                className="bg-gray-800 hover:bg-amber-900/30 p-4 rounded-xl border border-gray-700 hover:border-amber-500 transition-all flex flex-col items-center justify-center gap-3 group cursor-pointer shadow-lg h-full"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-gray-700 group-hover:bg-amber-800/50 flex items-center justify-center text-2xl transition-colors">
                                                    🛠️
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="font-bold text-lg text-gray-200 group-hover:text-amber-400 transition-colors leading-tight">{task.title}</h4>
                                                    <span className="text-xs text-gray-500 mt-1 block group-hover:text-gray-400">Ver instruções</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-10">
                            <div className="text-6xl mb-4 opacity-20">🥕</div>
                            <p className="text-xl font-semibold">A horta está à espera</p>
                            <p className="text-sm mt-2 text-center max-w-xs">
                                {mode === 'guide' ? "Escreva o nome da planta que quer pesquisar." : mode === 'treatment' ? "Escreva o nome do tratamento que quer preparar." : "Selecione o mês, a região e o que pretende fazer na sua horta."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Modal (Only for list view items) */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedItem(null)}>
                    <div 
                        className="bg-gray-800 border border-green-700/50 rounded-xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 bg-green-900/20 border-b border-green-800/30 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span className="text-3xl">{selectedItem.type === 'crop' ? '🌱' : '🛠️'}</span> 
                                    {selectedItem.type === 'crop' ? selectedItem.data.name : selectedItem.data.title}
                                </h3>
                                <p className="text-green-400 text-sm mt-1 font-medium">
                                    {selectedItem.type === 'crop' ? 'Ficha de Cultivo Biológico' : 'Ficha Técnica de Manutenção'}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-full p-2 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            {selectedItem.type === 'crop' ? (
                                // CROP DETAILS
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            <h4 className="text-amber-500 font-bold mb-2 flex items-center gap-2">🟤 Solo e Terreno</h4>
                                            <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.soil}</p>
                                        </div>
                                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">💧 Necessidades de Rega</h4>
                                            <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.water}</p>
                                        </div>
                                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">☀️ Exposição Solar</h4>
                                            <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.sun}</p>
                                        </div>
                                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            <h4 className="text-green-500 font-bold mb-2 flex items-center gap-2">🌿 Fertilizante Biológico</h4>
                                            <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.fertilizer}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-lg">
                                        <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">🐛 Pragas e Tratamentos (Bio)</h4>
                                        <p className="text-gray-300 text-sm leading-relaxed">{selectedItem.data.pests}</p>
                                    </div>
                                </>
                            ) : (
                                // MAINTENANCE DETAILS
                                <div className="space-y-6">
                                    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                                        <h4 className="text-blue-400 font-bold mb-2 text-lg">O que fazer?</h4>
                                        <p className="text-gray-200 leading-relaxed">{selectedItem.data.description}</p>
                                    </div>
                                    
                                    <div className="bg-amber-900/10 border border-amber-800/30 p-6 rounded-lg">
                                        <h4 className="text-amber-500 font-bold mb-2 text-lg flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            Técnica Recomendada
                                        </h4>
                                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedItem.data.technique}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-gray-700 bg-gray-900/30 flex justify-end">
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};