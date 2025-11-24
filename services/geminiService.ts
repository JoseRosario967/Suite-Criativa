import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { UploadedImage } from '../types';

// Chave de API da aplicação, usada como fallback
const APP_API_KEY = process.env.API_KEY;

// Função auxiliar para obter o cliente da API com a chave correta
const getAiClient = (personalApiKey?: string | null) => {
    const apiKeyToUse = personalApiKey || APP_API_KEY;
    if (!apiKeyToUse) {
        throw new Error("Nenhuma chave de API configurada. Por favor, adicione a sua chave pessoal nas definições ou configure a chave da aplicação.");
    }
    return new GoogleGenAI({ apiKey: apiKeyToUse });
};

// Centralized error handler for API calls
const handleApiError = (error: unknown, context: string): Error => {
    console.error(`Erro durante ${context}:`, error);

    if (error instanceof Error) {
        // Check for quota error specifically to provide a more helpful message
        if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED')) {
            return new Error("Excedeu a sua quota de utilização da API. Isto pode acontecer ao fazer muitos pedidos rapidamente ou ao atingir o limite do plano gratuito. Por favor, verifique o seu plano e faturação na Google, ou aguarde um momento antes de tentar novamente.");
        }
        
        if (error.message.includes('403') || error.message.includes('permission denied') || error.message.includes('PERMISSION_DENIED')) {
             return new Error("Acesso negado pela API (Erro 403). Isto geralmente acontece porque o modelo selecionado não está disponível na sua chave de API ou região, ou requer faturação ativada no Google Cloud.");
        }

        // Tratamento específico para o erro IMAGE_OTHER que ocorre frequentemente com "remoção"
        if (error.message.includes('IMAGE_OTHER')) {
            return new Error("A geração falhou (Erro: IMAGE_OTHER). A IA recusou editar esta área específica. Tente pintar uma área maior ou usar o modo 'Editar' com um prompt diferente.");
        }
        
        // For all other errors (including our custom validation errors and safety blocks), return them as is.
        // The App.tsx component will display their message.
        return error;
    }
    
    return new Error(`Ocorreu um erro desconhecido durante ${context}.`);
};

// Generic error handler for API responses
const handleApiResponse = (response: any) => {
    // Detailed safety feedback
    if (response.promptFeedback?.blockReason) {
        let reason = `O seu pedido foi bloqueado pelas políticas de segurança. Motivo: ${response.promptFeedback.blockReason}.`;
        const highRiskRatings = response.promptFeedback.safetyRatings?.filter(
            rating => rating.probability === 'HIGH' || rating.probability === 'MEDIUM'
        );
        if (highRiskRatings && highRiskRatings.length > 0) {
            const categories = highRiskRatings.map(r => r.category.replace('HARM_CATEGORY_', '').replace(/_/g, ' ')).join(', ');
            reason += ` Categorias problemáticas detetadas: ${categories}.`;
        }
        reason += " Por favor, ajuste o seu prompt ou a imagem enviada.";
        throw new Error(reason);
    }
    
    const candidate = response.candidates?.[0];

    // Check for other non-successful finishes
    if (!candidate || (candidate.finishReason && candidate.finishReason !== 'STOP')) {
        const finishReasonText = candidate?.finishReason || 'Nenhum resultado retornado';
        throw new Error(`A geração falhou. Motivo: ${finishReasonText}. Por favor, tente novamente ou ajuste o seu pedido.`);
    }

    return candidate;
}

