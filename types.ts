
export interface UploadedImage {
  id: string;
  dataUrl: string;
  base64: string;
  mimeType: string;
}

export type WatermarkPosition = 
    | 'top-left' | 'top-center' | 'top-right'
    | 'middle-left' | 'middle-center' | 'middle-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface Watermark {
    id: string;
    name: string;
    dataUrl: string;
    opacity: number;
    scale: number;
    position: WatermarkPosition;
}

export interface HistoryItem {
    id:string;
    prompt: string;
    imageUrl: string;
    timestamp: number;
    originalImages?: string[]; // dataUrls of the original images if it was an edit
}

export type ActiveView = 'dashboard' | 'generator' | 'textEditor' | 'montage' | 'restoration' | 'maskEditor' | 'euromillions' | 'video' | 'interiorDesign' | 'poetry' | 'backgroundRemover' | 'upscaler' | 'transcription' | 'portrait' | 'magicEraser' | 'translator' | 'chef' | 'gardening' | 'weather';

export interface PromptTemplate {
    id: string;
    name: string;
    template: string;
}

export interface TextLayer {
  id: string;
  text: string;
  font: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
  textAlign: CanvasTextAlign;
  width: number; // For hit detection and bounding box
  height: number; // For hit detection and bounding box
}

declare global {
    // FIX: To resolve declaration merging issues, define the `AIStudio` interface
    // within the `declare global` block. This ensures a single, globally-scoped
    // definition that can be correctly merged for the `window.aistudio` property.
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        // FIX: Made 'aistudio' optional to resolve the "All declarations of 'aistudio' must have identical modifiers" error. This is safe as the consuming code already checks for its existence before use.
        aistudio?: AIStudio;
    }
}