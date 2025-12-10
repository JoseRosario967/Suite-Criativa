

import React, { useState } from 'react';
import { decipherAncientText } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';
import type { UploadedImage, Watermark } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

interface DecipherStudioProps {
    onClose: () => void;
    personalApiKey: string;
    activeWatermark?: Watermark | null;
    isWatermarkEnabled?: boolean;
}

export const DecipherStudio: React.FC<DecipherStudioProps> = ({ onClose, personalApiKey, activeWatermark, isWatermarkEnabled }) => {
    const [inputText, setInputText] = useState('');
    const [sourceImage, setSourceImage] = useState<UploadedImage | null>(null);
    const [result, setResult] = useState<{ transcription: string; translation: string; context: string; confidence: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'image' | 'text'>('image');
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const img = await fileToUploadedImage(file);
                setSourceImage(img);
                setError(null);
            } catch (err) {
                setError("Falha ao carregar a imagem.");
            }
        }
    };

    const handleDecipher = async () => {
        if (mode === 'text' && !inputText.trim()) {
            setError("Por favor, insira o texto para decifrar.");
            return;
        }
        if (mode === 'image' && !sourceImage) {
            setError("Por favor, carregue uma imagem do manuscrito.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const input = mode === 'image' && sourceImage 
                ? { image: { base64: sourceImage.base64, mimeType: sourceImage.mimeType } }
                : { text: inputText };

            const data = await decipherAncientText(input, personalApiKey);
            setResult(data);
        } catch (e: any) {
            setError(e.message || "Erro ao decifrar o manuscrito.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePDF = async () => {
        if (!result) return;
        setIsPdfGenerating(true);

        try {
            // Create detached container for clean PDF generation
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.width = '794px'; // A4 width
            container.style.minHeight = '1123px';
            container.style.backgroundColor = '#ffffff';
            container.style.color = '#000000';
            container.style.fontFamily = 'Georgia, serif'; // Serif for ancient feel
            container.style.padding = '40px';
            container.style.zIndex = '99999';

            // HTML Structure
            let contentHtml = `
                <div style="text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 20px; margin-bottom: 30px;">
                    <h1 style="color: #78350f; font-size: 28px; margin: 0;">Relatório de Decifração</h1>
                    <p style="color: #666; font-size: 12px; margin-top: 5px;">Gerado por Suite Criativa AI - Decifrador de Manuscritos</p>
                </div>
            `;

            // Input Section
            if (mode === 'image' && sourceImage) {
                contentHtml += `
                    <div style="margin-bottom: 30px; text-align: center;">
                        <h3 style="color: #451a03; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; font-family: sans-serif; font-size: 14px; text-transform: uppercase;">Original</h3>
                        <div style="max-height: 400px; overflow: hidden; display: inline-block; border: 1px solid #d1d5db; padding: 5px;">
                            <img src="${sourceImage.dataUrl}" style="max-height: 400px; max-width: 100%; display: block;" />
                        </div>
                    </div>
                `;
            } else if (mode === 'text' && inputText) {
                contentHtml += `
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #451a03; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; font-family: sans-serif; font-size: 14px; text-transform: uppercase;">Texto Original Fornecido</h3>
                        <p style="font-style: italic; background-color: #f3f4f6; padding: 15px; border-radius: 5px;">"${inputText}"</p>
                    </div>
                `;
            }

            // Transcription & Translation
            contentHtml += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #78350f; font-size: 18px; margin-bottom: 10px;">📜 Transcrição</h3>
                    <p style="font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px;">${result.transcription}</p>
                    
                    <h3 style="color: #064e3b; font-size: 18px; margin-bottom: 10px;">🌍 Tradução (Português)</h3>
                    <p style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${result.translation}</p>
                </div>
                
                <div style="background-color: #fffbeb; border: 1px solid #fcd34d; padding: 15px; border-radius: 5px; margin-bottom: 30px;">
                    <h4 style="color: #92400e; font-size: 14px; margin-top: 0; margin-bottom: 5px; text-transform: uppercase;">Contexto Histórico</h4>
                    <p style="font-size: 12px; color: #451a03; margin: 0;">${result.context}</p>
                </div>
            `;

            container.innerHTML = contentHtml;

            // Inject Watermark if enabled
            if (isWatermarkEnabled && activeWatermark) {
                const watermarkImg = document.createElement('img');
                watermarkImg.src = activeWatermark.dataUrl;
                watermarkImg.style.position = 'absolute';
                watermarkImg.style.bottom = '20px';
                watermarkImg.style.right = '20px';
                watermarkImg.style.width = '80px';
                watermarkImg.style.opacity = '0.6';
                container.appendChild(watermarkImg);
            }

            // Footer
            const footer = document.createElement('div');
            footer.style.textAlign = 'center';
            footer.style.fontSize = '10px';
            footer.style.color = '#9ca3af';
            footer.style.marginTop = '40px';
            footer.innerText = `Data: ${new Date().toLocaleDateString()}`;
            container.appendChild(footer);

            document.body.appendChild(container);

            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            document.body.removeChild(container);

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

            pdf.save('Decifracao_Manuscrito.pdf');

        } catch (err) {
            console.error(err);
            setError("Erro ao gerar o PDF.");
        } finally {
            setIsPdfGenerating(false);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col">
             <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white" 
                aria-label="Fechar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="mb-6">
                <h2 className="text-3xl font-bold text-amber-200 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    Decifrador de Manuscritos
                </h2>
                <p className="text-gray-400 mt-2">
                    Carregue uma foto de um texto antigo ou insira o texto para tradução e análise histórica.
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 flex-grow min-h-0">
                {/* LEFT: Input */}
                <div className="w-full lg:w-1/3 flex flex-col space-y-6 bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-fit">
                    <div className="flex p-1 bg-gray-900 rounded-lg">
                        <button onClick={() => setMode('image')} className={`flex-1 py-2 text-sm rounded-md transition-colors ${mode === 'image' ? 'bg-amber-700 text-white' : 'text-gray-400 hover:text-white'}`}>📷 Foto</button>
                        <button onClick={() => setMode('text')} className={`flex-1 py-2 text-sm rounded-md transition-colors ${mode === 'text' ? 'bg-amber-700 text-white' : 'text-gray-400 hover:text-white'}`}>✍️ Texto</button>
                    </div>

                    {mode === 'image' ? (
                        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-amber-500 bg-gray-900/50 transition-colors relative overflow-hidden">
                            {sourceImage ? (
                                <img src={sourceImage.dataUrl} alt="Manuscrito" className="object-contain w-full h-full" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-sm">Carregar Imagem</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    ) : (
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Escreva o texto antigo aqui..."
                            className="w-full h-64 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 resize-none focus:ring-amber-500 focus:border-amber-500 font-serif"
                        />
                    )}

                    <button 
                        onClick={handleDecipher} 
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold rounded-lg shadow-lg hover:from-amber-700 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner size="sm" className="text-white" /> A Decifrar...</div> : 'Decifrar'}
                    </button>
                </div>

                {/* RIGHT: Result */}
                <div className="w-full lg:w-2/3 bg-[#f5f5dc] text-gray-900 rounded-xl shadow-2xl overflow-hidden flex flex-col relative">
                     {/* Paper Texture */}
                     <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>
                     
                     {result ? (
                         <div className="flex flex-col h-full relative z-10">
                             <div className="flex justify-end p-4 border-b border-gray-400/30">
                                <button 
                                    onClick={handleSavePDF}
                                    disabled={isPdfGenerating}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-lg hover:bg-amber-900 transition-colors shadow-md disabled:opacity-50"
                                >
                                    {isPdfGenerating ? <Spinner size="sm" className="text-white" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                    {isPdfGenerating ? 'A gerar...' : 'Guardar Relatório (PDF)'}
                                </button>
                             </div>
                             
                             <div className="p-8 overflow-y-auto font-serif flex-grow">
                                <div className="mb-6 pb-4 border-b border-gray-400/50">
                                    <h3 className="text-xl font-bold text-amber-900 mb-2">📜 Transcrição Original</h3>
                                    <p className="whitespace-pre-wrap text-lg leading-relaxed">{result.transcription}</p>
                                </div>
                                
                                <div className="mb-6 pb-4 border-b border-gray-400/50">
                                    <h3 className="text-xl font-bold text-amber-900 mb-2">🌍 Tradução (Português)</h3>
                                    <p className="whitespace-pre-wrap text-lg leading-relaxed">{result.translation}</p>
                                </div>

                                <div className="bg-amber-100/50 p-4 rounded-lg border border-amber-200">
                                    <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-1">Contexto Histórico</h3>
                                    <p className="text-sm text-gray-800 italic">{result.context}</p>
                                </div>
                             </div>
                         </div>
                     ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-10 relative z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            <p className="text-xl font-semibold text-gray-500">À espera do manuscrito...</p>
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
};