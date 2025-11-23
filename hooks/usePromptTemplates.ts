import { useState, useEffect } from 'react';
import { PromptTemplate } from '../types';

const STORAGE_KEY = 'nexus_prompt_templates';

export const usePromptTemplates = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  // Load from storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse templates", e);
      }
    } else {
      // Default templates for new users
      const defaults: PromptTemplate[] = [
        { id: '1', name: 'Realismo Cinematográfico', template: '{prompt}, cinematic lighting, 8k resolution, photorealistic, highly detailed, shot on 35mm lens, depth of field' },
        { id: '2', name: 'Estilo Anime', template: '{prompt}, anime style, studio ghibli, vibrant colors, detailed background, cell shaded' },
        { id: '3', name: 'Pintura a Óleo', template: 'oil painting of {prompt}, textured brushstrokes, classical art style, dramatic lighting' }
      ];
      setTemplates(defaults);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    }
  }, []);

  // Save to storage whenever templates change
  const save = (newTemplates: PromptTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
  };

  const addTemplate = (name: string, templateContent: string) => {
    const newTemplate: PromptTemplate = {
      id: Date.now().toString(),
      name,
      template: templateContent
    };
    save([...templates, newTemplate]);
  };

  const updateTemplate = (id: string, updates: Partial<PromptTemplate>) => {
    const updated = templates.map(t => t.id === id ? { ...t, ...updates } : t);
    save(updated);
  };

  const deleteTemplate = (id: string) => {
    save(templates.filter(t => t.id !== id));
  };

  const moveTemplate = (id: string, direction: 'up' | 'down') => {
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return;

    const newTemplates = [...templates];
    if (direction === 'up' && index > 0) {
      [newTemplates[index], newTemplates[index - 1]] = [newTemplates[index - 1], newTemplates[index]];
    } else if (direction === 'down' && index < templates.length - 1) {
      [newTemplates[index], newTemplates[index + 1]] = [newTemplates[index + 1], newTemplates[index]];
    }
    save(newTemplates);
  };

  const sortTemplatesAlphabetically = () => {
    const sorted = [...templates].sort((a, b) => a.name.localeCompare(b.name));
    save(sorted);
  };

  return {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    moveTemplate,
    sortTemplatesAlphabetically
  };
};