export const generateOrEditImage = async (
  prompt: string,
  images: { base64: string; mimeType: string }[] | undefined,
  options: { aspectRatio?: string; negativePrompt?: string; quality?: string } | undefined,
  personalApiKey?: string | null
): Promise<string> => {
  try {
    const ai = getAiClient(personalApiKey);

    // MODE: GENERATION (Text-to-Image) using Imagen 4
    if (!images || images.length === 0) {
        let finalPrompt = prompt;
        // Append styling hints to prompt for quality, though Imagen 4 is already high quality
        if (options?.quality === 'high') {
            finalPrompt += ", highly detailed, high quality, photorealistic";
        }
        if (options?.negativePrompt) {
             // Common way to handle negative prompts in text if the model doesn't support a specific param, 
             // though prompts like "without [x]" work well.
             finalPrompt += ` --no ${options.negativePrompt}`; 
        }

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: finalPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                // Map aspect ratio directly to the config
                aspectRatio: (options?.aspectRatio as any) || '1:1', 
            },
        });

        const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!base64ImageBytes) {
             throw new Error('Nenhuma imagem gerada retornada pelo modelo Imagen 4.');
        }
        return `data:image/jpeg;base64,${base64ImageBytes}`;

    } else {
        // MODE: EDITING (Image-to-Image/Multimodal) using Gemini 2.5 Flash
        // Gemini 2.5 is better suited for multimodal tasks currently in this setup
        const parts: any[] = [];

        // Construct prompt with options manually appended since we are using generateContent
        let finalEditPrompt = prompt;
        if (options?.negativePrompt) finalEditPrompt += ` | negative prompt: ${options.negativePrompt}`;
        if (options?.quality === 'high') finalEditPrompt += `, high quality`;
        // Note: Aspect ratio via text in Gemini 2.5 is a suggestion, not a hard constraint like in Imagen.

        if (!finalEditPrompt) {
            throw new Error('É necessário um prompt de texto.');
        }
        parts.push({ text: finalEditPrompt });

        for (const image of images) {
            if (!image.mimeType.startsWith('image/')) {
            throw new Error('Tipo MIME de imagem inválido. Apenas ficheiros de imagem são suportados.');
            }
            parts.push({
            inlineData: {
                data: image.base64,
                mimeType: image.mimeType,
            },
            });
        }

        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE],
        },
        });
        
        const candidate = handleApiResponse(response);
        
        if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
            if (part.inlineData) {
            const { data, mimeType } = part.inlineData;
            return `data:${mimeType};base64,${data}`;
            }
        }
        }
        
        throw new Error('Nenhum dado de imagem encontrado na resposta da API.');
    }

  } catch (error) {
    throw handleApiError(error, 'geração/edição de imagem');
  }
};

export const generateWithMask = async (
    userPrompt: string,
    originalImage: UploadedImage,
    maskImage: UploadedImage,
    personalApiKey?: string | null
): Promise<string> => {
    const ai = getAiClient(personalApiKey);

    // Check specific modes based on the prompt sent by MaskEditor
    const isMagicEraser = userPrompt.includes("Remove masked content") || userPrompt.includes("reconstruct background") || userPrompt.includes("Texture Synthesis");
    const isEnhance = userPrompt.includes("Enhance details") || userPrompt.includes("fix blur");

    let strategies;

    if (isMagicEraser) {
        // ERASER MODE: Use the aggressive strategies we tuned to bypass safety filters and fix watermarks
        // REORDERED: Texture Synthesis is now FIRST to save credits and reduce retries on stubborn watermarks.
        strategies = [
            {
                // Strategy 1: Texture Synthesis (Best for stubborn marks/text)
                // THIS MUST BE FIRST
                systemInstruction: `Texture Synthesis Engine.
                Treat masked pixels as missing data. 
                Mathematically extrapolate neighbor pixels to fill the gap.
                No new objects. No text.`,
                prompt: "Synthesize background texture."
            },
            {
                // Strategy 2: Balanced Inpainting (Smart Reconstruction - Fallback)
                // Focuses on seamless integration with the surrounding context.
                systemInstruction: `You are an expert Digital Image Restorer.
                TASK: The masked area contains unwanted artifacts (like text or objects) that need to be removed.
                GOAL: Reconstruct the masked area by extending the SURROUNDING visual context (lines, textures, colors, and lighting) into the void.
                STRICT CONSTRAINT: Ensure perfect continuity with the unmasked image. Do NOT generate text, logos, or symbols. Do NOT leave the area blank.`,
                prompt: "Inpaint the masked region to match the surrounding background seamlessly."
            },
            {
                // Strategy 3: Simple Fallback
                systemInstruction: `Fill the masked area to match the background.`,
                prompt: "Fill with background."
            }
        ];
    } else if (isEnhance) {
        // ENHANCE/SHARPEN MODE
        // Optimized for deblurring faces and objects in the background
        strategies = [
            {
                systemInstruction: `You are an advanced Image Restoration AI specialized in Super-Resolution and Face Restoration.
                TASK: The masked area is blurry, low-resolution, or out of focus.
                GOAL: Reconstruct the area with extreme high definition.
                CRITICAL: You must hallucinate/invent realistic high-frequency details (eyelashes, skin texture, fabric weave, sharp edges) that are missing from the source due to blur.
                Do not just adjust contrast; REGENERATE the visual data based on the surrounding context to make it look like it was shot with a sharp lens.
                If the masked area contains a face, ensure it is photorealistic, sharp, and anatomically correct, while maintaining the original identity and lighting.`,
                prompt: "High-fidelity restoration: Sharpen, deblur, and reconstruct fine details in the masked area to 4K quality."
            }
        ];
    } else {
        // EDIT MODE: Use the user's actual prompt (e.g., "Add a hat")
        strategies = [
            {
                systemInstruction: `You are a helpful expert image editor. Your task is to edit the image according to the user's prompt, applying changes ONLY to the masked area while keeping the rest of the image intact.`,
                prompt: userPrompt
            }
        ];
    }

    let lastError: unknown;

    for (const strategy of strategies) {
        try {
            const parts = [
                { text: strategy.prompt },
                { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
                { inlineData: { data: maskImage.base64, mimeType: maskImage.mimeType } },
            ];
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                    systemInstruction: strategy.systemInstruction
                },
            });

            const candidate = handleApiResponse(response);
            
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                        const { data, mimeType } = part.inlineData;
                        return `data:${mimeType};base64,${data}`;
                    }
                }
            }
        } catch (error: any) {
            console.warn(`Strategy failed: ${strategy.prompt}`, error.message);
            lastError = error;
            
            // If it's not an IMAGE_OTHER error and not a finishReason error, it might be something else (like quota), so throw immediately.
            // But for Edit mode, we usually want to see the error.
            if (!isMagicEraser) {
                 throw handleApiError(error, 'edição com máscara');
            }

            if (!error.message.includes('IMAGE_OTHER') && !error.message.includes('finishReason')) {
                 throw handleApiError(error, 'edição com máscara');
            }
        }
    }
    
    throw handleApiError(lastError, 'edição com máscara (após várias tentativas). Tente pintar uma área maior.');
};

