import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { UploadedImage } from '../types';

// Helper to get client
const getAiClient = (apiKey?: string | null) => {
    const key = apiKey || process.env.API_KEY;
    if (!key) {
        throw new Error("Chave de API não encontrada. Por favor, configure-a nas definições ou use a chave padrão.");
    }
    return new GoogleGenAI({ apiKey: key });
};

// Helper for responses
const handleApiResponse = (response: any) => {
    if (!response) throw new Error("Sem resposta da IA.");
    if (response.error) throw new Error(response.error.message || "Erro na API.");
};

// Helper for errors
const handleApiError = (error: any, context: string) => {
    console.error(`Erro em ${context}:`, error);
    return new Error(`Falha ao ${context}: ${error.message || error}`);
};

// --- Image Generation & Editing ---

export const generateOrEditImage = async (
    prompt: string,
    images?: { base64: string; mimeType: string }[],
    options?: { quality?: 'standard' | 'high'; aspectRatio?: string },
    apiKey?: string
): Promise<string> => {
    const ai = getAiClient(apiKey);
    const model = (options?.quality === 'high' && !images) 
        ? 'gemini-3-pro-image-preview' 
        : 'gemini-2.5-flash-image';

    const parts: any[] = [];
    if (images) {
        images.forEach(img => {
            parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
        });
    }
    parts.push({ text: prompt });

    const config: any = {};
    if (options?.aspectRatio) {
        config.imageConfig = { aspectRatio: options.aspectRatio };
    }
    
    if (model === 'gemini-3-pro-image-preview' && options?.quality === 'high') {
         if (!config.imageConfig) config.imageConfig = {};
         // Gemini 3 Pro supports imageSize configuration
    }

    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config
        });
        
        handleApiResponse(response);
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("Nenhuma imagem gerada.");
    } catch (e) {
        throw handleApiError(e, 'gerar imagem');
    }
};

export const generateWithMask = async (
    prompt: string,
    originalImage: UploadedImage,
    maskImage: UploadedImage,
    apiKey?: string
): Promise<string> => {
    return generateOrEditImage(
        prompt, 
        [
            { base64: originalImage.base64, mimeType: originalImage.mimeType },
            { base64: maskImage.base64, mimeType: maskImage.mimeType }
        ],
        undefined,
        apiKey
    );
};

// --- Prompt Discovery ---

export const discoverImagePrompt = async (image: { base64: string; mimeType: string }, apiKey?: string): Promise<string> => {
    const ai = getAiClient(apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: image.base64, mimeType: image.mimeType } },
                    { text: "Describe this image in extreme detail to be used as a prompt for an AI image generator." }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        throw handleApiError(e, 'descobrir prompt');
    }
};

export const discoverEditPrompt = async (
    original: { base64: string; mimeType: string },
    edited: { base64: string; mimeType: string },
    apiKey?: string
): Promise<string> => {
    const ai = getAiClient(apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: original.base64, mimeType: original.mimeType } },
                    { inlineData: { data: edited.base64, mimeType: edited.mimeType } },
                    { text: "Compare these two images (original first, edited second). Write a concise prompt that describes the changes made to the original to get the edited version." }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        throw handleApiError(e, 'descobrir edição');
    }
};

// --- Specialized Studios ---

export const generateMontage = async (prompt: string, bg: UploadedImage, subject: UploadedImage, apiKey?: string) => {
    return generateOrEditImage(
        `Create a realistic montage: ${prompt}`,
        [
            { base64: bg.base64, mimeType: bg.mimeType },
            { base64: subject.base64, mimeType: subject.mimeType }
        ],
        undefined,
        apiKey
    );
};

export const restoreImage = async (image: UploadedImage, apiKey?: string) => {
    return generateOrEditImage(
        "Restore this old photo, remove scratches, improve sharpness and color balance. Maintain original details.",
        [{ base64: image.base64, mimeType: image.mimeType }],
        undefined,
        apiKey
    );
};

