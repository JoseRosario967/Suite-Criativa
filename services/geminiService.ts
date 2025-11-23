import { GoogleGenAI } from "@google/genai";
import { AspectRatio, GeneratedImageResult, ImageQuality } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash-image';
const ANALYSIS_MODEL = 'gemini-2.5-flash';

/**
 * Parses the response from Gemini to extract image data or text.
 */
const parseResponse = (response: any): GeneratedImageResult => {
  let imageUrl: string | null = null;
  let textOutput: string | null = null;

  if (response?.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textOutput = part.text;
      }
    }
  }

  return { imageUrl, textOutput };
};

/**
 * Helper to enhance prompt based on quality settings
 */
const enhancePrompt = (originalPrompt: string, quality: ImageQuality, negativePrompt?: string): string => {
    let finalPrompt = originalPrompt;

    if (quality === 'high') {
        finalPrompt += " . Highly detailed, photorealistic, 8k resolution, cinematic lighting, sharp focus, masterpiece.";
    }

    if (negativePrompt && negativePrompt.trim()) {
        finalPrompt += ` . Ensure the image does NOT contain: ${negativePrompt.trim()}.`;
    }

    return finalPrompt;
};

/**
 * Generates an image based on a text prompt.
 */
export const generateImageFromText = async (
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  quality: ImageQuality = 'standard',
  negativePrompt: string = ''
): Promise<GeneratedImageResult> => {
  try {
    const finalPrompt = enhancePrompt(prompt, quality, negativePrompt);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: finalPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    return parseResponse(response);
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Falha ao gerar a imagem.");
  }
};

/**
 * Edits an existing image based on a text prompt.
 */
export const editImageWithPrompt = async (
  base64Data: string,
  mimeType: string,
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  quality: ImageQuality = 'standard'
  // Note: Negative prompt is typically not supported/reliable in edit mode same way as generation
): Promise<GeneratedImageResult> => {
  try {
    // Only apply quality enhancement for editing
    const finalPrompt = enhancePrompt(prompt, quality);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: finalPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
            aspectRatio: aspectRatio 
        }
      }
    });

    return parseResponse(response);
  } catch (error: any) {
    console.error("Gemini Editing Error:", error);
    throw new Error(error.message || "Falha ao editar a imagem.");
  }
};

/**
 * Creates a montage by combining a background and a subject image.
 */
export const createMontage = async (
  bgBase64: string,
  bgMime: string,
  fgBase64: string,
  fgMime: string,
  instructions: string
): Promise<GeneratedImageResult> => {
  try {
    const prompt = `
      Instructions: ${instructions}
      
      Tasks:
      1. Use the FIRST image provided as the BACKGROUND/ENVIRONMENT.
      2. Use the SECOND image provided as the SUBJECT/OBJECT source.
      3. Seamlessly integrate the subject into the background based on the instructions.
      4. Ensure lighting, shadows, and perspective match perfectly to create a realistic montage.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { data: bgBase64, mimeType: bgMime } },
          { inlineData: { data: fgBase64, mimeType: fgMime } },
          { text: prompt }
        ]
      }
    });

    return parseResponse(response);
  } catch (error: any) {
    console.error("Gemini Montage Error:", error);
    throw new Error(error.message || "Falha ao criar a montagem.");
  }
};

/**
 * Analyzes two images to find the prompt that caused the transformation.
 */
export const analyzeImageDifference = async (
    originalBase64: string,
    originalMime: string,
    editedBase64: string,
    editedMime: string
  ): Promise<string> => {
    try {
      const prompt = `
        Analisa estas duas imagens cuidadosamente.
        A primeira imagem é a ORIGINAL.
        A segunda imagem é a EDITADA.
        
        A tua tarefa é identificar qual foi o comando de texto (prompt) usado numa IA Generativa para transformar a imagem ORIGINAL na EDITADA.
        
        Sê específico sobre mudanças de estilo, objetos adicionados, iluminação ou alterações de cor.
        Responde APENAS com o prompt sugerido, em Português, sem introduções ou explicações adicionais.
      `;
  
      const response = await ai.models.generateContent({
        model: ANALYSIS_MODEL,
        contents: {
          parts: [
            { inlineData: { data: originalBase64, mimeType: originalMime } },
            { inlineData: { data: editedBase64, mimeType: editedMime } },
            { text: prompt }
          ]
        }
      });
  
      return response.text || "Não foi possível identificar as diferenças.";
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      throw new Error(error.message || "Falha ao analisar as imagens.");
    }
  };