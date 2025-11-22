import React from 'react';
import { Spinner } from './Spinner';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isImageUploaded: boolean;
  onClearPrompt: () => void;
}

export const PromptInput: React.FC<PromptInputProps> = ({ prompt, setPrompt, onSubmit, isLoading, isImageUploaded, onClearPrompt }) => {
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-xl font-semibold text-gray-400">
        {isImageUploaded ? '2. Descreva as edições que pretende fazer' : '1. Descreva a imagem que pretende criar'}
      </h2>
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isImageUploaded ? "Ex: Adicione um chapéu de pirata ao gato" : "Ex: Um gato astronauta a flutuar no espaço, fotorrealista"}
          className="w-full h-28 p-4 pr-32 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors"
          disabled={isLoading}
        />
        {prompt && !isLoading && (
            <button
                onClick={onClearPrompt}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-200 transition-colors"
                aria-label="Limpar prompt"
                title="Limpar prompt"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
        )}
        <button
          onClick={onSubmit}
          disabled={isLoading || !prompt.trim()}
          className="absolute right-3 bottom-3 flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isLoading ? <Spinner /> : (isImageUploaded ? 'Aplicar' : 'Gerar')}
        </button>
      </div>
    </div>
  );
};