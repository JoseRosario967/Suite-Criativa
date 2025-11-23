
import { Watermark, WatermarkSettings, WatermarkPosition } from '../types';
import JSZip from 'jszip';

/**
 * Loads an image from a source (URL or Base64)
 */
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

/**
 * Helper to save a Blob as a file without external dependencies
 */
const saveBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Applies a watermark to a base image and returns the result as a Base64 string.
 */
export const applyWatermarkToImage = async (
  baseImageSrc: string,
  watermark: Watermark,
  settings: WatermarkSettings
): Promise<string> => {
  try {
    const baseImg = await loadImage(baseImageSrc);
    const watermarkImg = await loadImage(watermark.previewUrl);

    const canvas = document.createElement('canvas');
    canvas.width = baseImg.width;
    canvas.height = baseImg.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error("Could not get canvas context");

    // Draw Base Image
    ctx.drawImage(baseImg, 0, 0);

    // Calculate Watermark Size (maintain aspect ratio, scale relative to base image)
    const scale = settings.scale || 0.25; // Default to 25% if undefined
    const targetWidth = baseImg.width * scale; 
    const aspectRatio = watermarkImg.width / watermarkImg.height;
    const targetHeight = targetWidth / aspectRatio;

    // Calculate Position
    let x = 0;
    let y = 0;
    const padding = baseImg.width * 0.05; // 5% padding

    const pos = settings.position;

    // Horizontal
    if (pos.includes('left')) x = padding;
    else if (pos.includes('right')) x = baseImg.width - targetWidth - padding;
    else x = (baseImg.width - targetWidth) / 2; // Center

    // Vertical
    if (pos.includes('top')) y = padding;
    else if (pos.includes('bottom')) y = baseImg.height - targetHeight - padding;
    else y = (baseImg.height - targetHeight) / 2; // Middle

    // Draw Watermark
    ctx.globalAlpha = settings.opacity / 100;
    ctx.drawImage(watermarkImg, x, y, targetWidth, targetHeight);

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error("Error applying watermark:", error);
    return baseImageSrc; // Return original if failure
  }
};

/**
 * Process a batch of images: Apply watermark and return a ZIP file.
 */
export const processBatchWatermark = async (
  files: File[],
  watermark: Watermark,
  settings: WatermarkSettings,
  onProgress: (progress: number) => void
): Promise<void> => {
  const zip = new JSZip();
  const folder = zip.folder("imagens-com-marca-agua");
  
  let processedCount = 0;

  for (const file of files) {
    // Read file to base64
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    // Apply Watermark
    const resultBase64 = await applyWatermarkToImage(base64, watermark, settings);
    
    // Remove Data URL header for ZIP
    const imgData = resultBase64.split(',')[1];
    
    // Add to ZIP
    folder?.file(file.name, imgData, { base64: true });

    processedCount++;
    onProgress(Math.round((processedCount / files.length) * 100));
  }

  // Generate ZIP
  const content = await zip.generateAsync({ type: "blob" });
  saveBlob(content, "imagens-marca-agua.zip");
};
