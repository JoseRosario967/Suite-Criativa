import type { Watermark, WatermarkPosition } from '../types';

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
    });
};

export const applyWatermark = async (baseImageSrc: string, watermark: Watermark): Promise<string> => {
    try {
        const [baseImage, watermarkImage] = await Promise.all([
            loadImage(baseImageSrc),
            loadImage(watermark.dataUrl)
        ]);

        const canvas = document.createElement('canvas');
        canvas.width = baseImage.width;
        canvas.height = baseImage.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Draw base image
        ctx.drawImage(baseImage, 0, 0);

        // Watermark settings
        ctx.globalAlpha = watermark.opacity;

        const wmWidth = baseImage.width * watermark.scale;
        const wmHeight = (watermarkImage.height / watermarkImage.width) * wmWidth;
        const margin = baseImage.width * 0.02; // 2% margin

        // Position calculation
        let x = 0, y = 0;
        const pos = watermark.position;
        
        // Horizontal
        if (pos.includes('left')) x = margin;
        else if (pos.includes('center')) x = (canvas.width - wmWidth) / 2;
        else if (pos.includes('right')) x = canvas.width - wmWidth - margin;

        // Vertical
        if (pos.includes('top')) y = margin;
        else if (pos.includes('middle')) y = (canvas.height - wmHeight) / 2;
        else if (pos.includes('bottom')) y = canvas.height - wmHeight - margin;
        
        ctx.drawImage(watermarkImage, x, y, wmWidth, wmHeight);
        
        return canvas.toDataURL('image/png');

    } catch (error) {
        console.error("Error applying watermark:", error);
        return baseImageSrc; // Return original image on error
    }
};
