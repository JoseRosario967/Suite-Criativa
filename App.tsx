
import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PromptInput } from './components/PromptInput';
import { ImageUpload } from './components/ImageUpload';
import { ImageDisplay } from './components/ImageDisplay';
import { ErrorAlert } from './components/ErrorAlert';
import { Spinner } from './components/Spinner';
import { generateOrEditImage, generateWithMask } from './services/geminiService';
import { applyWatermark } from './utils/imageUtils';
import { useWatermarks } from './hooks/useWatermarks';
import { usePromptTemplates } from './hooks/usePromptTemplates';
import usePersistentState from './hooks/usePersistentState';
import type { UploadedImage, HistoryItem, ActiveView, Watermark } from './types';

// Lazy-loaded components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const PromptDiscoverer = lazy(() => import('./components/PromptDiscoverer').then(m => ({ default: m.PromptDiscoverer })));
const TextEditor = lazy(() => import('./components/TextEditor').then(m => ({ default: m.TextEditor })));
const MontageStudio = lazy(() => import('./components/MontageStudio').then(m => ({ default: m.MontageStudio })));
const RestorationStudio = lazy(() => import('./components/RestorationStudio').then(m => ({ default: m.RestorationStudio })));
const EuromillionsStudio = lazy(() => import('./components/EuromillionsStudio').then(m => ({ default: m.EuromillionsStudio })));
const VideoStudio = lazy(() => import('./components/VideoStudio').then(m => ({ default: m.VideoStudio })));
const InteriorDesignStudio = lazy(() => import('./components/InteriorDesignStudio').then(m => ({ default: m.InteriorDesignStudio })));
const PoetryStudio = lazy(() => import('./components/PoetryStudio').then(m => ({ default: m.PoetryStudio })));
const BackgroundRemoverStudio = lazy(() => import('./components/BackgroundRemoverStudio').then(m => ({ default: m.BackgroundRemoverStudio })));
const UpscalerStudio = lazy(() => import('./components/UpscalerStudio').then(m => ({ default: m.UpscalerStudio })));
const TranscriptionStudio = lazy(() => import('./components/TranscriptionStudio').then(m => ({ default: m.TranscriptionStudio })));
const PortraitStudio = lazy(() => import('./components/PortraitStudio').then(m => ({ default: m.PortraitStudio })));
const MagicEraserStudio = lazy(() => import('./components/MagicEraserStudio').then(m => ({ default: m.MagicEraserStudio })));
const TranslationStudio = lazy(() => import('./components/TranslationStudio').then(m => ({ default: m.TranslationStudio })));
const ChefStudio = lazy(() => import('./components/ChefStudio').then(m => ({ default: m.ChefStudio })));
const GardeningStudio = lazy(() => import('./components/GardeningStudio').then(m => ({ default: m.GardeningStudio })));
const WeatherStudio = lazy(() => import('./components/WeatherStudio').then(m => ({ default: m.WeatherStudio })));
const WatermarkManager = lazy(() => import('./components/WatermarkManager').then(m => ({ default: m.WatermarkManager })));
const BatchWatermarker = lazy(() => import('./components/BatchWatermarker').then(m => ({ default: m.BatchWatermarker })));
const Changelog = lazy(() => import('./components/Changelog').then(m => ({ default: m.Changelog })));
const MaskEditor = lazy(() => import('./components/MaskEditor').then(m => ({ default: m.MaskEditor })));
const AdvancedImageEditor = lazy(() => import('./components/AdvancedImageEditor').then(m => ({ default: m.AdvancedImageEditor })));
const HistoryPanel = lazy(() => import('./components/HistoryPanel').then(m => ({ default: m.HistoryPanel })));
const ApiKeyPanel = lazy(() => import('./components/ApiKeyPanel').then(m => ({ default: m.ApiKeyPanel })));
const PromptTemplatesPanel = lazy(() => import('./components/PromptTemplatesPanel').then(m => ({ default: m.PromptTemplatesPanel })));
const CreditStore = lazy(() => import('./components/CreditStore').then(m => ({ default: m.CreditStore })));


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

const dataUrlToUploadedImage = (dataUrl: string): UploadedImage => {
    const [header, base64] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
    return {
        id: crypto.randomUUID(),
        dataUrl,
        base64,
        mimeType
    };
};