export const removeBackground = async (image: UploadedImage, apiKey?: string) => {
    return generateOrEditImage(
        "Remove the background from this image, leaving only the main subject on a pure white background (or transparent if supported).",
        [{ base64: image.base64, mimeType: image.mimeType }],
        undefined,
        apiKey
    );
};

export const upscaleImage = async (image: UploadedImage, apiKey?: string) => {
    return generateOrEditImage(
        "Upscale this image to high resolution, sharpen details, improve quality.",
        [{ base64: image.base64, mimeType: image.mimeType }],
        { quality: 'high' },
        apiKey
    );
};

export const generatePortrait = async (prompt: string, images: UploadedImage[], apiKey?: string) => {
    const payload = images.map(img => ({ base64: img.base64, mimeType: img.mimeType }));
    return generateOrEditImage(
        `Create a portrait based on these references: ${prompt}`,
        payload,
        { quality: 'high', aspectRatio: '3:4' },
        apiKey
    );
};

export const generateVectorGraphic = async (
    prompt: string,
    type: 'visual' | 'code',
    style: string,
    image?: { base64: string; mimeType: string },
    apiKey?: string
): Promise<{ svgCode?: string; imageUrl?: string }> => {
    const ai = getAiClient(apiKey);

    if (type === 'code') {
        // Generate Real SVG Code
        try {
            const systemPrompt = `You are an expert SVG coder. Create clean, scalable, and optimized SVG code.
            - Do not use external images (base64). Use paths, circles, rects, etc.
            - Use a 512x512 viewBox.
            - Return ONLY the raw SVG code starting with <svg> and ending with </svg>.
            - Do not use markdown blocks.`;

            let userPrompt = `Create a ${style} SVG icon/illustration of: ${prompt}. Use appropriate colors.`;
            const parts: any[] = [];
            
            if (image) {
                parts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
                userPrompt = `Convert this image into a ${style} SVG code representation. Description: ${prompt}. Capture the main shapes and colors.`;
            }
            parts.push({ text: userPrompt });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', // Flash is good for code
                contents: { parts },
                config: {
                    systemInstruction: systemPrompt,
                    maxOutputTokens: 8192
                }
            });

            let svgCode = response.text || "";
            // Cleanup markdown if present
            svgCode = svgCode.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();
            
            if (!svgCode.startsWith('<svg')) {
                 // Try to extract SVG if buried in text
                const startIndex = svgCode.indexOf('<svg');
                const endIndex = svgCode.lastIndexOf('</svg>');
                if (startIndex !== -1 && endIndex !== -1) {
                    svgCode = svgCode.substring(startIndex, endIndex + 6);
                } else {
                    throw new Error("Failed to generate valid SVG code.");
                }
            }
            
            return { svgCode };
        } catch (e) {
            throw handleApiError(e, 'gerar código SVG');
        }
    } else {
        // Generate Vector-Style Raster Image
        const vectorPrompt = `Vector art style, ${style}, flat design, clean lines, solid colors, minimal shading, white background, high quality illustration of: ${prompt}`;
        try {
            const inputImages = image ? [image] : undefined;
            const imageUrl = await generateOrEditImage(
                vectorPrompt, 
                inputImages, 
                { aspectRatio: '1:1', quality: 'standard' }, // Use standard to avoid 403 errors on Pro models without billing
                apiKey
            );
            return { imageUrl };
        } catch (e) {
            throw handleApiError(e, 'gerar imagem vetorial');
        }
    }
};

// --- Text & Audio ---

export const generatePoetry = async (topic: string, type: string, style: string, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    try {
        const prompt = `Escreve um(a) ${type} sobre "${topic}" no estilo "${style}".
        Língua: Português (PT-PT).
        
        Requisitos:
        - Criativo e envolvente.
        - Retorna APENAS um objeto JSON válido.
        - Usa \\n para quebras de linha no conteúdo.
        - Sê conciso se o tema for simples, evita repetições infinitas.
        
        Estrutura JSON:
        {
            "title": "Título da obra",
            "content": "Texto completo da obra aqui",
            "style": "Descrição do estilo usado"
        }`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                maxOutputTokens: 8192 // Aumentado ao máximo para evitar cortes
            }
        });
        
        const text = response.text || "{}";
        const jsonStr = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        throw handleApiError(e, 'gerar poesia');
    }
};