export const discoverImagePrompt = async (
  image: { base64: string; mimeType: string },
  personalApiKey?: string | null
): Promise<string> => {
  try {
    const ai = getAiClient(personalApiKey);
    const instruction = `Descreva esta imagem em detalhe, criando um prompt de texto que poderia ser usado para gerá-la com IA. O prompt deve ser rico em detalhes visuais, estilo artístico, composição e iluminação. Responda apenas com o texto do prompt, sem frases introdutórias.`;

    const parts = [
      { text: instruction },
      { inlineData: { data: image.base64, mimeType: image.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });

    const text = response.text;
    if (!text) {
        throw new Error('Nenhum prompt de texto encontrado na resposta da API. A resposta pode estar vazia.');
    }
    return text.trim();

  } catch (error) {
    throw handleApiError(error, 'descoberta de prompt de imagem');
  }
};

export const discoverEditPrompt = async (
  originalImage: { base64: string; mimeType: string },
  editedImage: { base64: string; mimeType: string },
  personalApiKey?: string | null
): Promise<string> => {
  try {
    const ai = getAiClient(personalApiKey);
    const instruction = `Compare a primeira imagem (original) com a segunda (editada). Descreva a edição que foi feita para transformar a primeira na segunda. A sua resposta deve ser um prompt de texto conciso que poderia ser usado por uma IA de edição de imagem para aplicar a mesma alteração. Responda apenas com o texto do prompt, sem frases introdutórias. Exemplo: "adicione um chapéu de pirata ao gato" ou "mude a cor do céu para um tom de pôr do sol".`;

    const parts = [
      { text: instruction },
      { inlineData: { data: originalImage.base64, mimeType: originalImage.mimeType } },
      { inlineData: { data: editedImage.base64, mimeType: editedImage.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
    });
    
    const text = response.text;
    if (!text) {
        throw new Error('Nenhuma descrição de edição encontrada na resposta da API.');
    }
    return text.trim();

  } catch (error) {
    throw handleApiError(error, 'descoberta de prompt de edição');
  }
};


export const generateMontage = async (
  userPrompt: string,
  backgroundImage: { base64: string; mimeType: string },
  subjectImage: { base64: string; mimeType: string },
  personalApiKey?: string | null
): Promise<string> => {
  try {
    const ai = getAiClient(personalApiKey);
    const instruction = `Crie uma montagem fotográfica. Utilize a primeira imagem como fundo. Identifique o sujeito principal na segunda imagem, recorte-o e insira-o no fundo de acordo com a seguinte instrução do utilizador: "${userPrompt}". Assegure que a iluminação, sombras e escala são consistentes e realistas. A saída deve ser apenas a imagem final composta.`;

    const parts = [
      { text: instruction },
      { inlineData: { data: backgroundImage.base64, mimeType: backgroundImage.mimeType } },
      { inlineData: { data: subjectImage.base64, mimeType: subjectImage.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidate = handleApiResponse(response);

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const { data, mimeType } = part.inlineData;
          return `data:${mimeType};base64,${data}`;
        }
      }
    }

    throw new Error('Nenhuma imagem de montagem encontrada na resposta da API. A resposta pode estar vazia ou incompleta.');
  } catch (error) {
    throw handleApiError(error, 'geração de montagem');
  }
};

export const restoreImage = async (
  image: { base64: string; mimeType: string },
  personalApiKey?: string | null
): Promise<string> => {
  try {
    const ai = getAiClient(personalApiKey);
    const instruction = `Restaura esta fotografia antiga. Melhora a nitidez, corrige as cores desbotadas, remove o grão e quaisquer pequenas imperfeições como pó ou arranhões. Aumenta a resolução e a claridade geral, mantendo o aspeto original e a autenticidade da fotografia. A saída deve ser apenas a imagem restaurada de alta qualidade.`;

    const parts = [
      { text: instruction },
      { inlineData: { data: image.base64, mimeType: image.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidate = handleApiResponse(response);
    
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const { data, mimeType } = part.inlineData;
          return `data:${mimeType};base64,${data}`;
        }
      }
    }
    
    // Fallback error if no image is found for other reasons
    throw new Error('Nenhum dado de imagem encontrado na resposta da API. A resposta pode estar vazia ou incompleta.');

  } catch (error) {
    throw handleApiError(error, 'restauro de imagem');
  }
};

export const generatePoetry = async (
    keywords: string,
    textType: string,
    tone: string,
    personalApiKey?: string | null
): Promise<string> => {
    try {
        const ai = getAiClient(personalApiKey);
        const prompt = `Aja como um escritor criativo perito. 
        TAREFA: Crie um(a) ${textType.toLowerCase()} em português no estilo ${tone.toLowerCase()}.
        CONTEÚDO: O texto deve ser original e incorporar as seguintes palavras-chave ou ideias: "${keywords}".
        FORMATAÇÃO IMPORTANTE:
        - Use QUEBRAS DE LINHA para separar os versos.
        - Use LINHAS EM BRANCO para separar as estrofes.
        - Não escreva o texto num bloco único. Respeite a estrutura poética.
        
        A sua resposta deve conter APENAS o texto criativo final, sem introduções, títulos ou explicações adicionais.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        handleApiResponse(response); // Use for safety checks etc.
        
        const text = response.text;
        if (!text) {
            throw new Error('Nenhum texto encontrado na resposta da API.');
        }
        return text.trim();

    } catch (error) {
        throw handleApiError(error, 'geração de poesia');
    }
};

export const removeBackground = async (
  image: { base64: string; mimeType: string },
  personalApiKey?: string | null
): Promise<string> => {
  try {
    const ai = getAiClient(personalApiKey);
    const instruction = `Isole o sujeito principal nesta imagem e torne o fundo completamente transparente. A saída deve ser uma imagem PNG com um fundo transparente.`;

    const parts = [
      { text: instruction },
      { inlineData: { data: image.base64, mimeType: image.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidate = handleApiResponse(response);
    
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const { data, mimeType } = part.inlineData;
          // Ensure the returned mimeType is png for transparency
          return `data:image/png;base64,${data}`;
        }
      }
    }
    
    throw new Error('Nenhum dado de imagem encontrado na resposta da API para a remoção de fundo.');

  } catch (error) {
    throw handleApiError(error, 'remoção de fundo');
  }
};

export const upscaleImage = async (
  image: { base64: string; mimeType: string },
  personalApiKey?: string | null
): Promise<string> => {
  try {
    const ai = getAiClient(personalApiKey);
    const instruction = `Aja como um especialista em restauração de imagem profissional. A sua tarefa é melhorar drasticamente a qualidade desta imagem. Aplique as seguintes técnicas:
1.  **Super Resolução:** Aumente a resolução da imagem, adicionando detalhes finos e realistas.
2.  **Nitidez (Deblurring):** Corrija qualquer desfocagem de movimento ou de foco para tornar a imagem perfeitamente nítida.
3.  **Remoção de Ruído (Denoising):** Elimine qualquer grão digital ou ruído sem perder a textura natural.
4.  **Melhoria Geral:** Ajuste a claridade e o contraste para um resultado de alta definição com qualidade profissional.
O resultado final deve ser apenas a imagem melhorada, sem qualquer texto adicional.`;

    const parts = [
      { text: instruction },
      { inlineData: { data: image.base64, mimeType: image.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidate = handleApiResponse(response);
    
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const { data, mimeType } = part.inlineData;
          return `data:${mimeType};base64,${data}`;
        }
      }
    }
    
    throw new Error('Nenhum dado de imagem encontrado na resposta da API para o upscaling.');

  } catch (error) {
    throw handleApiError(error, 'melhoria de imagem (upscaling)');
  }
};

export const transcribeAudio = async (
  audio: { base64: string; mimeType: string },
  personalApiKey?: string | null
): Promise<{ original: string; translation: string }> => {
  try {
    const ai = getAiClient(personalApiKey);
    const instruction = `You are an expert transcriber and translator. 
    Task 1: Transcribe the audio exactly as spoken in its original language.
    Task 2: Translate the transcribed text into accurate, natural Portuguese.
    
    IMPORTANT FORMATTING INSTRUCTIONS:
    - If the audio is music, a song, or poetry, YOU MUST PRESERVE the artistic structure.
    - Use SINGLE newline characters (\\n) to separate individual verses.
    - Use DOUBLE newline characters (\\n\\n) to separate stanzas/paragraphs.
    - Do NOT output the text as a single continuous paragraph if it is lyrical.
    - Apply this formatting rule to BOTH the original transcription and the translation.
    
    Return the result as a JSON object with two keys:
    - "original": The transcription in the original language (with newlines for structure).
    - "translation": The Portuguese translation (with newlines for structure).
    `;

    const parts = [
      { text: instruction },
      { inlineData: { data: audio.base64, mimeType: audio.mimeType } },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
          responseMimeType: 'application/json',
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  original: { type: Type.STRING },
                  translation: { type: Type.STRING },
              }
          }
      }
    });

    handleApiResponse(response); // Use for safety checks etc.
    
    const text = response.text;
    if (!text) {
        throw new Error('Nenhum texto encontrado na resposta da API.');
    }
    
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error('A resposta da IA não estava no formato JSON esperado.');
    }

  } catch (error) {
    throw handleApiError(error, 'transcrição de áudio');
  }
};

export const generatePortrait = async (
  userPrompt: string,
  images: { base64: string; mimeType: string }[],
  personalApiKey?: string | null
): Promise<string> => {
  try {
    const ai = getAiClient(personalApiKey);
    const instruction = `Aja como um artista de retratos compósitos perito. A sua tarefa é criar um novo retrato único, combinando características das várias imagens de origem fornecidas, conforme descrito no pedido do utilizador. O pedido de texto especificará como misturar as imagens (ex: 'use os olhos da primeira imagem e o cabelo da segunda'). Preste muita atenção ao pedido para misturar as feições corretamente. A semelhança com as características mencionadas é a prioridade máxima. Responda apenas com a imagem final gerada. Pedido do utilizador: "${userPrompt}"`;

    const parts: any[] = [{ text: instruction }];
    
    for (const image of images) {
        parts.push({
            inlineData: {
                data: image.base64,
                mimeType: image.mimeType,
            },
        });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidate = handleApiResponse(response);
    
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const { data, mimeType } = part.inlineData;
          return `data:${mimeType};base64,${data}`;
        }
      }
    }
    
    throw new Error('Nenhum dado de imagem encontrado na resposta da API para o retrato.');

  } catch (error) {
    throw handleApiError(error, 'geração de retrato');
  }
};

export const translateText = async (
    text: string,
    targetLanguage: string,
    personalApiKey?: string | null
): Promise<string> => {
    try {
        const ai = getAiClient(personalApiKey);
        const instruction = `You are an expert Universal Translator.
        TASK: Translate the provided text into ${targetLanguage}.
        
        REQUIREMENTS:
        1. Auto-detect the source language.
        2. Maintain the original tone, style, and nuance (e.g., formal, casual, poetic, technical).
        3. If the input is slang or an idiom, translate the *meaning* culturally, not literally.
        4. Return ONLY the translated text, without explanations or introductory phrases.
        
        Input Text:
        "${text}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: instruction,
        });

        handleApiResponse(response);
        
        const result = response.text;
        if (!result) {
            throw new Error('Nenhuma tradução retornada.');
        }
        return result.trim();

    } catch (error) {
        throw handleApiError(error, 'tradução de texto');
    }
};

