import { useCallback } from 'react';
import type { Watermark } from '../types';
import usePersistentState from './usePersistentState';

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const useWatermarks = () => {
    const [watermarks, setWatermarks] = usePersistentState<Watermark[]>('watermarks', []);
    const [activeWatermarkId, setActiveWatermarkId] = usePersistentState<string | null>('activeWatermarkId', null);

    const addWatermark = useCallback(async (file: File) => {
        const dataUrl = await fileToDataUrl(file);
        const newWatermark: Watermark = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
            dataUrl,
            opacity: 0.7,
            scale: 0.2,
            position: 'bottom-right',
        };
        setWatermarks(prev => [...prev, newWatermark]);
    }, [setWatermarks]);

    const updateWatermark = useCallback((id: string, updates: Partial<Omit<Watermark, 'id' | 'dataUrl'>>) => {
        setWatermarks(prev => prev.map(wm => wm.id === id ? { ...wm, ...updates } : wm));
    }, [setWatermarks]);
    
    const deleteWatermark = useCallback((id: string) => {
        setWatermarks(prev => prev.filter(wm => wm.id !== id));
        if (activeWatermarkId === id) {
            setActiveWatermarkId(null);
        }
    }, [activeWatermarkId, setWatermarks, setActiveWatermarkId]);
    
    const activeWatermark = watermarks.find(wm => wm.id === activeWatermarkId) || null;

    return {
        watermarks,
        activeWatermarkId,
        activeWatermark,
        addWatermark,
        updateWatermark,
        deleteWatermark,
        setActiveWatermarkId,
        setWatermarks, // For backup/restore
    };
};
