import React, { useState } from 'react';
import { PromptTemplate } from '../types';
import { usePromptTemplates } from '../hooks/usePromptTemplates';
import { Button } from './Button';
import { X, Plus, ArrowUp, ArrowDown, Trash2, Edit2, Check, BookTemplate, ArrowRight, ArrowDownAZ } from 'lucide-react';

interface PromptTemplatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateContent: string) => void;
}

export const PromptTemplatesPanel: React.FC<PromptTemplatesPanelProps> = ({ isOpen, onClose, onSelectTemplate }) => {
  const { 
    templates, 
    addTemplate, 
    updateTemplate, 
    deleteTemplate, 
    moveTemplate, 
    sortTemplatesAlphabetically 
  } = usePromptTemplates();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [nameInput, setNameInput] = useState('');
  const [templateInput, setTemplateInput] = useState('');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setNameInput('');
    setTemplateInput('');
  };

  const handleStartEdit = (t: PromptTemplate) => {
    setEditingId(t.id);
    setIsCreating(false);
    setNameInput(t.name);
    setTemplateInput(t.template);
  };

  const handleSave = () => {
    if (!nameInput.trim() || !templateInput.trim()) return;

    if (isCreating) {
      addTemplate(nameInput, templateInput);
      setIsCreating(false);
    } else if (editingId) {
      updateTemplate(editingId, { name: nameInput, template: templateInput });
      setEditingId(null);
    }
    
    // Reset
    setNameInput('');
    setTemplateInput('');
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <BookTemplate className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Modelos de Prompts</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        {!isCreating && !editingId && (
          <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex gap-2 overflow-x-auto">
            <Button 
              onClick={handleStartCreate} 
              variant="secondary"
              className="text-xs h-9 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30"
              icon={<Plus className="w-4 h-4" />}
            >
              Criar Novo
            </Button>
            <Button 
              onClick={sortTemplatesAlphabetically} 
              variant="ghost"
              className="text-xs h-9 text-slate-400"
              icon={<ArrowDownAZ className="w-4 h-4" />}
            >
              Ordenar A-Z
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950/50">
          
          {/* Create / Edit Form */}
          {(isCreating || editingId) && (
            <div className="bg-slate-800 border border-indigo-500/50 rounded-xl p-4 mb-4 animate-in slide-in-from-top-2">
              <h3 className="text-sm font-semibold text-white mb-4">
                {isCreating ? 'Novo Modelo' : 'Editar Modelo'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nome</label>
                  <input 
                    type="text" 
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Ex: Fotografia Realista"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Template <span className="text-indigo-400 ml-1">(Use {'{prompt}'} onde quer que o seu texto entre)</span>
                  </label>
                  <textarea 
                    value={templateInput}
                    onChange={(e) => setTemplateInput(e.target.value)}
                    placeholder="Ex: {prompt}, highly detailed, 8k resolution..."
                    className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={handleCancel} className="h-8 text-xs">Cancelar</Button>
                  <Button variant="primary" onClick={handleSave} className="h-8 text-xs" icon={<Check className="w-3 h-3" />}>Guardar</Button>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div className="space-y-3">
            {templates.length === 0 && !isCreating && (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum modelo guardado. Crie o seu primeiro!
              </div>
            )}

            {templates.map((t, index) => (
              <div 
                key={t.id} 
                className={`
                  group bg-slate-900 border border-slate-800 rounded-lg p-4 transition-all hover:border-slate-600
                  ${editingId === t.id ? 'hidden' : ''}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => onSelectTemplate(t.template)}>
                    <h4 className="font-medium text-white group-hover:text-indigo-400 transition-colors">
                      {t.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-mono bg-black/20 p-1 rounded inline-block">
                      {t.template}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                       onClick={() => onSelectTemplate(t.template)}
                       className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg mr-2"
                       title="Usar Modelo"
                    >
                       <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <div className="flex flex-col gap-1 border-l border-slate-700 pl-2">
                      <button onClick={() => moveTemplate(t.id, 'up')} disabled={index === 0} className="p-1 text-slate-500 hover:text-white disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                      <button onClick={() => moveTemplate(t.id, 'down')} disabled={index === templates.length - 1} className="p-1 text-slate-500 hover:text-white disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                    </div>
                    
                    <div className="flex flex-col gap-1 ml-1">
                      <button onClick={() => handleStartEdit(t)} className="p-1 text-slate-500 hover:text-indigo-400"><Edit2 className="w-3 h-3" /></button>
                      <button onClick={() => deleteTemplate(t.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 rounded-b-2xl text-xs text-slate-500 flex justify-between">
           <span>Total: {templates.length} modelos</span>
           <span>Dica: Clique no nome para aplicar rápido.</span>
        </div>

      </div>
    </div>
  );
};