import React from 'react';

export const RateLimitInfo: React.FC = () => {
    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <h3 className="font-semibold text-gray-300">Limites de Utilização</h3>
            </div>
            <p className="text-sm text-gray-400">
                A API da Google tem limites de utilização, especialmente no plano gratuito. Se receber um erro de quota, aguarde um momento. Para mais detalhes, consulte a{' '}
                <a 
                    href="https://ai.google.dev/gemini-api/docs/rate-limits" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
                >
                    documentação oficial
                </a>.
            </p>
        </div>
    );
};