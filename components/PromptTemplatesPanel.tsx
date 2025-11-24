
import React, { useState, useEffect } from 'react';
import type { PromptTemplate } from '../types';

interface TemplateEditFormProps {
    template: PromptTemplate;
    onSave: (id: string, updates: { name: string, template: string }) => void;
    onCancel: () => void;
}

const TemplateEditForm: React.FC<TemplateEditFormProps> = ({ template, onSave, onCancel }) => {
    const [name, setName] = useState(template.name);
    const [templateText, setTemplateText] = useState(template.template);

    const handleSave = () => {
        onSave(template.id, { name, template: templateText });
    };

    return (
        <div className="p-3 bg-gray-900/50 rounded-md space-y-3 my-2">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Modelo" className="w-full p-2 bg-gray-800 border-2 border-gray-600 rounded-md text-gray-200 text-sm" />
            <textarea value={templateText} onChange={e => setTemplateText(e.target.value)} placeholder="Texto do modelo, use {prompt}" className="w-full h-20 p-2 bg-gray-800 border-2 border-gray-600 rounded-md text-gray-200 text-sm resize-none" />
            <div className="flex gap-2">
                <button onClick={handleSave} className="flex-1 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold">Guardar</button>
                <button onClick={onCancel} className="flex-1 py-2 bg-gray-600 text-white rounded-md text-sm font-semibold">Cancelar</button>
            </div>
        </div>
    );
};

interface PromptTemplatesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    templates: PromptTemplate[];
    onSelect: (template: string) => void;
    onAdd: (name: string, template: string) => void;
    onUpdate: (id: string, updates: Partial<Omit<PromptTemplate, 'id'>>) => void;
    onDelete: (id: string) => void;
    onReorder: (id: string, direction: 'up' | 'down') => void;
    onSortAlphabetically: () => void;
}

export const PromptTemplatesPanel: React.FC<PromptTemplatesPanelProps> = ({ isOpen, onClose, templates, onSelect, onAdd, onUpdate, onDelete, onReorder, onSortAlphabetically }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newTemplate, setNewTemplate] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setIsAdding(false);
            setEditingId(null);
            setNewName('');
            setNewTemplate('');
        }
    }, [isOpen]);

    const handleAdd = () => {
        if (newName.trim() && newTemplate.trim()) {
            onAdd(newName, newTemplate);
            setNewName('');
            setNewTemplate('');
            setIsAdding(false);
        }
    };

    const handleUpdate = (id: string, updates: { name: string, template: string }) => {
        onUpdate(id, updates);
        setEditingId(null);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Prompts</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="p-4 space-y-4 overflow-y-auto">
                    <div className="flex justify-between items-center">
                        <button onClick={() => setIsAdding(!isAdding)} className="text-sm text-indigo-400 hover:text-indigo-300">
                            {isAdding ? 'Cancelar' : '+ Adicionar Novo Prompt'}
                        </button>
                        <button onClick={onSortAlphabetically} title="Ordenar por ordem alfabética" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                            <span>A-Z</span>
                        </button>
                    </div>

                    {isAdding && (
                        <div className="p-3 bg-gray-900/50 rounded-md space-y-3">
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Título do Prompt" className="w-full p-2 bg-gray-800 border-2 border-gray-600 rounded-md text-gray-200 text-sm" />
                            <textarea value={newTemplate} onChange={e => setNewTemplate(e.target.value)} placeholder="Comando do prompt, use {prompt}" className="w-full h-20 p-2 bg-gray-800 border-2 border-gray-600 rounded-md text-gray-200 text-sm resize-none" />
                            <button onClick={handleAdd} className="w-full py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold">Guardar Prompt</button>
                        </div>
                    )}
                    
                    <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-2">
                        {templates.map((template, index) => (
                            editingId === template.id ? (
                                <TemplateEditForm key={template.id} template={template} onSave={handleUpdate} onCancel={() => setEditingId(null)} />
                            ) : (
                                <div key={template.id} className="group flex items-center justify-between p-2 bg-gray-700/50 rounded-md">
                                    <div className="flex flex-col mr-2">
                                        <button 
                                            onClick={() => onReorder(template.id, 'up')}
                                            disabled={index === 0}
                                            title="Mover para cima"
                                            className="p-0.5 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                        </button>
                                        <button 
                                            onClick={() => onReorder(template.id, 'down')}
                                            disabled={index === templates.length - 1}
                                            title="Mover para baixo"
                                            className="p-0.5 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                    </div>
                                    <div className="overflow-hidden flex-grow">
                                        <p className="font-semibold text-gray-300 truncate" title={template.name}>{template.name}</p>
                                        <p className="text-xs text-gray-400 italic truncate" title={template.template}>"{template.template}"</p>
                                    </div>
                                    <div className="flex items-center space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onSelect(template.template)} title="Usar Modelo" className="p-1.5 bg-indigo-600 rounded-full text-white hover:bg-indigo-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg></button>
                                        <button onClick={() => setEditingId(template.id)} title="Editar" className="p-1.5 bg-gray-600 rounded-full text-white hover:bg-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                                        <button onClick={() => onDelete(template.id)} title="Apagar" className="p-1.5 bg-red-600 rounded-full text-white hover:bg-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
