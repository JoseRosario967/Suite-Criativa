import { useCallback } from 'react';
import type { PromptTemplate } from '../types';
import usePersistentState from './usePersistentState';

const defaultTemplates: PromptTemplate[] = [
    { id: '1', name: 'Fotorrealista', template: 'fotografia fotorrealista de {prompt}, 8k, detalhada' },
    { id: '2', name: 'Arte Pixel', template: 'arte pixel de {prompt}, 16-bit, cores vibrantes' },
    { id: '3', name: 'Aquarela', template: 'pintura em aquarela de {prompt}, suave, cores misturadas' },
];

export const usePromptTemplates = () => {
    const [templates, setTemplates] = usePersistentState<PromptTemplate[]>('promptTemplates', defaultTemplates);

    const addTemplate = useCallback((name: string, template: string) => {
        const newTemplate: PromptTemplate = { id: crypto.randomUUID(), name, template };
        setTemplates(prev => [...prev, newTemplate]);
    }, [setTemplates]);

    const updateTemplate = useCallback((id: string, updates: Partial<Omit<PromptTemplate, 'id'>>) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }, [setTemplates]);

    const deleteTemplate = useCallback((id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id));
    }, [setTemplates]);

    const reorderTemplate = useCallback((id: string, direction: 'up' | 'down') => {
        setTemplates(prev => {
            const index = prev.findIndex(t => t.id === id);
            if (index === -1) return prev;

            const newTemplates = [...prev];
            if (direction === 'up' && index > 0) {
                [newTemplates[index - 1], newTemplates[index]] = [newTemplates[index], newTemplates[index - 1]];
            } else if (direction === 'down' && index < newTemplates.length - 1) {
                [newTemplates[index + 1], newTemplates[index]] = [newTemplates[index], newTemplates[index + 1]];
            }
            return newTemplates;
        });
    }, [setTemplates]);

    const sortTemplatesAlphabetically = useCallback(() => {
        setTemplates(prev => {
            const sorted = [...prev].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
            return sorted;
        });
    }, [setTemplates]);

    return {
        templates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        reorderTemplate,
        sortTemplatesAlphabetically,
        setTemplates, // For backup/restore
    };
};