export const generateSpeech = async (text: string, voice: string, apiKey?: string): Promise<string> => {
    const ai = getAiClient(apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice }
                    }
                }
            }
        });
        
        const audioPart = response.candidates?.[0]?.content?.parts?.[0];
        if (audioPart && audioPart.inlineData) {
            return audioPart.inlineData.data;
        }
        throw new Error("No audio generated");
    } catch (e) {
        throw handleApiError(e, 'gerar áudio');
    }
};

export const transcribeAudio = async (audio: { base64: string; mimeType: string }, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: audio.base64, mimeType: audio.mimeType } },
                    { text: "Transcribe this audio verbatim. Then provide a translation to Portuguese. Return JSON: { \"original\": \"...\", \"translation\": \"...\" }" }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        original: { type: Type.STRING },
                        translation: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        throw handleApiError(e, 'transcrever áudio');
    }
};

export const translateText = async (text: string, targetLang: string, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following text to ${targetLang}. Only return the translation. Text: "${text}"`
        });
        return response.text || "";
    } catch (e) {
        throw handleApiError(e, 'traduzir texto');
    }
};

// --- Specialized Generators ---

export const generateRecipe = async (data: any, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    const parts: any[] = [];
    if (data.images) {
        data.images.forEach((img: any) => {
            parts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
        });
    }
    
    const prompt = `Act as a Michelin Chef. Create a recipe based on these ingredients/images: ${data.ingredients || 'See images'}.
    Meal: ${data.mealType}. Dietary: ${data.dietary}. Servings: ${data.servings}. Difficulty: ${data.difficulty}.
    Language: Portuguese.
    Return JSON: { "recipe": { "title": "", "description": "", "time": "", "ingredients": [], "instructions": [], "tips": "" } }`;
    
    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        throw handleApiError(e, 'gerar receita');
    }
};

export const generateGardeningAdvice = async (month: string, region: string, mode: string, details: any, query: string, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    let prompt = "";
    if (mode === 'guide') {
        prompt = `Create a gardening guide for "${query}" in Portugal (${region}). Month: ${month}.
        Return JSON: { "cropGuide": { "name": "", "scientificName": "", "origin": "", "season": "", "harvest": "", "water": "", "sun": "", "soil": "", "pruning": "", "companions": "", "pests": [], "diseases": [], "treatments": [] } }`;
    } else if (mode === 'treatment') {
        prompt = `Create an organic treatment recipe for "${query}".
        Return JSON: { "treatmentGuide": { "name": "", "description": "", "ingredients": [], "equipment": [], "preparation": [], "application": "", "precautions": "" } }`;
    } else {
        prompt = `Gardening advice for ${month} in ${region} (Portugal). Mode: ${mode}. Details: ${JSON.stringify(details)}. Question: ${query}.
        Return JSON: { "generalTips": "...", "crops": [{ "name": "", "soil": "", "water": "", "sun": "", "fertilizer": "", "pests": "" }], "maintenanceTasks": [{ "title": "", "description": "", "technique": "" }] }`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        throw handleApiError(e, 'conselhos jardinagem');
    }
};

export const getWeatherForecast = async (location: string, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Current weather and 3-day forecast for ${location}. 
            Format as JSON matching this structure (do not use markdown blocks):
            {
                "current": { "temp": "15°C", "condition": "Cloudy", "description": "...", "icon": "cloud" },
                "forecast": [
                    { "date": "...", "min": "...", "max": "...", "summary": "...", "hourly": [{"time": "...", "temp": "...", "condition": "..."}] }
                ]
            }`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        
        const text = response.text || "{}";
        const jsonStr = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        throw handleApiError(e, 'meteorologia');
    }
};

