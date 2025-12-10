
import React, { useState } from 'react';
import { generateElectricalGuide } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ElectricityStudioProps {
    onClose: () => void;
    personalApiKey: string;
}

export const ElectricityStudio: React.FC<ElectricityStudioProps> = ({ onClose, personalApiKey }) => {
    const [request, setRequest] = useState('');
    const [guide, setGuide] = useState<{ warning: string; materials: string[]; steps: string[]; svgDiagram: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!request.trim()) {
            setError("Por favor, descreva o que pretende instalar ou ligar.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGuide(null);

        try {
            const result = await generateElectricalGuide(request, personalApiKey);
            setGuide(result);
        } catch (e: any) {
            setError(e.message || "Erro ao gerar o guia elétrico.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!guide) return;
        
        setIsPdfGenerating(true);
        
        try {
            // STRATEGY: Create a clean, detached DOM element for PDF generation
            // This ensures we have a pure white background and black text regardless of app theme
            const pdfContainer = document.createElement('div');
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.left = '-9999px';
            pdfContainer.style.top = '0';
            pdfContainer.style.width = '794px'; // A4 Width in px (96 DPI)
            pdfContainer.style.backgroundColor = '#ffffff';
            pdfContainer.style.color = '#000000';
            pdfContainer.style.fontFamily = 'Arial, sans-serif';
            pdfContainer.style.padding = '40px';
            pdfContainer.style.zIndex = '99999';

            // Manually construct the HTML for the PDF to ensure styling control
            pdfContainer.innerHTML = `
                <div style="border-bottom: 2px solid #ca8a04; padding-bottom: 20px; margin-bottom: 30px;">
                    <h1 style="color: #000000; font-size: 24px; margin: 0;">Guia de Instalação: ${request}</h1>
                    <p style="color: #666666; font-size: 12px; margin-top: 5px;">Gerado por Suite Criativa AI - Mestre Volts</p>
                </div>

                <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
                    <h3 style="color: #dc2626; font-weight: bold; margin-top: 0;">⚠️ AVISO DE SEGURANÇA CRÍTICO</h3>
                    <p style="color: #7f1d1d; margin-bottom: 0;">${guide.warning}</p>
                </div>

                <div style="margin-bottom: 30px; text-align: center;">
                    <h3 style="color: #000000; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px;">Esquema de Ligação</h3>
                    <div style="background-color: #ffffff; border: 1px solid #d1d5db; padding: 20px; display: inline-block; border-radius: 8px;">
                        ${guide.svgDiagram}
                    </div>
                </div>

                <div style="display: flex; gap: 30px; margin-bottom: 30px;">
                    <div style="flex: 1;">
                        <h3 style="color: #2563eb; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">🛠️ Material</h3>
                        <ul style="list-style-type: disc; padding-left: 20px; color: #000000;">
                            ${guide.materials.map(m => `<li style="margin-bottom: 5px;">${m}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="flex: 1;">
                        <h3 style="color: #16a34a; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">📝 Passo a Passo</h3>
                        <ol style="padding-left: 20px; color: #000000;">
                            ${guide.steps.map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
                        </ol>
                    </div>
                </div>
                
                <div style="text-align: center; font-size: 10px; color: #9ca3af; margin-top: 50px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
                    Este guia é gerado por IA. Consulte sempre um eletricista certificado para validação.
                </div>
            `;

            document.body.appendChild(pdfContainer);

            // CRITICAL: Force SVG colors to be print-friendly (Black/Colors on White)
            // The original SVG might be designed for dark mode (white lines), which vanish on white paper.
            const svgsText = pdfContainer.querySelectorAll('text');
            svgsText.forEach(text => {
                (text as SVGElement).style.fill = '#000000';
                text.setAttribute('fill', '#000000');
            });

            const svgShapes = pdfContainer.querySelectorAll('path, circle, rect, line, polyline, polygon');
            svgShapes.forEach(shape => {
                const el = shape as SVGElement;
                const stroke = shape.getAttribute('stroke') || el.style.stroke;
                // If stroke is white/light, make it black
                if (!stroke || stroke === 'white' || stroke === '#ffffff' || stroke === '#fff' || stroke.includes('255, 255, 255')) {
                    shape.setAttribute('stroke', '#000000');
                    el.style.stroke = '#000000';
                }
                // Ensure stroke width is visible
                if (!shape.getAttribute('stroke-width')) {
                    shape.setAttribute('stroke-width', '2');
                }
            });

            const canvas = await html2canvas(pdfContainer, { 
                scale: 2, 
                backgroundColor: '#ffffff',
                logging: false
            });
            
            document.body.removeChild(pdfContainer);

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            const pageHeight = 295;

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save('Guia_Eletrico_MestreVolts.pdf');
        } catch (err) {
            console.error(err);
            setError("Erro ao gerar PDF.");
        } finally {
            setIsPdfGenerating(false);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <button onClick={onClose} className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>

            <div className="mb-6 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="text-4xl">⚡</span>
                    <h2 className="text-3xl font-bold text-white">Estúdio Mestre Volts</h2>
                </div>
                <p className="text-gray-400 mt-2">O seu assistente para instalações elétricas. Segurança e esquemas técnicos num piscar de olhos.</p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 min-h-0">
                <div className="w-full lg:w-1/3 bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-fit">
                    <label className="block text-lg font-semibold text-gray-300 mb-2">O que vamos ligar hoje?</label>
                    <textarea 
                        value={request}
                        onChange={(e) => setRequest(e.target.value)}
                        placeholder="Ex: Ligar uma lâmpada com dois interruptores (escada) no corredor."
                        className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-lg text-white resize-none focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full mt-4 py-3 bg-yellow-600 text-white font-bold rounded-lg shadow-lg hover:bg-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner size="sm" /> A desenhar esquema...</div> : 'Gerar Guia e Esquema'}
                    </button>
                </div>

                <div className="w-full lg:w-2/3 bg-gray-900/30 rounded-xl border border-gray-700 overflow-y-auto p-6">
                    {guide ? (
                        <div id="electrical-guide-content" className="space-y-8 p-4 bg-gray-800 rounded-lg text-gray-200">
                            <div className="bg-red-900/30 border border-red-700 p-4 rounded-lg flex items-start gap-3">
                                <span className="text-3xl">⚠️</span>
                                <div>
                                    <h3 className="font-bold text-red-400 text-lg">AVISO DE SEGURANÇA</h3>
                                    <p className="text-red-200 text-sm">{guide.warning}</p>
                                </div>
                            </div>

                            <div className="bg-gray-900 p-4 rounded-lg border border-gray-600 flex flex-col items-center">
                                <h3 className="font-bold text-yellow-500 mb-4 w-full border-b border-gray-700 pb-2">Esquema de Ligação</h3>
                                {/* SVG Render Area - Dark Mode optimized for screen */}
                                <div 
                                    className="w-full max-w-md bg-white rounded p-4 shadow-sm overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: guide.svgDiagram }} 
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-2">🛠️ Material Necessário</h3>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                                        {guide.materials.map((m, i) => <li key={i}>{m}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-green-400 mb-2 flex items-center gap-2">📝 Passo a Passo</h3>
                                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                                        {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
                                    </ol>
                                </div>
                            </div>
                            
                            <div className="flex justify-end pt-4 border-t border-gray-700">
                                <button onClick={handleDownloadPDF} disabled={isPdfGenerating} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2">
                                    {isPdfGenerating ? <Spinner size="sm" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>}
                                    Descarregar PDF
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500">
                            <div className="text-6xl mb-4 opacity-20">🔌</div>
                            <p className="text-xl font-semibold">Pronto para trabalhar</p>
                            <p className="text-sm mt-1">Descreva a instalação e deixe o Mestre Volts desenhar o esquema.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