// Helper to clean and normalize lists from AI response (Bulletproof version)
const cleanList = (input: any): string[] => {
    if (Array.isArray(input)) return input.map(String);
    if (!input) return []; // Handle null/undefined safety
    if (typeof input !== 'string') return [];

    const trimmed = input.trim();
    
    // Try to parse as real JSON first to handle quotes/commas properly
    // This avoids regex pitfalls with complex strings
    try {
        // If it looks like a JS array with single quotes, replace them first
        const jsonString = trimmed.replace(/'/g, '"');
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {
        // Ignore parsing errors and fallback to simple split
    }

    // Fallback: Brute force split. 
    const content = trimmed.replace(/^\[|\]$/g, '');
    if (!content) return [];
    
    // If the text contains newlines but NO commas (or very few), it might be a bulleted list
    // e.g. "1. Eggs\n2. Milk"
    if (content.includes('\n') && content.split(',').length < 2) {
         // Split by newline and clean up common list markers
         return content.split('\n')
            .map(s => s.trim().replace(/^[-*•\d.]+\s*/, '').replace(/^['"]+|['"]+$/g, ''))
            .filter(s => s.length > 0);
    }
    
    // Split by comma and clean up quotes from each item
    return content.split(',').map(s => s.trim().replace(/^['"]+|['"]+$/g, ''));
};

// Helper to find a key in an object case-insensitively
const findKey = (obj: any, keyTarget: string): any => {
    if (!obj) return undefined;
    const keyLower = keyTarget.toLowerCase();
    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === keyLower);
    return foundKey ? obj[foundKey] : undefined;
};

export const generateRecipe = async (
    inputs: {
        ingredients: string;
        mealType: string;
        dietary: string;
        servings: string;
        difficulty: string;
        images?: { base64: string; mimeType: string }[]; // UPDATED: accepts multiple images
    },
    personalApiKey?: string | null
): Promise<{
    recipe: {
        title: string;
        description: string;
        time: string;
        ingredients: string[];
        instructions: string[];
        tips: string;
    };
}> => {
    try {
        const ai = getAiClient(personalApiKey);
        
        let prompt = `You are a Michelin Star Chef. Create a creative and delicious recipe.
        
        INPUTS:
        - Ingredients available: ${inputs.ingredients}
        - Meal Type: ${inputs.mealType}
        - Dietary Restrictions: ${inputs.dietary}
        - Servings: ${inputs.servings}
        - Difficulty: ${inputs.difficulty}
        
        INSTRUCTIONS:
        1. If images are provided, analyze them to identify additional ingredients and use them in the recipe.
        2. Be creative! Use the provided ingredients as the star, but you can assume basic pantry staples (oil, salt, spices, flour, etc.) are available.
        3. The output MUST be in valid JSON format. DO NOT wrap the JSON in markdown code blocks.
        4. Structure:
        {
            "title": "Recipe Title",
            "description": "A short, appetizing description of the dish.",
            "time": "Total preparation and cooking time",
            "ingredients": ["List of ingredients with quantities"],
            "instructions": ["Step 1...", "Step 2..."],
            "tips": "Chef's secret tip or beverage pairing suggestion."
        }
        5. Write the recipe in PORTUGUESE (Portugal).
        `;

        const parts: any[] = [{ text: prompt }];
        
        // Loop through multiple images if present
        if (inputs.images && inputs.images.length > 0) {
            for (const img of inputs.images) {
                parts.push({
                    inlineData: {
                        data: img.base64,
                        mimeType: img.mimeType,
                    }
                });
            }
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                maxOutputTokens: 8192, // Increase limit to prevent cut-off for long recipes
                responseMimeType: 'application/json',
            }
        });

        handleApiResponse(response);
        
        let text = response.text;
        if (!text) {
            throw new Error('Nenhuma receita gerada.');
        }
        
        // Clean potential markdown code blocks which often confuse JSON.parse
        text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        
        try {
            const json = JSON.parse(text);
            
            // Robustness check: Ensure arrays are actually arrays using our bulletproof cleaner
            // And handle case-insensitive keys if the model translated them
            const ingredientsRaw = findKey(json, 'ingredients') || findKey(json, 'ingredientes') || findKey(json, 'components') || [];
            const instructionsRaw = findKey(json, 'instructions') || findKey(json, 'instrucoes') || findKey(json, 'preparacao') || findKey(json, 'steps') || [];
            const tipsRaw = findKey(json, 'tips') || findKey(json, 'dicas') || "";

            json.ingredients = cleanList(ingredientsRaw);
            json.instructions = cleanList(instructionsRaw);
            json.tips = tipsRaw; 

            return { recipe: json };
        } catch (e) {
            console.error("JSON Parse Error:", e, text);
            throw new Error('Erro ao processar o formato da receita. Tente novamente.');
        }

    } catch (error) {
        throw handleApiError(error, 'criação de receita');
    }
};

export const generateGardeningAdvice = async (
    month: string,
    region: string,
    mode: 'cultivate' | 'maintain',
    params: {
        action?: string; // 'Semear' or 'Plantar' (for cultivate mode)
        category?: string; // 'Hortaliças', 'Leguminosas', etc. (for cultivate mode)
        maintenanceType?: string; // 'Podas', 'Limpeza', etc. (for maintain mode)
    },
    specificQuestion?: string,
    personalApiKey?: string | null
): Promise<{
    generalTips: string;
    crops?: {
        name: string;
        soil: string;
        water: string;
        sun: string;
        fertilizer: string;
        pests: string;
    }[];
    maintenanceTasks?: {
        title: string;
        description: string;
        technique: string;
    }[];
}> => {
    try {
        const ai = getAiClient(personalApiKey);
        
        let taskDescription = "";
        let jsonStructure = "";

        if (mode === 'cultivate') {
            // Distinguish between Sowing (Seeds) and Planting (Transplants/Seedlings)
            const actionVerb = params.action?.toLowerCase().includes('semear') 
                ? 'SOW (from seed / sementeira)' 
                : 'PLANT (transplant seedlings / muda / estaca)';

            // STRICT CATEGORY DEFINITIONS TO AVOID MIXING
            let categoryContext = "";
            const category = params.category || "";
            
            if (category.includes('Hortaliças')) {
                categoryContext = `
                STRICT CATEGORY DEFINITION: "Hortaliças" (Leafy Greens & Brassicas).
                INCLUDE: Lettuce (Alfaces), Cabbage (Couves), Spinach (Espinafres), Chard (Acelgas), Watercress (Agriões).
                EXCLUDE: Roots (Carrots, Onions, Beets), Legumes (Peas, Beans), Herbs (Parsley, Coriander).
                `;
            } else if (category.includes('Raízes')) {
                categoryContext = `
                STRICT CATEGORY DEFINITION: "Raízes e Tubérculos" (Underground Crops).
                INCLUDE: Carrots (Cenouras), Potatoes (Batatas), Onions (Cebolas), Garlic (Alhos), Beets (Beterrabas), Turnips (Nabos).
                EXCLUDE: Leafy greens, Legumes.
                `;
            } else if (category.includes('Leguminosas')) {
                categoryContext = `
                STRICT CATEGORY DEFINITION: "Leguminosas" (Legumes/Pods).
                INCLUDE: Beans (Feijão), Peas (Ervilhas), Favas (Favas).
                EXCLUDE: Anything else.
                `;
            } else if (category.includes('Aromáticas')) {
                categoryContext = `
                STRICT CATEGORY DEFINITION: "Ervas Aromáticas" (Herbs).
                INCLUDE: Parsley (Salsa), Coriander (Coentros), Mint (Hortelã), Basil (Manjericão).
                EXCLUDE: Leafy vegetables.
                `;
            }

            taskDescription = `
            TASK: Recommend the TOP 20 best crops to ${actionVerb} in the ${category} category SPECIFICALLY for the region: ${region} in ${month}.
            
            STRICT CONSTRAINTS:
            1. METHOD FILTER: The user specifically selected "${params.action}". 
               - If SOWING ("Semear"), ONLY list crops that are started from seed at this time. Do NOT list crops that must be transplanted as seedlings now.
               - If PLANTING ("Plantar"), ONLY list crops that are transplanted as seedlings/mudas now. Do NOT list crops that must be sown from seed.
               - Do NOT mix them. Be a strict agronomist.
            2. CATEGORY FILTER: ${categoryContext}
            3. REGIONAL FOCUS: Filter out crops that do not grow well in ${region} at this time.
            4. ESSENTIALS: Prioritize Portuguese staples (e.g., Alhos, Cebolas, Batatas, Couves) if they match the method, category, and timing.
            5. BREVITY: Keep all descriptions under 5 words. Example: "Sandy loam" instead of "It prefers sandy loam soil". This is vital to avoid error MAX_TOKENS.
            6. QUANTITY: Limit to a maximum of 20 items to ensure the response completes.
            `;
            jsonStructure = `
            "crops": [
                {
                    "name": "Crop Name",
                    "soil": "Brief soil type (max 5 words)",
                    "water": "Brief watering needs (max 5 words)",
                    "sun": "Brief sun needs (max 5 words)",
                    "fertilizer": "Brief organic fertilizer (max 5 words)",
                    "pests": "Common pests & brief bio treatment (max 5 words)"
                }
            ]
            `;
        } else {
            // FIX: Strict instruction to focus ONLY on the selected maintenance type
            taskDescription = `
            TASK: Provide expert maintenance advice STRICTLY and EXCLUSIVELY for the category: "${params.maintenanceType}".
            CONTEXT: Month: ${month}, Region: ${region}.
            CRITICAL: Do NOT provide general gardening advice. Only list tasks directly related to ${params.maintenanceType}.
            For example, if the category is "Pest Control", only list pests active now and their organic treatments. If "Pruning", only list plants that need pruning now.
            BREVITY: Keep descriptions concise to avoid hitting token limits.
            `;
            jsonStructure = `
            "maintenanceTasks": [
                {
                    "title": "Task Title (e.g., Dealing with Aphids)",
                    "description": "Why this is needed now",
                    "technique": "How to do it correctly and organically"
                }
            ]
            `;
        }

        const prompt = `Act as an expert Portuguese Agronomist and Organic Farmer (like the 'Borda d'Água' almanac).
        
        CONTEXT:
        - Month: ${month}
        - Region of Portugal: ${region}
        - Mode: ${mode}
        - Specific User Question (optional): ${specificQuestion || "None"}
        ${taskDescription}

        OUTPUT FORMAT (JSON ONLY):
        {
            "generalTips": "General advice for this month/region or answer to specific question.",
            ${jsonStructure}
        }
        
        IMPORTANT: Write everything in PORTUGUESE (Portugal).`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                maxOutputTokens: 8192, // Increased limit for comprehensive lists
            }
        });

        handleApiResponse(response);
        const text = response.text;
        if(!text) throw new Error("No response text");

        return JSON.parse(text);

    } catch (error) {
        throw handleApiError(error, 'conselhos de jardinagem');
    }
};

export const getWeatherForecast = async (
    location: string,
    personalApiKey?: string | null
): Promise<{
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
}> => {
    try {
        const ai = getAiClient(personalApiKey);
        const modelName = 'gemini-2.5-flash'; 

        const prompt = `
        SEARCH QUERY: "Current weather observation and hourly forecast for ${location} Portugal. Source: IPMA or The Weather Channel or AccuWeather".
        
        TASK: 
        1. Use Google Search to find accurate weather data for ${location}. 
           CRITICAL: Prioritize official sources like IPMA (Instituto Português do Mar e da Atmosfera) for accuracy in Portugal to reduce variance.
           Get the CURRENT observed temperature, not just the day's average.
        2. Translate ALL weather conditions and descriptions into PORTUGUESE (Portugal).
           - "Sunny" -> "Sol"
           - "Partly Cloudy" -> "Céu Nublado" or "Nuvens Dispersas"
           - "Rain" -> "Chuva"
           - "Clear" -> "Céu Limpo"
        3. STYLE: Use "Popular Portuguese" language for descriptions.
           - Instead of "Heavy precipitation", say "Vai chover a potes" or "Chuva forte".
           - Instead of "High UV index", say "Sol de estalar".
           - Be friendly, like a neighbor giving advice.

        OUTPUT JSON STRUCTURE:
        {
            "current": {
                "temp": "Current temperature (e.g. 25°C)",
                "condition": "Short condition in PT (e.g. Sol, Chuva)",
                "description": "Short popular phrase in PT.",
                "icon": "One of: sun, rain, cloud, snow, storm, fog"
            },
            "forecast": [
                {
                    "date": "Day name (e.g. Segunda, Terça)",
                    "min": "Min temp",
                    "max": "Max temp",
                    "summary": "Short popular advice in PT (e.g. Leve guarda-chuva)",
                    "hourly": [
                        {
                            "time": "Hour (e.g. 09:00)",
                            "temp": "Temp",
                            "condition": "Short condition in PT"
                        }
                        // CRITICAL: Provide data every 3 hours (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00).
                        // We need at least 8 time slots per day to track weather changes accurately.
                    ]
                }
                // ... next 5 days
            ]
        }
        
        RETURN ONLY THE JSON. Ensure NO English words remain in the output values.
        `;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        let text = response.text;
        if (!text) throw new Error("Não foi possível obter a previsão.");

        // Clean markdown
        text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Weather JSON Parse Error:", text);
            throw new Error("Erro ao processar os dados meteorológicos.");
        }

    } catch (error) {
        throw handleApiError(error, 'previsão do tempo');
    }
};