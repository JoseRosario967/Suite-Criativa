import React, { useState, useRef, useEffect } from 'react';
import type { UploadedImage } from '../types';
import { Spinner } from './Spinner';
import { ErrorAlert } from './ErrorAlert';

const fileToUploadedImage = (file: File): Promise<UploadedImage> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(',')[1];
            resolve({ id: crypto.randomUUID(), dataUrl, base64, mimeType: file.type });
        };
        reader.onerror = (error) => reject(error);
    });
};

type AnimationEffect = 'none' | 'ken-burns' | 'shake' | 'pulse' | 'rotate';

interface MotionStudioProps {
    onClose: () => void;
}

export const MotionStudio: React.FC<MotionStudioProps> = ({ onClose }) => {
    const [image, setImage] = useState<UploadedImage | null>(null);
    const [effect, setEffect] = useState<AnimationEffect>('ken-burns');
    const [duration, setDuration] = useState(5); // Seconds
    const [isRecording, setIsRecording] = useState(false);
    const [progress, setProgress] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Load Image
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const img = await fileToUploadedImage(e.target.files[0]);
                setImage(img);
                setVideoUrl(null);
            } catch (err) {
                setError("Erro ao carregar imagem.");
            }
        }
    };

    // Animation Loop
    const animate = (time: number) => {
        if (!canvasRef.current || !image) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imgObj = new Image();
        imgObj.src = image.dataUrl;
        
        // Wait for image needed? No, dataURL is instant, but ensuring load safety
        if (!imgObj.complete) return;

        // Calculate progress (0 to 1)
        if (!startTimeRef.current) startTimeRef.current = time;
        const elapsed = (time - startTimeRef.current) / 1000;
        const p = Math.min(elapsed / duration, 1); // Progress 0 -> 1

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw Background (Black)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();

        // --- EFFECTS LOGIC ---
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Move to center for transformations
        ctx.translate(centerX, centerY);

        if (effect === 'ken-burns') {
            // Zoom in from 1.0 to 1.3
            const scale = 1 + (p * 0.3); 
            ctx.scale(scale, scale);
            // Slight Pan
            const panX = (p * 20) - 10; 
            ctx.translate(panX, 0);
        } else if (effect === 'shake') {
            const intensity = 5;
            const dx = (Math.random() - 0.5) * intensity;
            const dy = (Math.random() - 0.5) * intensity;
            ctx.translate(dx, dy);
             // Ensure image covers edges during shake
            const scale = 1.05;
            ctx.scale(scale, scale);
        } else if (effect === 'pulse') {
            // Sine wave scale: 1.0 -> 1.1 -> 1.0
            const scale = 1 + (Math.sin(p * Math.PI * 2 * (duration / 2)) * 0.05);
            ctx.scale(scale, scale);
        } else if (effect === 'rotate') {
            // Gentle rotation -5deg to 5deg
            const angle = Math.sin(p * Math.PI) * 5 * (Math.PI / 180);
            ctx.rotate(angle);
            const scale = 1.2; // Zoom to cover corners
            ctx.scale(scale, scale);
        }

        // Draw Image Centered
        // Object Fit: Cover logic
        const imgRatio = imgObj.width / imgObj.height;
        const canvasRatio = canvas.width / canvas.height;
        let renderWidth, renderHeight;

        if (canvasRatio > imgRatio) {
            renderWidth = canvas.width;
            renderHeight = canvas.width / imgRatio;
        } else {
            renderHeight = canvas.height;
            renderWidth = canvas.height * imgRatio;
        }

        ctx.drawImage(imgObj, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);

        ctx.restore();

        // Loop or Stop
        if (isRecording) {
             setProgress(p * 100);
             if (p < 1) {
                 requestRef.current = requestAnimationFrame(animate);
             }
             // Recorder handles stopping automatically via setTimeout in handleRecord
        } else {
            // Preview loop (bounce back)
            // Just simple continuous loop for preview
             const loopP = (Date.now() / (duration * 1000)) % 1;
             // Re-call logic with loopP if we wanted a live preview, 
             // but simpler to just draw one frame for now to save battery
        }
    };

    // Live Preview Effect (Simple Loop)
    useEffect(() => {
        let frameId: number;
        
        const previewLoop = () => {
            if (!canvasRef.current || !image || isRecording) return;
             const time = Date.now();
             const loopDuration = duration * 1000;
             // Ping-pong loop 0->1->0
             let p = (time % (loopDuration * 2)) / loopDuration;
             if (p > 1) p = 2 - p;
             
             // Reuse animate logic logic but passing a simulated time based on p
             // This is a bit hacky, better to extract draw function.
             // For simplicity, let's just trigger a re-draw manually.
             
             // ... extract draw logic ...
             const canvas = canvasRef.current;
             const ctx = canvas.getContext('2d');
             const imgObj = new Image();
             imgObj.src = image.dataUrl;
             
             if (!ctx || !imgObj.complete) {
                  frameId = requestAnimationFrame(previewLoop);
                  return;
             }
             
             ctx.clearRect(0, 0, canvas.width, canvas.height);
             ctx.fillStyle = '#000';
             ctx.fillRect(0,0,canvas.width, canvas.height);
             ctx.save();
             ctx.translate(canvas.width / 2, canvas.height / 2);

             if (effect === 'ken-burns') {
                const scale = 1 + (p * 0.3);
                ctx.scale(scale, scale);
             } else if (effect === 'shake') {
                 if (Math.random() > 0.5) {
                    const dx = (Math.random() - 0.5) * 5;
                    const dy = (Math.random() - 0.5) * 5;
                    ctx.translate(dx, dy);
                 }
                 ctx.scale(1.05, 1.05);
             } else if (effect === 'pulse') {
                const scale = 1 + (Math.sin(p * Math.PI * 2) * 0.05); 
                ctx.scale(scale, scale);
             } else if (effect === 'rotate') {
                 const angle = Math.sin(p * Math.PI) * 5 * (Math.PI / 180);
                 ctx.rotate(angle);
                 ctx.scale(1.2, 1.2);
             }

            const imgRatio = imgObj.width / imgObj.height;
            const canvasRatio = canvas.width / canvas.height;
            let renderWidth, renderHeight;
            if (canvasRatio > imgRatio) {
                renderWidth = canvas.width;
                renderHeight = canvas.width / imgRatio;
            } else {
                renderHeight = canvas.height;
                renderWidth = canvas.height * imgRatio;
            }
            ctx.drawImage(imgObj, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);
            ctx.restore();
            
            frameId = requestAnimationFrame(previewLoop);
        };

        if (image && !isRecording) {
            frameId = requestAnimationFrame(previewLoop);
        }
        return () => cancelAnimationFrame(frameId);
    }, [image, effect, duration, isRecording]);


    const handleRecord = () => {
        if (!canvasRef.current || !image) return;
        
        setIsRecording(true);
        setVideoUrl(null);
        setProgress(0);
        chunksRef.current = [];

        const stream = canvasRef.current.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
            setIsRecording(false);
            setProgress(100);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        
        // Start Animation Loop for Recording (Linear 0 -> 1)
        startTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(animateRecording);

        // Auto stop after duration
        setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
                cancelAnimationFrame(requestRef.current!);
            }
        }, duration * 1000 + 100); // Small buffer
    };

    const animateRecording = (time: number) => {
        // This function is identical to 'animate' but uses the performance.now() passed by rAF
        // To avoid code duplication, we could extract, but for this component, logic is simple enough.
        // Re-implementing draw logic strictly for recording phase to ensure smoothness.
        
        if (!canvasRef.current || !image) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const imgObj = new Image();
        imgObj.src = image.dataUrl;

        const elapsed = (time - startTimeRef.current) / 1000;
        const p = Math.min(elapsed / duration, 1);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        if (effect === 'ken-burns') {
            const scale = 1 + (p * 0.3); 
            ctx.scale(scale, scale);
            const panX = (p * 20) - 10; 
            ctx.translate(panX, 0);
        } else if (effect === 'shake') {
            const intensity = 5;
            const dx = (Math.random() - 0.5) * intensity;
            const dy = (Math.random() - 0.5) * intensity;
            ctx.translate(dx, dy);
            ctx.scale(1.05, 1.05);
        } else if (effect === 'pulse') {
             // 2 full beats
            const scale = 1 + (Math.sin(p * Math.PI * 4) * 0.05);
            ctx.scale(scale, scale);
        } else if (effect === 'rotate') {
             // 360 spin or subtle? Let's do subtle tilt
            const angle = Math.sin(p * Math.PI * 2) * 5 * (Math.PI / 180);
            ctx.rotate(angle);
            ctx.scale(1.2, 1.2);
        }

        const imgRatio = imgObj.width / imgObj.height;
        const canvasRatio = canvas.width / canvas.height;
        let renderWidth, renderHeight;
        if (canvasRatio > imgRatio) {
            renderWidth = canvas.width;
            renderHeight = canvas.width / imgRatio;
        } else {
            renderHeight = canvas.height;
            renderWidth = canvas.height * imgRatio;
        }
        ctx.drawImage(imgObj, -renderWidth / 2, -renderHeight / 2, renderWidth, renderHeight);
        ctx.restore();

        if (p < 1) {
            requestRef.current = requestAnimationFrame(animateRecording);
        }
        setProgress(p * 100);
    };

    return (
        <div className="relative w-full h-full flex flex-col">
             <button onClick={onClose} className="absolute top-0 right-0 z-10 p-2 text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            
            <div className="mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-4xl">🎬</span>
                    <h2 className="text-3xl font-bold text-white">Estúdio de Animação</h2>
                </div>
                <p className="text-gray-400 mt-2">Dê vida às suas imagens. Crie vídeos curtos com efeitos de movimento cinematográficos. Grátis e Ilimitado.</p>
            </div>

            {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col lg:flex-row gap-8 min-h-0 flex-grow">
                {/* Left: Controls */}
                <div className="w-full lg:w-1/3 bg-gray-800/50 p-6 rounded-xl border border-gray-700 h-fit space-y-6">
                    <div className="space-y-3">
                        <label className="block text-lg font-semibold text-gray-300">1. Escolher Imagem</label>
                         <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg bg-gray-900/50 hover:border-purple-500 cursor-pointer transition-colors">
                            {image ? (
                                <img src={image.dataUrl} className="h-full w-full object-contain p-1" alt="Source" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span>Carregar Foto</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>

                    <div className="space-y-3">
                         <label className="block text-lg font-semibold text-gray-300">2. Efeito de Movimento</label>
                         <div className="grid grid-cols-2 gap-2">
                            {['ken-burns', 'shake', 'pulse', 'rotate'].map(eff => (
                                <button
                                    key={eff}
                                    onClick={() => setEffect(eff as AnimationEffect)}
                                    className={`py-3 px-2 rounded-lg text-sm font-medium capitalize transition-all ${effect === eff ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                    {eff.replace('-', ' ')}
                                </button>
                            ))}
                         </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-lg font-semibold text-gray-300">3. Duração: {duration}s</label>
                        <input 
                            type="range" min="3" max="10" step="1" 
                            value={duration} onChange={e => setDuration(parseInt(e.target.value))}
                            className="w-full accent-purple-500"
                        />
                    </div>

                    <button 
                        onClick={handleRecord}
                        disabled={!image || isRecording}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all ${
                            isRecording 
                            ? 'bg-red-600 text-white animate-pulse' 
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-[1.02]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isRecording ? `A Gravar... ${Math.round(progress)}%` : '🎥 Gravar Vídeo'}
                    </button>
                </div>

                {/* Right: Preview */}
                <div className="w-full lg:w-2/3 bg-black rounded-xl border border-gray-700 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                    <canvas 
                        ref={canvasRef} 
                        width={1280} 
                        height={720} 
                        className="max-w-full max-h-full object-contain rounded shadow-2xl"
                    />
                    
                    {!image && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-600 pointer-events-none">
                            <span className="text-xl font-mono">PREVIEW SCREEN</span>
                        </div>
                    )}

                    {videoUrl && (
                        <div className="absolute bottom-6 flex gap-4 animate-fade-in z-20">
                            <a 
                                href={videoUrl} 
                                download={`motion-video-${Date.now()}.webm`}
                                className="px-6 py-3 bg-green-600 text-white font-bold rounded-full shadow-lg hover:bg-green-500 transition-colors flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Descarregar .WEBM
                            </a>
                             <button 
                                onClick={() => setVideoUrl(null)}
                                className="px-6 py-3 bg-gray-700 text-white font-bold rounded-full shadow-lg hover:bg-gray-600 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};