import React from 'react';
import ReactDOM from 'react-dom/client';
import { EuromillionsStudio } from './components/EuromillionsStudio';

const App: React.FC = () => {
    return (
        <div className="bg-gray-900 text-gray-200 min-h-screen font-sans flex items-center justify-center p-4">
            <EuromillionsStudio onClose={() => {}} />
        </div>
    );
};


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);