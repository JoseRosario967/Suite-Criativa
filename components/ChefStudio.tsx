
import React, { useState } from 'react';
import { generateRecipe, generateOrEditImage } from '../services/geminiService';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';
import type { UploadedImage } from '../types';
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

interface ChefStudioProps {
    onClose: () => void;
    personalApiKey: string;
}

interface Recipe {
    title: string;
    description: string;
    time: string;
    ingredients: string[];
    instructions: string[];
    tips: string;
}

export const ChefStudio: React.FC<ChefStudioProps> = ({ onClose, personalApiKey }) => {
    const [ingredients, setIngredients] = useState('');
    const [mealType, setMealType] = useState('Jantar');
    const [dietary, setDietary] = useState('Sem restrições');
    const [servings, setServings] = useState('2');
    const [difficulty, setDifficulty] = useState('Média');
    const [fridgeImages, setFridgeImages] = useState<UploadedImage[]>([]); // Changed to array
    
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [dishImage, setDishImage] = useState<string | null>(null);
    
    // States for better UI flow
    const [isLoading, setIsLoading] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);
    
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            try {
                const newImages = await Promise.all(newFiles.map(fileToUploadedImage));
                setFridgeImages(prev => [...prev, ...newImages]);
            } catch (err) {
                setError("Erro ao carregar imagens.");
            }
        }
        if (e.currentTarget) e.currentTarget.value = '';
    };

    const handleRemoveImage = (id: string) => {
        setFridgeImages(prev => prev.filter(img => img.id !== id));
    };

    const handleGenerate = async () => {
        if (!ingredients.trim() && fridgeImages.length === 0) {
            setError("Por favor, indique os ingredientes ou carregue fotos do frigorífico.");
            return;
        }

        // Start fresh
        setIsLoading(true);
        setIsImageLoading(false);
        setError(null);
        setRecipe(null);
        setDishImage(null);

        try {
            // 1. Generate Text Recipe FIRST and show it immediately
            const result = await generateRecipe({
                ingredients,
                mealType,
                dietary,
                servings,
                difficulty,
                images: fridgeImages.map(img => ({ base64: img.base64, mimeType: img.mimeType })) // Pass all images
            }, personalApiKey);
            
            setRecipe(result.recipe);
            setIsLoading(false); // Stop main loader so user can read recipe

            // 2. Generate Visual in background
            setIsImageLoading(true);
            
            try {
                const imagePrompt = `Professional food photography of ${result.recipe.title}: ${result.recipe.description}. High resolution, delicious, michelin star presentation, photorealistic, 8k.`;
                
                const generatedImageUrl = await generateOrEditImage(
                    imagePrompt, 
                    undefined, 
                    { aspectRatio: '4:3', quality: 'high' }, 
                    personalApiKey
                );
                setDishImage(generatedImageUrl);
            } catch (imgErr) {
                console.error("Falha ao gerar imagem do prato:", imgErr);
                // We don't error the whole UI, just leave the image blank or show a placeholder
            } finally {
                setIsImageLoading(false);
            }

        } catch (e: any) {
            setError(e.message || "Ocorreu um erro ao cozinhar a sua ideia.");
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSavePDF = async () => {
        const element = document.getElementById('recipe-content-area');
        if (!element || !recipe) return;

        setIsPdfGenerating(true);

        try {
            // Create a clone to render full height without scrollbars
            const clone = element.cloneNode(true) as HTMLElement;
            
            // Style the clone to be printer-friendly and fully expanded
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '794px'; // Exact A4 width in pixels at 96 DPI
            clone.style.minHeight = '1123px'; // Min A4 height
            clone.style.height = 'auto';
            clone.style.overflow = 'visible';
            clone.style.background = 'white';
            clone.style.fontFamily = 'serif'; // Ensure font consistency
            
            // --- RESTRUCTURING FOR PDF (Cookbook Style) ---
            // Instead of text over image, we want: Image -> Title (Black on White) -> Content
            
            const headerOverlay = clone.querySelector('.recipe-header-overlay') as HTMLElement;
            const bodySection = clone.querySelector('.recipe-body') as HTMLElement;
            const title = clone.querySelector('h1') as HTMLElement;
            const description = clone.querySelector('p.header-description') as HTMLElement;
            const imageContainer = clone.querySelector('.recipe-image-container') as HTMLElement;

            if (headerOverlay && bodySection && title && imageContainer) {
                // 1. Remove overlay styles so the image is just a plain image
                headerOverlay.style.display = 'none'; // Hide the overlay completely
                
                // 2. Create a new Header Container to put inside the white body
                const newHeader = document.createElement('div');
                newHeader.style.marginBottom = '24px';
                newHeader.style.paddingBottom = '24px';
                newHeader.style.borderBottom = '2px solid #eee';
                newHeader.style.textAlign = 'center';

                // 3. Style Title for Document
                title.style.color = '#1a1a1a';
                title.style.fontSize = '32px';
                title.style.marginBottom = '12px';
                title.style.lineHeight = '1.2';
                title.style.textShadow = 'none';
                title.className = ''; // Remove Tailwind classes to avoid conflicts

                // 4. Style Description
                if (description) {
                    description.style.color = '#4b5563';
                    description.style.fontSize = '14px';
                    description.style.fontStyle = 'italic';
                    description.style.textShadow = 'none';
                    description.className = '';
                }

                // 5. Move Elements into the new header
                newHeader.appendChild(title);
                if (description) newHeader.appendChild(description);

                // 6. Insert new header at the top of the body section
                if (bodySection.firstChild) {
                    bodySection.insertBefore(newHeader, bodySection.firstChild);
                } else {
                    bodySection.appendChild(newHeader);
                }

                // 7. Adjust Image Container height for PDF
                imageContainer.style.height = '400px'; // Fixed height for the top image
            }

            // 8. General Body Styling
            if (bodySection) {
                bodySection.style.color = '#1a1a1a';
                bodySection.style.backgroundColor = '#ffffff';
                bodySection.style.padding = '40px'; // More padding for paper look
                
                // Force dark text on all children
                const bodyElements = bodySection.querySelectorAll('*');
                bodyElements.forEach((el) => {
                    if (el instanceof HTMLElement) {
                        el.style.color = '#1a1a1a';
                        // Fix for badges (time, servings)
                        if (el.classList.contains('bg-orange-100')) {
                             el.style.backgroundColor = '#fff7ed'; // Very light orange
                             el.style.color = '#c2410c'; // Dark orange
                             el.style.border = '1px solid #fdba74';
                        }
                    }
                });
            }

            document.body.appendChild(clone);

            // Capture using html2canvas with high quality settings
            const canvas = await html2canvas(clone, {
                scale: 2, // High resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 794
            });

            document.body.removeChild(clone);

            // Generate PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG is lighter/faster than PNG for photos
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

            const safeTitle = recipe.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            pdf.save(`Receita_${safeTitle}.pdf`);

        } catch (err) {
            console.error("PDF Generation Error:", err);
            setError("Erro ao gerar o ficheiro PDF. Por favor, tente a opção 'Imprimir'.");
        } finally {
            setIsPdfGenerating(false);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col animate-fade-in">
            <button 
                onClick={onClose} 
                className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white print:hidden" 
                aria-label="Fechar Chef AI"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="mb-6 text-center md:text-left print:hidden">
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <span className="text-4xl">👨‍🍳</span>
                    <h2 className="text-3xl font-bold text-white">Chef AI Michelin</h2>
                </div>
                <p className="text-gray-400 mt-2 max-w-2xl">
                    Não sabe o que cozinhar? Diga-me o que tem no frigorífico ou tire fotos aos ingredientes. Eu crio a receita e mostro-lhe o resultado final.
                </p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 min-h-0">
                {/* Left: Inputs (Hidden when printing) */}
                <div className="w-full lg:w-1/3 flex flex-col space-y-6 bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-fit print:hidden">
                    
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">📸 O que há no frigorífico?</label>
                        <div className="grid grid-cols-3 gap-2">
                            {fridgeImages.map(img => (
                                <div key={img.id} className="relative aspect-square">
                                    <img src={img.dataUrl} alt="Ingrediente" className="w-full h-full object-cover rounded-md" />
                                    <button onClick={() => handleRemoveImage(img.id)} className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-0.5 hover:bg-red-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                            <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-600 rounded-lg bg-gray-900/50 hover:border-orange-500 transition-colors cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                <span className="text-xs text-gray-500 mt-1">Adicionar</span>
                                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Text Ingredients */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">📝 Lista de Ingredientes</label>
                        <textarea 
                            value={ingredients} 
                            onChange={e => setIngredients(e.target.value)} 
                            placeholder="Ex: Frango, limão, arroz, alho..." 
                            className="w-full h-24 p-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 focus:ring-orange-500 focus:border-orange-500 resize-none"
                        />
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Refeição</label>
                            <select value={mealType} onChange={e => setMealType(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm text-white">
                                <option>Pequeno-almoço</option>
                                <option>Almoço</option>
                                <option>Jantar</option>
                                <option>Lanche</option>
                                <option>Sobremesa</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Dieta</label>
                            <select value={dietary} onChange={e => setDietary(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm text-white">
                                <option>Sem restrições</option>
                                <option>Vegetariano</option>
                                <option>Vegan</option>
                                <option>Sem Glúten</option>
                                <option>Keto</option>
                                <option>Paleo</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Pessoas</label>
                            <select value={servings} onChange={e => setServings(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm text-white">
                                <option>1</option>
                                <option>2</option>
                                <option>4</option>
                                <option>6+</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Dificuldade</label>
                            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm text-white">
                                <option>Fácil</option>
                                <option>Média</option>
                                <option>Difícil</option>
                                <option>Chef Michelin</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || (!ingredients.trim() && fridgeImages.length === 0)}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg shadow-lg hover:shadow-orange-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? <div className="flex items-center justify-center gap-2"><Spinner size="sm" className="text-white" /> A criar receita...</div> : 'Criar Receita Mágica'}
                    </button>
                </div>

                {/* Right: Recipe Card */}
                {/* Added id for html2canvas capture */}
                <div className="w-full lg:w-2/3 bg-white text-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col min-h-[600px] print:fixed print:inset-0 print:w-screen print:h-auto print:min-h-screen print:z-[9999] print:overflow-visible print:shadow-none print:bg-white print:m-0 print:p-0">
                    {recipe ? (
                        <div className="flex flex-col h-full animate-fade-in">
                            
                            {/* Content Wrapper for Capture */}
                            <div id="recipe-content-area" className="flex flex-col h-full">
                                {/* Header Image Container - Class added for selection */}
                                <div className="recipe-image-container relative w-full h-64 md:h-80 bg-gray-200 flex-shrink-0 print:h-[300px] print:w-full">
                                    {dishImage ? (
                                        // Using crossOrigin="anonymous" to allow canvas capture of external image
                                        <img src={dishImage} alt={recipe.title} className="w-full h-full object-cover animate-fade-in" crossOrigin="anonymous" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                                            {isImageLoading ? (
                                                <>
                                                    <Spinner className="text-orange-500 mb-2" />
                                                    <p className="text-sm animate-pulse">A empratar a sua receita...</p>
                                                </>
                                            ) : (
                                                <p>Imagem não disponível</p>
                                            )}
                                        </div>
                                    )}
                                    {/* Overlay - Class added for selection */}
                                    <div className="recipe-header-overlay absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pt-24 print:bg-none print:text-black print:relative print:p-4">
                                        <h1 className="text-2xl md:text-4xl font-bold text-white font-serif line-clamp-3 leading-tight drop-shadow-md print:text-black print:drop-shadow-none print:text-3xl">{recipe.title}</h1>
                                        <p className="header-description text-gray-200 text-sm md:text-base mt-2 line-clamp-2 drop-shadow-sm print:text-black print:drop-shadow-none">{recipe.description}</p>
                                    </div>
                                </div>

                                {/* Content - recipe-body class added */}
                                <div className="recipe-body flex-grow p-6 md:p-8 overflow-y-auto print:overflow-visible print:h-auto bg-white">
                                    <div className="flex flex-wrap gap-4 mb-8 text-sm font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 pb-6 print:text-black print:border-black">
                                        <div className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 print:text-black" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                            {recipe.time}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 print:text-black" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                                            {servings} Pessoas
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 print:text-black" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                                            {difficulty}
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* Ingredients */}
                                        <div className="w-full md:w-1/3">
                                            <h3 className="text-xl font-bold text-gray-800 mb-4 font-serif border-b-2 border-orange-200 inline-block pb-1 print:text-black print:border-black">Ingredientes</h3>
                                            <ul className="space-y-2">
                                                {recipe.ingredients?.map((ing, i) => (
                                                    <li key={i} className="flex items-start text-gray-700 break-words print:text-black">
                                                        <span className="text-orange-500 mr-2 print:text-black">•</span>
                                                        {ing}
                                                    </li>
                                                ))}
                                                {(!recipe.ingredients || recipe.ingredients.length === 0) && (
                                                    <li className="text-gray-500 italic text-sm">Ingredientes listados nas instruções.</li>
                                                )}
                                            </ul>
                                        </div>

                                        {/* Instructions */}
                                        <div className="w-full md:w-2/3">
                                            <h3 className="text-xl font-bold text-gray-800 mb-4 font-serif border-b-2 border-orange-200 inline-block pb-1 print:text-black print:border-black">Preparação</h3>
                                            <ol className="space-y-6">
                                                {recipe.instructions?.map((step, i) => (
                                                    <li key={i} className="flex gap-4">
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm print:bg-gray-200 print:text-black">
                                                            {i + 1}
                                                        </div>
                                                        <p className="text-gray-700 leading-relaxed pt-1 break-words print:text-black">{step}</p>
                                                    </li>
                                                ))}
                                                {(!recipe.instructions || recipe.instructions.length === 0) && (
                                                    <li className="text-gray-500 italic text-sm">Instruções não disponíveis.</li>
                                                )}
                                            </ol>
                                        </div>
                                    </div>

                                    {/* Chef's Tip */}
                                    {recipe.tips && (
                                        <div className="mt-10 p-6 bg-orange-50 rounded-lg border border-orange-100 print:border-black print:bg-transparent">
                                            <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2 print:text-black">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                                Dica do Chef
                                            </h4>
                                            <p className="text-gray-700 italic break-words print:text-black">"{recipe.tips}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Footer Actions */}
                            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end print:hidden gap-4">
                                <button 
                                    onClick={handleSavePDF} 
                                    disabled={isPdfGenerating}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-red-400 disabled:cursor-not-allowed"
                                >
                                    {isPdfGenerating ? (
                                        <Spinner size="sm" className="text-white" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    )}
                                    {isPdfGenerating ? 'A gerar...' : 'Guardar PDF'}
                                </button>
                                <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                                    Imprimir
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-10 bg-gray-800 border border-gray-700 rounded-xl print:hidden">
                            {isLoading ? (
                                <div className="text-center">
                                    <Spinner size="lg" className="text-orange-500" />
                                    <p className="mt-4 text-xl font-semibold animate-pulse">O Chef está a pensar...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-6xl mb-4 opacity-20">🥘</div>
                                    <p className="text-xl font-semibold">A cozinha está vazia...</p>
                                    <p className="text-sm mt-2 text-center">Preencha os dados à esquerda e clique em "Criar Receita Mágica" para começar.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
