
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { UploadCloud, X, Type, Download, AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown, Minus } from 'lucide-react';

type TextAlign = 'left' | 'center' | 'right';
type TextPosition = 'top' | 'middle' | 'bottom';

export const TextEditorView: React.FC = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState('O seu texto aqui');
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [color, setColor] = useState('#ffffff');
  const [textAlign, setTextAlign] = useState<TextAlign>('center');
  const [position, setPosition] = useState<TextPosition>('middle');
  const [showBackground, setShowBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize canvas when image changes or window resizes
  useEffect(() => {
    drawCanvas();
  }, [image, text, fontSize, fontFamily, color, textAlign, position, showBackground, backgroundColor]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        setPreviewUrl(resultStr);
        
        const img = new Image();
        img.onload = () => {
          setImage(img);
        };
        img.src = resultStr;
      };
      
      reader.readAsDataURL(file);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match image resolution
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw Image
    ctx.drawImage(image, 0, 0);

    if (!text) return;

    // Configure Font
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    // Calculate Position X
    let x = 0;
    if (textAlign === 'left') {
        x = fontSize; // Padding left
        ctx.textAlign = 'left';
    } else if (textAlign === 'center') {
        x = canvas.width / 2;
        ctx.textAlign = 'center';
    } else {
        x = canvas.width - fontSize; // Padding right
        ctx.textAlign = 'right';
    }

    // Calculate Position Y
    let y = 0;
    const padding = fontSize;
    
    if (position === 'top') {
        y = padding + (fontSize / 2);
    } else if (position === 'middle') {
        y = canvas.height / 2;
    } else {
        y = canvas.height - padding - (fontSize / 2);
    }

    // Draw Background if enabled
    if (showBackground) {
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = fontSize * 1.2; // Approximate height
        
        let bgX = x;
        if (textAlign === 'center') bgX = x - (textWidth / 2);
        if (textAlign === 'right') bgX = x - textWidth;

        // Add padding to background
        const bgPadding = fontSize * 0.2;
        
        ctx.fillStyle = backgroundColor + '80'; // Hex + 50% opacity
        ctx.fillRect(
            bgX - bgPadding, 
            y - (textHeight / 2) - bgPadding, 
            textWidth + (bgPadding * 2), 
            textHeight + (bgPadding * 2)
        );
    }

    // Draw Text
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, x, y);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `editor-texto-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Impact', 'Georgia', 'Comic Sans MS'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Preview Area (Larger) */}
      <div className="lg:col-span-2 h-full flex flex-col">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex-1 relative flex items-center justify-center min-h-[400px]">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity p-8"
            >
              <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center mb-2">
                <UploadCloud className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-slate-200">Carregar Imagem para Editar</h3>
              <p className="text-slate-400">Clique para selecionar ficheiro</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-900/50 p-4">
              <canvas 
                ref={canvasRef} 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
              <button 
                onClick={() => {
                  setImage(null);
                  setPreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-full hover:bg-red-500/80 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Control Panel (Side) */}
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 h-full overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Type className="w-5 h-5 text-emerald-400" />
          Painel de Controlo
        </h2>

        <div className={`space-y-6 ${!image ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Texto</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100"
              placeholder="Escreva aqui..."
            />
          </div>

          {/* Font & Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fonte</label>
              <select 
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100"
              >
                {fonts.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tamanho (px)</label>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cor do Texto</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20 bg-transparent cursor-pointer rounded overflow-hidden"
              />
              <span className="text-slate-400 text-sm uppercase">{color}</span>
            </div>
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Alinhamento</label>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
              {[
                { val: 'left', icon: <AlignLeft className="w-4 h-4" /> },
                { val: 'center', icon: <AlignCenter className="w-4 h-4" /> },
                { val: 'right', icon: <AlignRight className="w-4 h-4" /> }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setTextAlign(opt.val as TextAlign)}
                  className={`flex-1 p-2 rounded flex justify-center items-center transition-colors ${textAlign === opt.val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>

           {/* Position */}
           <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Posição Vertical</label>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
              {[
                { val: 'top', icon: <ArrowUp className="w-4 h-4" />, label: 'Topo' },
                { val: 'middle', icon: <Minus className="w-4 h-4" />, label: 'Meio' },
                { val: 'bottom', icon: <ArrowDown className="w-4 h-4" />, label: 'Fundo' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setPosition(opt.val as TextPosition)}
                  className={`flex-1 p-2 rounded flex justify-center items-center gap-2 text-xs transition-colors ${position === opt.val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Fundo de Texto</label>
              <input 
                type="checkbox" 
                checked={showBackground}
                onChange={(e) => setShowBackground(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
            </div>
            {showBackground && (
              <div className="flex gap-2 items-center animate-in fade-in slide-in-from-top-2 duration-200">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-8 w-full bg-transparent cursor-pointer rounded overflow-hidden"
                />
              </div>
            )}
          </div>

          <Button 
            onClick={handleDownload}
            className="w-full mt-6"
            variant="primary"
            icon={<Download className="w-4 h-4" />}
            disabled={!image}
          >
            Descarregar Resultado
          </Button>

        </div>
      </div>
    </div>
  );
};