const LoadingFallback = () => (
    <div className="flex justify-center items-center w-full h-full p-8">
        <Spinner size="lg" />
    </div>
);

const App: React.FC = () => {
    // App State - Changed default to 'dashboard'
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Credit System
    const [credits, setCredits] = usePersistentState<number>('credits', 10);
    const [isCreditStoreOpen, setIsCreditStoreOpen] = useState(false);

    // Image & Prompt State
    const [prompt, setPrompt] = usePersistentState('prompt', '');
    const [negativePrompt, setNegativePrompt] = usePersistentState('negativePrompt', '');
    const [generatedImages, setGeneratedImages] = usePersistentState<string[]>('generatedImages', []);
    const [uploadedImages, setUploadedImages] = usePersistentState<UploadedImage[]>('uploadedImages', []);
    
    // Advanced Settings
    const [quality, setQuality] = usePersistentState<'standard' | 'high'>('quality', 'standard');
    const [aspectRatio, setAspectRatio] = usePersistentState('aspectRatio', '1:1');
    const [personalApiKey, setPersonalApiKey] = usePersistentState<string>('personalApiKey', '');


    // History with robust persistence
    const [history, setHistory] = usePersistentState<HistoryItem[]>('generationHistory', []);
    
    // Custom Hooks
    const { 
        watermarks, activeWatermark, addWatermark, 
        updateWatermark, deleteWatermark, setActiveWatermarkId, setWatermarks
    } = useWatermarks();
    const {
        templates, addTemplate, updateTemplate, deleteTemplate,
        reorderTemplate, sortTemplatesAlphabetically, setTemplates
    } = usePromptTemplates();
    
    // UI State for Modals
    const [isWatermarkEnabled, setIsWatermarkEnabled] = usePersistentState('isWatermarkEnabled', true);
    const [isDiscovererOpen, setIsDiscovererOpen] = useState(false);
    const [isWatermarkManagerOpen, setIsWatermarkManagerOpen] = useState(false);
    const [isBatchWatermarkerOpen, setIsBatchWatermarkerOpen] = useState(false);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const [isMaskEditorOpen, setIsMaskEditorOpen] = useState(false);
    const [imageToMask, setImageToMask] = useState<string | null>(null);
    const [maskEditorMode, setMaskEditorMode] = useState<'edit' | 'erase' | 'enhance'>('edit');
    const [isAdvancedEditorOpen, setIsAdvancedEditorOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState<string | null>(null);


    // New state for sidebar panels as modals
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const [isApiKeyPanelOpen, setIsApiKeyPanelOpen] = useState(false);
    const [isPromptTemplatesPanelOpen, setIsPromptTemplatesPanelOpen] = useState(false);


    const isEditing = useMemo(() => uploadedImages.length > 0, [uploadedImages]);
    
    // Backup and Restore
    const getBackupData = useCallback(() => {
        return {
            history,
            watermarks,
            activeWatermarkId: activeWatermark?.id || null,
            templates,
        };
    }, [history, watermarks, activeWatermark, templates]);

    const loadBackupData = useCallback((data: any) => {
        try {
            if (data.history && Array.isArray(data.history)) {
                setHistory(data.history);
            }
            if (data.watermarks && Array.isArray(data.watermarks)) {
                setWatermarks(data.watermarks);
            }
            if (typeof data.activeWatermarkId === 'string' || data.activeWatermarkId === null) {
                // Ensure the active watermark ID actually exists in the newly loaded watermarks
                const wmExists = data.watermarks?.some((wm: Watermark) => wm.id === data.activeWatermarkId);
                setActiveWatermarkId(wmExists ? data.activeWatermarkId : null);
            }
            if (data.templates && Array.isArray(data.templates)) {
                setTemplates(data.templates);
            }
        } catch (e) {
            console.error("Failed to load backup data", e);
            setError("Falha ao carregar os dados do backup. O ficheiro pode estar corrompido.");
        }
    }, [setHistory, setWatermarks, setActiveWatermarkId, setTemplates]);


    // Handlers
    const handleFiles = useCallback(async (files: FileList | null) => {
        if (files && files.length > 0) {
            try {
                const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
                
                if (Array.from(files).length > 0 && imageFiles.length === 0) {
                    setError("Apenas ficheiros de imagem são suportados. Por favor, tente novamente.");
                    return;
                }
                if (imageFiles.length === 0) return;

                const newImages = await Promise.all(
                    imageFiles.map(fileToUploadedImage)
                );
                setUploadedImages(prev => [...prev, ...newImages]);
                setGeneratedImages([]); // Limpa os resultados anteriores quando novas imagens são adicionadas
            } catch (err) {
                setError("Falha ao carregar uma ou mais imagens.");
            }
        }
    }, [setUploadedImages, setGeneratedImages]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(event.target.files);
        // Limpa o valor do input para permitir selecionar o mesmo ficheiro novamente.
        if(event.currentTarget) {
            event.currentTarget.value = '';
        }
    };

    const handleClearImage = (id: string) => {
        setUploadedImages(prev => prev.filter(img => img.id !== id));
    };

    const handleClearAllImages = () => {
        setUploadedImages([]);
    };

    const handleAddCredits = (amount: number) => {
        setCredits(prev => prev + amount);
    };

    const handleSubmit = async () => {
        if (!prompt.trim()) {
            setError('Por favor, insira um prompt.');
            return;
        }

        // Credit Check Logic
        // If we are generating a NEW image (not editing), it costs 1 credit.
        if (!isEditing) {
            if (credits < 1) {
                setIsCreditStoreOpen(true);
                return;
            }
            setCredits(prev => prev - 1);
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        const options = {
            aspectRatio,
            negativePrompt,
            quality
        };

        try {
            if (isEditing) {
                // Modo de Edição/Composição (múltiplas imagens, um resultado)
                // FREE - No credit deduction
                const imagePayload = uploadedImages.map(img => ({ base64: img.base64, mimeType: img.mimeType }));
                const resultImage = await generateOrEditImage(prompt, imagePayload, options, personalApiKey);

                let finalImage = resultImage;
                if (isWatermarkEnabled && activeWatermark) {
                    finalImage = await applyWatermark(resultImage, activeWatermark);
                }
                
                setGeneratedImages([finalImage]);

                const newHistoryItem: HistoryItem = {
                    id: crypto.randomUUID(),
                    prompt,
                    imageUrl: finalImage,
                    timestamp: Date.now(),
                    originalImages: uploadedImages.map(img => img.dataUrl),
                };
                setHistory(prev => [newHistoryItem, ...prev.slice(0, 49)]);
                
                // Limpa as imagens de origem após uma edição bem-sucedida para redefinir o estado.
                setUploadedImages([]);

            } else {
                // Modo de Geração (sem imagens de entrada)
                // Costs 1 Credit (already deducted)
                
                // Agora usamos 'options' para passar configurações nativas ao Imagen 4
                let resultImage = await generateOrEditImage(prompt, undefined, options, personalApiKey);
                
                if (isWatermarkEnabled && activeWatermark) {
                    resultImage = await applyWatermark(resultImage, activeWatermark);
                }

                setGeneratedImages([resultImage]);
                
                const historyItem: HistoryItem = {
                    id: crypto.randomUUID(),
                    prompt,
                    imageUrl: resultImage,
                    timestamp: Date.now(),
                };
                setHistory(prev => [historyItem, ...prev.slice(0, 49)]);
            }
            
        } catch (e: any) {
            setError(e.message || "Ocorreu um erro desconhecido.");
            // Refund credit on failure if it was a generation
            if (!isEditing) {
                setCredits(prev => prev + 1);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddToHistory = useCallback((prompt: string, imageUrl: string) => {
        const historyItem: HistoryItem = {
            id: crypto.randomUUID(),
            prompt,
            imageUrl,
            timestamp: Date.now(),
        };
        setHistory(prev => [historyItem, ...prev.slice(0, 49)]);
        // Return to generator view after adding to history? Or stay in studio?
        // Let's keep user in studio but maybe show a toast? For now just add to history.
    }, [setHistory]);

    const handleSelectHistory = (item: HistoryItem) => {
        setPrompt(item.prompt);
        setGeneratedImages([item.imageUrl]);
        
        if (item.originalImages && item.originalImages.length > 0) {
            const restoredImages = item.originalImages.map(dataUrlToUploadedImage);
            setUploadedImages(restoredImages);
        } else {
            setUploadedImages([]);
        }
        setIsHistoryPanelOpen(false);
        setActiveView('generator'); // Jump to generator when history is selected
    };
    
    const handleDeleteHistory = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    const handleClearHistory = () => {
        setHistory([]);
    };
    
    const handleApplyDiscoveredPrompt = (discoveredPrompt: string, originalImg: UploadedImage) => {
        setPrompt(discoveredPrompt);
        setUploadedImages([originalImg]);
        setGeneratedImages([]);
        setIsDiscovererOpen(false);
        setActiveView('generator');
    };
    
    const handleSelectTemplate = (template: string) => {
        if (template.includes('{prompt}')) {
            setPrompt(template.replace('{prompt}', prompt));
        } else {
            setPrompt(template);
        }
        setIsPromptTemplatesPanelOpen(false); 
    };

    const handleRefineImage = useCallback((imageUrl: string) => {
        setImageToEdit(imageUrl);
        setIsAdvancedEditorOpen(true);
    }, []);
    
    const handleAdvancedEditComplete = useCallback((originalUrl: string, newUrl: string) => {
      setGeneratedImages(prev => prev.map(img => img === originalUrl ? newUrl : img));
      
      const newHistoryItem: HistoryItem = {
          id: crypto.randomUUID(),
          prompt: `(Edição Avançada)`,
          imageUrl: newUrl,
          timestamp: Date.now(),
          originalImages: [originalUrl], 
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 49)]);
      
      setIsAdvancedEditorOpen(false);
      setImageToEdit(null);
    }, [setGeneratedImages, setHistory]);

    const handleOpenMaskEditor = useCallback((imageUrl: string, mode: 'edit' | 'erase' | 'enhance' = 'edit') => {
        setImageToMask(imageUrl);
        setMaskEditorMode(mode);
        setIsMaskEditorOpen(true);
    }, []);

    const handleMaskedSubmit = useCallback(async (userPrompt: string, originalImage: UploadedImage, maskImage: UploadedImage) => {
        setIsLoading(true);
        setError(null);
        setIsMaskEditorOpen(false);
        setGeneratedImages([]);
        setActiveView('generator'); // Force generator view to show result

        try {
            let resultImage = await generateWithMask(userPrompt, originalImage, maskImage, personalApiKey);
            
            if (isWatermarkEnabled && activeWatermark) {
                resultImage = await applyWatermark(resultImage, activeWatermark);
            }

            setGeneratedImages([resultImage]);

            const newHistoryItem: HistoryItem = {
                id: crypto.randomUUID(),
                prompt: `(Edição com máscara) ${userPrompt}`,
                imageUrl: resultImage,
                timestamp: Date.now(),
                originalImages: [originalImage.dataUrl],
            };
            setHistory(prev => [newHistoryItem, ...prev.slice(0, 49)]);
            
        } catch (e: any) {
             setError(e.message || "Ocorreu um erro desconhecido durante a edição com máscara.");
        } finally {
            setIsLoading(false);
            setImageToMask(null);
        }
    }, [activeWatermark, isWatermarkEnabled, personalApiKey, setGeneratedImages, setHistory]);

    const renderView = () => {
        const suspenseFallback = <LoadingFallback />;
        switch (activeView) {
            case 'dashboard':
                return <Suspense fallback={suspenseFallback}><Dashboard setActiveView={setActiveView} /></Suspense>;
            case 'generator':
                return (
                    <div className="flex flex-col lg:flex-row gap-8 w-full animate-fade-in">
                        <Sidebar 
                             onOpenHistory={() => setIsHistoryPanelOpen(true)}
                             onOpenWatermarkSettings={() => setIsWatermarkManagerOpen(true)}
                             onOpenPrompts={() => setIsPromptTemplatesPanelOpen(true)}
                             onOpenApiKeySettings={() => setIsApiKeyPanelOpen(true)}
                             getBackupData={getBackupData}
                             loadBackupData={loadBackupData}
                             isWatermarkEnabled={isWatermarkEnabled}
                             setIsWatermarkEnabled={setIsWatermarkEnabled}
                             activeWatermark={activeWatermark}
                             quality={quality}
                             setQuality={setQuality}
                             aspectRatio={aspectRatio}
                             setAspectRatio={setAspectRatio}
                             negativePrompt={negativePrompt}
                             setNegativePrompt={setNegativePrompt}
                        />
                        <div className="w-full lg:w-2/3 xl:w-3/4 flex flex-col gap-6">
                            <div className="flex-grow min-h-0 flex items-center justify-center">
                                <ImageDisplay 
                                    images={generatedImages} 
                                    isLoading={isLoading} 
                                    onEditImage={handleRefineImage}
                                    onEditWithMask={(url) => handleOpenMaskEditor(url, 'edit')}
                                    setGeneratedImages={setGeneratedImages}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <PromptInput 
                                    prompt={prompt} 
                                    setPrompt={setPrompt} 
                                    onSubmit={handleSubmit} 
                                    isLoading={isLoading}
                                    isImageUploaded={uploadedImages.length > 0}
                                    onClearPrompt={() => setPrompt('')}
                                />
                                <ImageUpload
                                    uploadedImages={uploadedImages}
                                    onFileChange={handleFileChange}
                                    onFilesDrop={handleFiles}
                                    onClearImage={handleClearImage}
                                    onClearAllImages={handleClearAllImages}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'textEditor':
                return <Suspense fallback={suspenseFallback}><TextEditor 
                            onClose={() => setActiveView('dashboard')}
                            isWatermarkEnabled={isWatermarkEnabled}
                            activeWatermark={activeWatermark}
                        /></Suspense>;
            case 'montage':
                return <Suspense fallback={suspenseFallback}><MontageStudio 
                            onAddToHistory={handleAddToHistory} 
                            onClose={() => setActiveView('dashboard')}
                            isWatermarkEnabled={isWatermarkEnabled}
                            activeWatermark={activeWatermark}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'restoration':
                return <Suspense fallback={suspenseFallback}><RestorationStudio 
                            onAddToHistory={handleAddToHistory} 
                            onClose={() => setActiveView('dashboard')}
                            isWatermarkEnabled={isWatermarkEnabled}
                            activeWatermark={activeWatermark}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'interiorDesign':
                return <Suspense fallback={suspenseFallback}><InteriorDesignStudio 
                            onAddToHistory={handleAddToHistory} 
                            onClose={() => setActiveView('dashboard')}
                            isWatermarkEnabled={isWatermarkEnabled}
                            activeWatermark={activeWatermark}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'poetry':
                return <Suspense fallback={suspenseFallback}><PoetryStudio 
                            onClose={() => setActiveView('dashboard')}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'backgroundRemover':
                return <Suspense fallback={suspenseFallback}><BackgroundRemoverStudio
                            onAddToHistory={handleAddToHistory}
                            onClose={() => setActiveView('dashboard')}
                            isWatermarkEnabled={isWatermarkEnabled}
                            activeWatermark={activeWatermark}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'upscaler':
                return <Suspense fallback={suspenseFallback}><UpscalerStudio
                            onAddToHistory={handleAddToHistory}
                            onClose={() => setActiveView('dashboard')}
                            isWatermarkEnabled={isWatermarkEnabled}
                            activeWatermark={activeWatermark}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
             case 'transcription':
                return <Suspense fallback={suspenseFallback}><TranscriptionStudio
                            onClose={() => setActiveView('dashboard')}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'portrait':
                return <Suspense fallback={suspenseFallback}><PortraitStudio
                            onAddToHistory={handleAddToHistory}
                            onClose={() => setActiveView('dashboard')}
                            isWatermarkEnabled={isWatermarkEnabled}
                            activeWatermark={activeWatermark}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'magicEraser':
                return <Suspense fallback={suspenseFallback}><MagicEraserStudio
                            onClose={() => setActiveView('dashboard')}
                            onOpenMaskEditor={handleOpenMaskEditor}
                        /></Suspense>;
            case 'translator':
                return <Suspense fallback={suspenseFallback}><TranslationStudio
                            onClose={() => setActiveView('dashboard')}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'chef':
                return <Suspense fallback={suspenseFallback}><ChefStudio
                            onClose={() => setActiveView('dashboard')}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'gardening':
                return <Suspense fallback={suspenseFallback}><GardeningStudio
                            onClose={() => setActiveView('dashboard')}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'weather':
                return <Suspense fallback={suspenseFallback}><WeatherStudio
                            onClose={() => setActiveView('dashboard')}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            case 'euromillions':
                return <Suspense fallback={suspenseFallback}><EuromillionsStudio onClose={() => setActiveView('dashboard')} /></Suspense>;
            case 'video':
                return <Suspense fallback={suspenseFallback}><VideoStudio 
                            onClose={() => setActiveView('dashboard')}
                            personalApiKey={personalApiKey}
                        /></Suspense>;
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans flex flex-col">
            <Header 
                activeView={activeView} 
                setActiveView={setActiveView} 
                onOpenDiscoverer={() => setIsDiscovererOpen(true)}
                onOpenBatchWatermarker={() => setIsBatchWatermarkerOpen(true)}
                onOpenChangelog={() => setIsChangelogOpen(true)}
                credits={credits}
                onOpenCreditStore={() => setIsCreditStoreOpen(true)}
            />
            <main className="container mx-auto p-4 md:p-8 flex-grow flex">
                {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
                {renderView()}
            </main>
            
            {/* Modals */}
            <Suspense fallback={null}>
                {isDiscovererOpen && (
                    <PromptDiscoverer 
                        isOpen={isDiscovererOpen} 
                        onClose={() => setIsDiscovererOpen(false)}
                        onApply={handleApplyDiscoveredPrompt}
                        personalApiKey={personalApiKey}
                    />
                )}
                {isWatermarkManagerOpen && (
                    <WatermarkManager 
                        isOpen={isWatermarkManagerOpen}
                        onClose={() => setIsWatermarkManagerOpen(false)}
                        watermarks={watermarks}
                        activeWatermarkId={activeWatermark?.id || null}
                        onAdd={addWatermark}
                        onUpdate={updateWatermark}
                        onDelete={deleteWatermark}
                        onSetId={setActiveWatermarkId}
                    />
                )}
                {isBatchWatermarkerOpen && (
                    <BatchWatermarker
                        isOpen={isBatchWatermarkerOpen}
                        onClose={() => setIsBatchWatermarkerOpen(false)}
                        activeWatermark={activeWatermark}
                    />
                )}
                {isChangelogOpen && (
                    <Changelog
                        isOpen={isChangelogOpen}
                        onClose={() => setIsChangelogOpen(false)}
                    />
                )}
                {imageToMask && (
                    <MaskEditor
                        isOpen={isMaskEditorOpen}
                        onClose={() => setIsMaskEditorOpen(false)}
                        sourceImage={imageToMask}
                        onSubmit={handleMaskedSubmit}
                        initialMode={maskEditorMode}
                    />
                )}
                {imageToEdit && (
                    <AdvancedImageEditor
                        isOpen={isAdvancedEditorOpen}
                        onClose={() => setIsAdvancedEditorOpen(false)}
                        imageSrc={imageToEdit}
                        onApply={handleAdvancedEditComplete}
                    />
                )}
                {isHistoryPanelOpen && (
                    <HistoryPanel
                        isOpen={isHistoryPanelOpen}
                        onClose={() => setIsHistoryPanelOpen(false)}
                        history={history}
                        onSelect={handleSelectHistory}
                        onDelete={handleDeleteHistory}
                        onClear={handleClearHistory}
                    />
                )}
                {isApiKeyPanelOpen && (
                    <ApiKeyPanel
                        isOpen={isApiKeyPanelOpen}
                        onClose={() => setIsApiKeyPanelOpen(false)}
                        personalApiKey={personalApiKey}
                        setPersonalApiKey={setPersonalApiKey}
                    />
                )}
                {isPromptTemplatesPanelOpen && (
                    <PromptTemplatesPanel
                        isOpen={isPromptTemplatesPanelOpen}
                        onClose={() => setIsPromptTemplatesPanelOpen(false)}
                        templates={templates}
                        onSelect={handleSelectTemplate}
                        onAdd={addTemplate}
                        onUpdate={updateTemplate}
                        onDelete={deleteTemplate}
                        onReorder={reorderTemplate}
                        onSortAlphabetically={sortTemplatesAlphabetically}
                    />
                )}
                {isCreditStoreOpen && (
                    <CreditStore
                        isOpen={isCreditStoreOpen}
                        onClose={() => setIsCreditStoreOpen(false)}
                        onAddCredits={handleAddCredits}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default App;