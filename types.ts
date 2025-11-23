
export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type ImageQuality = 'standard' | 'high';

export interface GeneratedImageResult {
  imageUrl: string | null;
  textOutput: string | null;
}

export interface AppError {
  message: string;
  details?: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  GENERATOR = 'GENERATOR',
  EDITOR = 'EDITOR',
  DISCOVERY = 'DISCOVERY',
  TEXT_EDITOR = 'TEXT_EDITOR',
  BATCH_WATERMARK = 'BATCH_WATERMARK',
  LOTTERY = 'LOTTERY', 
  MONTAGE = 'MONTAGE',
  // Future Placeholders
  CHEF = 'CHEF',
  GARDEN = 'GARDEN',
  WEATHER = 'WEATHER',
  VIDEO = 'VIDEO',
  POETRY = 'POETRY'
}

export interface UploadedFile {
  file?: File; 
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

export interface EditorInitialState {
  image: UploadedFile;
  prompt: string;
}

// Watermark Types
export type WatermarkPosition = 
  'top-left' | 'top-center' | 'top-right' |
  'middle-left' | 'middle-center' | 'middle-right' |
  'bottom-left' | 'bottom-center' | 'bottom-right';

export interface Watermark {
  id: string;
  name: string;
  base64Data: string;
  previewUrl: string;
}

export interface WatermarkSettings {
  activeWatermarkId: string | null;
  opacity: number; // 0 to 100
  position: WatermarkPosition;
  scale: number; // 0.1 to 1.0 (relative to image size)
  isEnabled: boolean; // Global toggle
}

export interface AdvancedSettings {
  quality: ImageQuality;
  aspectRatio: AspectRatio;
  negativePrompt: string;
}

// Gallery Types
export interface SavedImage {
  id: string;
  base64Data: string;
  mimeType: string;
  timestamp: number;
  prompt: string;
  tags: string[];
  width?: number;
  height?: number;
}

// Prompt Templates
export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
}