export const generateElectricalGuide = async (request: string, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create an electrical installation guide for: "${request}".
            Include a simple SVG diagram code (embedded in response).
            Return JSON: { "warning": "...", "materials": [], "steps": [], "svgDiagram": "<svg ...>...</svg>" }`,
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        throw handleApiError(e, 'guia elétrico');
    }
};

export const decipherAncientText = async (input: { text?: string, image?: { base64: string, mimeType: string } }, apiKey?: string) => {
    const ai = getAiClient(apiKey);
    const parts: any[] = [];
    if (input.image) parts.push({ inlineData: { data: input.image.base64, mimeType: input.image.mimeType } });
    if (input.text) parts.push({ text: input.text });
    parts.push({ text: "Decipher this ancient text/manuscript. Provide transcription, translation to Portuguese, and historical context. Return JSON: { \"transcription\": \"...\", \"translation\": \"...\", \"context\": \"...\", \"confidence\": \"...\" }" });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: { responseMimeType: 'application/json' }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        throw handleApiError(e, 'decifrar');
    }
};

export const generateAnatomyGuide = async (
    topic: string,
    system: string,
    mode: 'explorer' | 'condition',
    image?: { base64: string; mimeType: string }, // Added optional image support
    apiKey?: string | null
): Promise<{
    title: string;
    description: string;
    function: string;
    location: string;
    keyFacts: string[];
    trivia: string;
}> => {
    const ai = getAiClient(apiKey);
    const systemContext = system.includes('Geral') ? "Auto-detect" : system;
    
    // Construct request parts
    const parts: any[] = [];
    
    if (image) {
        parts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
        // Specific prompt for visual analysis
        parts.push({ text: `
            Act as an expert Medical Consultant/Educator.
            Task: Analyze this image and potential symptoms. 
            Context: User suspects a condition related to "${topic}" or visible symptoms in the image.
            
            CRITICAL: 
            1. DO NOT DIAGNOSE. Provide educational information about *potential* causes based on visual evidence.
            2. Be concise but informative.
            3. Language: Portuguese (PT-PT).

            Output structure (JSON):
            {
                "title": "Name of the most likely condition/structure identified",
                "description": "Visual analysis of the image (what is seen: redness, swelling, structure type, etc.) (max 60 words)",
                "function": "Pathophysiology (Why this happens) OR Physiological Function",
                "location": "Visible body area",
                "keyFacts": ["Possible Cause 1", "Possible Cause 2", "Risk Factor 1", "Symptom Characteristic"],
                "trivia": "Recommended actions, home care, or urgent warning (e.g. 'See a doctor if...') (max 50 words)"
            }
        `});
    } else {
        // Standard text-only prompt
        parts.push({ text: `
            Act as an expert Medical Anatomist.
            Task: Create a detailed educational guide.
            Topic: "${topic}"
            Body System Context: ${systemContext}
            Mode: ${mode === 'condition' ? 'Pathology/Condition' : 'Anatomy Explorer'}
            Language: Portuguese (PT-PT)

            Output strictly in valid JSON format with the following structure:
            {
                "title": "Scientific Name / Title",
                "description": "Comprehensive but concise explanation (max 60 words).",
                "function": "Primary physiological function or mechanism (max 40 words).",
                "location": "Anatomical location.",
                "keyFacts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4"],
                "trivia": "A fascinating fact or historical detail."
            }
        `});
    }
    
    // Use standard config, allow model to determine JSON format or not based on structure if schema not strict
    // For robust JSON, use text mode and instruct model to output JSON string.
    parts.push({ text: "Do not include markdown formatting. Return only the JSON string." });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: 'application/json', // Use robust JSON mode
                maxOutputTokens: 8192
            }
        });
        
        const text = response.text || "{}";
        const jsonStr = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        throw handleApiError(e, 'anatomia');
    }
};