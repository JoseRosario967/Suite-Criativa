
import React, { useState } from 'react';
import { generateAnatomyGuide, generateOrEditImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Watermark, UploadedImage } from '../types';

interface AnatomyStudioProps {
    onClose: () => void;
    personalApiKey: string;
    activeWatermark?: Watermark | null;
    isWatermarkEnabled?: boolean;
}

const BODY_SYSTEMS = [
    'Geral', 
    'Esquelético (Ossos)', 'Muscular', 'Nervoso', 'Cardiovascular', 
    'Respiratório', 'Digestivo', 'Endócrino', 'Linfático/Imunitário',
    'Urinário', 'Reprodutor', 'Tegumentar (Pele)'
];

const MODES = [
    { id: 'explorer', label: 'Explorador Anatómico' },
    { id: 'condition', label: 'Patologias/Condições' }
];

const fileToUploadedImage = (file: File): Promise<UploadedImage> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve({ id: crypto.randomUUID(), dataUrl, base64, mimeType: file.type });
        };
        reader.onerror = (error) => reject(error);
    });
};

export const AnatomyStudio: React.FC<AnatomyStudioProps> = ({ onClose, personalApiKey, activeWatermark, isWatermarkEnabled }) => {
    const [topic, setTopic] = useState('');
    const [system, setSystem] = useState(BODY_SYSTEMS[0]);
    const [mode, setMode] = useState<'explorer' | 'condition'>('explorer');
    
    // New: Uploaded Image State
    const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
    
    const [result, setResult] = useState<{
        title: string;
        description: string;
        function: string;
        location: string;
        keyFacts: string[];
        trivia: string;
    } | null>(null);
    
    const [visualUrl, setVisualUrl] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const img = await fileToUploadedImage(file);
                setUploadedImage(img);
                setMode('condition'); // Auto-switch to condition/pathology mode if image uploaded
                setError(null);
            } catch (err) {
                setError("Falha ao carregar a imagem.");
            }
        }
        if (event.currentTarget) event.currentTarget.value = '';
    };

    const handleConsult = async () => {
        // If image is uploaded, topic is optional (can describe symptom), otherwise required
        if (!topic.trim() && !uploadedImage) {
            setError("Por favor, introduza um órgão, osso ou condição.");
            return;
        }

        setIsLoading(true);
        setIsImageLoading(false);
        setError(null);
        setResult(null);
        setVisualUrl(null);

        try {
            // 1. Get Report (Pass image if exists)
            const guide = await generateAnatomyGuide(
                topic || "Sintoma visível", 
                system, 
                mode, 
                uploadedImage ? { base64: uploadedImage.base64, mimeType: uploadedImage.mimeType } : undefined,
                personalApiKey
            );
            
            setResult(guide);
            setIsLoading(false); // Text is ready

            // 2. Get Visual 
            // If user uploaded an image, we show THAT image. If not, we generate one.
            if (uploadedImage) {
                setVisualUrl(uploadedImage.dataUrl);
            } else {
                setIsImageLoading(true);
                try {
                    // Try High Quality first with "Illustration" keyword to avoid safety filters on realistic gore
                    const promptHQ = mode === 'explorer' 
                        ? `Detailed medical illustration of human ${guide.title} (${topic}). Educational textbook style, clean white background, anatomically correct, 8k resolution, scientific diagram.`
                        : `Medical illustration of condition: ${guide.title} (${topic}). Scientific educational diagram, clean style, highlighted pathology, white background.`;
                    
                    const img = await generateOrEditImage(promptHQ, undefined, { quality: 'high', aspectRatio: '4:3' }, personalApiKey);
                    setVisualUrl(img);
                } catch (hqError) {
                    console.warn("HQ Image generation failed, trying standard...", hqError);
                    try {
                        // Fallback to Standard Quality if HQ fails
                        const promptStd = `Anatomy vector illustration: ${guide.title}. Educational, simple, clean white background.`;
                        const imgStd = await generateOrEditImage(promptStd, undefined, { quality: 'standard', aspectRatio: '4:3' }, personalApiKey);
                        setVisualUrl(imgStd);
                    } catch (stdError) {
                        console.error("Standard Image generation failed", stdError);
                    }
                } finally {
                    setIsImageLoading(false);
                }
            }

        } catch (e: any) {
            setError(e.message || "Erro ao consultar o Estúdio Biodigital.");
            setIsLoading(false);
        }
    };

    const handleSavePDF = async () => {
        const element = document.getElementById('anatomy-report-content');
        if (!element) return;

        setIsPdfGenerating(true);

        try {
            const clone = element.cloneNode(true) as HTMLElement;
            
            // PDF Styling - Force A4 White Paper look
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '794px'; // A4 width at 96 DPI
            clone.style.minHeight = '1123px';
            clone.style.padding = '40px';
            clone.style.backgroundColor = '#ffffff'; 
            clone.style.color = '#0f172a'; // Slate-900
            clone.style.fontFamily = 'Arial, sans-serif';

            // --- CRITICAL: Color Correction Loop for PDF ---
            const allElements = clone.querySelectorAll('*');
            allElements.forEach((el) => {
                if (el instanceof HTMLElement) {
                    const cls = el.classList;
                    
                    // Reset standard borders/shadows for print
                    el.style.borderColor = '#cbd5e1'; 
                    el.style.boxShadow = 'none';
                    
                    // BACKGROUNDS: Dark -> Light
                    if (cls.contains('bg-slate-800') || cls.contains('bg-slate-800/50') || cls.contains('bg-slate-800/30')) {
                        el.style.backgroundColor = '#f1f5f9'; // Slate-100
                        el.style.border = '1px solid #cbd5e1';
                        el.style.setProperty('background-color', '#f1f5f9', 'important');
                    }
                    if (cls.contains('bg-slate-900') || cls.contains('bg-slate-900/30')) {
                         el.style.backgroundColor = '#ffffff';
                         if (el.id === 'anatomy-report-content') {
                             el.style.backgroundColor = '#ffffff';
                         }
                    }
                    
                    // SPECIAL GRADIENTS
                    if (cls.contains('bg-gradient-to-r')) {
                        el.style.background = '#e0f2fe'; // Light blue solid
                        el.style.border = '1px solid #bae6fd';
                    }

                    // TEXT COLORS: Light -> Dark
                    if (['H1', 'H2', 'H3', 'H4', 'H5'].includes(el.tagName)) {
                        if (el.tagName === 'H1') el.style.color = '#0f172a';
                        else el.style.color = '#0891b2'; 
                    }
                    
                    if (['P', 'LI', 'SPAN', 'DIV'].includes(el.tagName)) {
                        if (cls.contains('text-white') || cls.contains('text-slate-100') || cls.contains('text-slate-200')) {
                            el.style.color = '#0f172a';
                        }
                        if (cls.contains('text-slate-300') || cls.contains('text-slate-400') || cls.contains('text-gray-300') || cls.contains('text-gray-400')) {
                            el.style.color = '#334155';
                        }
                        if (cls.contains('text-cyan-200') || cls.contains('text-cyan-100')) {
                             el.style.color = '#0e7490';
                        }
                        if (cls.contains('text-cyan-400') || cls.contains('text-cyan-300')) {
                            el.style.color = '#0891b2';
                        }
                    }
                }
            });

            const footer = document.createElement('div');
            footer.style.textAlign = 'center';
            footer.style.fontSize = '10px';
            footer.style.color = '#94a3b8';
            footer.style.marginTop = '40px';
            footer.style.borderTop = '1px solid #e2e8f0';
            footer.style.paddingTop = '10px';
            footer.innerText = `Gerado por Estúdio Biodigital AI - ${new Date().toLocaleDateString()}`;
            clone.appendChild(footer);

            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#ffffff' 
            });
            document.body.removeChild(clone);

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            const pageHeight = 295;

            let pageIndex = 0;
            while (heightLeft > 0) {
                if (pageIndex > 0) {
                    pdf.addPage();
                    position = 0 - (pageIndex * pageHeight);
                }
                
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                
                if (isWatermarkEnabled && activeWatermark) {
                    const wmWidth = 40;
                    const wmHeight = (40 * activeWatermark.scale) / 0.2;
                    const wmX = 210 - wmWidth - 10;
                    const wmY = 297 - wmHeight - 10;
                    
                    try {
                        pdf.saveGraphicsState();
                        pdf.setGState(new (pdf as any).GState({ opacity: activeWatermark.opacity }));
                        pdf.addImage(activeWatermark.dataUrl, 'PNG', wmX, wmY, wmWidth, wmHeight);
                        pdf.restoreGraphicsState();
                    } catch (e) {
                        console.warn("Could not add watermark to PDF layer", e);
                    }
                }

                heightLeft -= pageHeight;
                pageIndex++;
                if (pageIndex > 10) break;
            }
            
            const safeTitle = result?.title.replace(/[^a-z0-9]/gi, '_') || 'Relatorio';
            pdf.save(`Biodigital_${safeTitle}.pdf`);

        } catch (err) {
            console.error("PDF Error", err);
            setError("Erro ao gerar PDF.");
        } finally {
            setIsPdfGenerating(false);
        }
    };

    const handleClearImage = () => {
        setUploadedImage(null);
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <button onClick={onClose} className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white print:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="mb-6 text-center md:text-left print:hidden">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="text-4xl">🧬</span>
                    <h2 className="text-3xl font-bold text-white">Estúdio Biodigital</h2>
                </div>
                <p className="text-cyan-200/70 mt-2">
                    Visualização anatómica e relatórios de saúde avançados por IA. Explore o corpo humano ou analise sintomas visuais.
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 min-h-0">
                {/* Controls */}
                <div className="w-full lg:w-1/3 bg-slate-800/50 p-6 rounded-xl border border-slate-700 h-fit space-y-6 print:hidden">
                    <div className="p-1 bg-slate-900 rounded-lg flex gap-1">
                        {MODES.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id as any)}
                                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === m.id ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cyan-100 mb-2">Sistema do Corpo</label>
                        <select value={system} onChange={e => setSystem(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500">
                            {BODY_SYSTEMS.map(sys => <option key={sys} value={sys}>{sys}</option>)}
                        </select>
                    </div>

                    {/* Image Upload Area */}
                    <div>
                        <label className="block text-sm font-medium text-cyan-100 mb-2">
                            Analisar Foto (Opcional)
                        </label>
                        {uploadedImage ? (
                            <div className="relative w-full h-32 bg-slate-900 rounded-lg border border-cyan-500 flex items-center justify-center overflow-hidden group">
                                <img src={uploadedImage.dataUrl} alt="Upload" className="h-full object-contain" />
                                <button 
                                    onClick={handleClearImage}
                                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                    Modo Análise Ativo
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg bg-slate-900 hover:border-cyan-500 cursor-pointer transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-xs text-slate-400">Carregar foto de sintoma</span>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cyan-100 mb-2">
                            {uploadedImage ? 'Descreva o sintoma (Opcional)' : (mode === 'explorer' ? 'Órgão / Estrutura' : 'Condição / Patologia')}
                        </label>
                        <input 
                            type="text" 
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder={uploadedImage ? "Ex: Borbulhas, Mancha vermelha..." : (mode === 'explorer' ? "Ex: Coração, Fémur..." : "Ex: Gripe, Artrite...")}
                            className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>

                    <button 
                        onClick={handleConsult}
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner size="sm" className="text-white" /> A analisar...</div> : (uploadedImage ? 'Analisar Sintomas' : 'Gerar Relatório')}
                    </button>
                </div>

                {/* Results */}
                <div className="w-full lg:w-2/3 bg-slate-900/30 rounded-xl border border-slate-700 overflow-hidden flex flex-col min-h-[500px]">
                    {isLoading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-cyan-400/50 p-10">
                            <Spinner size="lg" className="text-cyan-500" />
                            <p className="mt-4 text-xl font-semibold animate-pulse">
                                {uploadedImage ? 'A Dra. AI está a analisar a imagem...' : 'A renderizar modelo biológico...'}
                            </p>
                        </div>
                    ) : result ? (
                        <div className="flex flex-col h-full">
                            <div className="flex justify-end p-4 border-b border-slate-700 print:hidden">
                                <button onClick={handleSavePDF} disabled={isPdfGenerating} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-cyan-300 rounded-lg hover:bg-slate-600 transition-colors">
                                    {isPdfGenerating ? <Spinner size="sm" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                    Exportar PDF
                                </button>
                            </div>

                            <div id="anatomy-report-content" className="p-8 overflow-y-auto space-y-8 bg-slate-900">
                                {/* Header & Image */}
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    <div className="w-full md:w-1/2 aspect-[4/3] bg-black rounded-lg overflow-hidden border border-slate-600 relative">
                                        {visualUrl ? (
                                            <img src={visualUrl} alt={result.title} className="w-full h-full object-contain" crossOrigin="anonymous" />
                                        ) : isImageLoading ? (
                                            <div className="w-full h-full flex items-center justify-center"><Spinner className="text-cyan-500" /></div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                <div className="text-center p-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    <p>Imagem indisponível</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4">
                                            <span className="text-xs text-cyan-400 font-mono uppercase tracking-widest">
                                                {uploadedImage ? 'Fig. 1.0 - Imagem do Paciente' : 'Fig. 1.0 - Visualização AI'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-1/2">
                                        <h1 className="text-4xl font-bold text-white mb-2">{result.title}</h1>
                                        <span className="inline-block px-3 py-1 bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 rounded-full text-sm font-medium mb-4">
                                            {system}
                                        </span>
                                        <p className="text-lg text-slate-300 leading-relaxed border-l-4 border-cyan-500 pl-4">
                                            {result.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                                        <h3 className="text-xl font-bold text-cyan-400 mb-3 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                            {uploadedImage ? 'Fisiopatologia / Mecanismo' : 'Função / Fisiologia'}
                                        </h3>
                                        <p className="text-slate-300 leading-relaxed">{result.function}</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                                        <h3 className="text-xl font-bold text-cyan-400 mb-3 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            Localização / Área Afetada
                                        </h3>
                                        <p className="text-slate-300 leading-relaxed">{result.location}</p>
                                    </div>
                                </div>

                                {/* Facts / Causes */}
                                <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700">
                                    <h3 className="text-lg font-bold text-white mb-4">
                                        {uploadedImage ? 'Possíveis Causas / Fatores de Risco' : 'Pontos Chave'}
                                    </h3>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {result.keyFacts.map((fact, i) => (
                                            <li key={i} className="flex items-start gap-3 text-slate-300">
                                                <span className="mt-1.5 w-2 h-2 rounded-full bg-cyan-500 shrink-0"></span>
                                                {fact}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Trivia / Recommendations */}
                                <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-4 rounded-lg border border-cyan-500/20 flex gap-4 items-start">
                                    <span className="text-2xl">
                                        {uploadedImage ? '🩺' : '💡'}
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-cyan-300 text-sm uppercase mb-1">
                                            {uploadedImage ? 'Recomendações / Primeiros Socorros' : 'Sabia que?'}
                                        </h4>
                                        <p className="text-slate-300 italic text-sm">{result.trivia}</p>
                                    </div>
                                </div>
                                
                                <div className="text-center text-xs text-slate-600 mt-8 pt-4 border-t border-slate-800">
                                    AVISO: Informação gerada por IA para fins educativos. Não substitui aconselhamento médico profissional.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 p-10">
                            <div className="text-6xl mb-4 opacity-20">🩻</div>
                            <p className="text-xl font-semibold">Laboratório pronto</p>
                            <p className="text-sm mt-2">Escolha um sistema, tópico ou carregue uma foto para começar.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
