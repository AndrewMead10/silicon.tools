import { useState, useRef, useEffect } from 'react';

export default function TextToSpeech({
    modelState,
    setModelState,
    modelLoaded,
    setModelLoaded,
    ttsText,
    setTtsText,
    audioState,
    setAudioState
}) {
    const audioRef = useRef(null);
    const workerRef = useRef(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new Worker(
            new URL('../workers/tts.worker.js', import.meta.url),
            { type: 'module' }
        );

        // Set up message handler
        workerRef.current.onmessage = (e) => {
            if (e.data.status === 'loading') {
                if (e.data.progress) {
                    setLoadingProgress(Math.round(e.data.progress));
                }
            } else if (e.data.status === 'ready') {
                setModelState(prev => ({ ...prev, tts: true }));
                setModelLoaded(true);
                setLoadingProgress(0);
            } else if (e.data.status === 'complete') {
                const blob = new Blob([e.data.result], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                setAudioState({
                    url: url,
                    blob: blob
                });
                setLoadingProgress(0);
                setIsProcessing(false);
                if (audioRef.current) {
                    audioRef.current.load();
                }
            }
        };

        // Auto-load if previously loaded and not already loaded
        if (modelState.tts && !modelLoaded) {
            workerRef.current.postMessage({ type: 'load' });
            setModelLoaded(true);
        }

        return () => {
            workerRef.current?.terminate();
        };
    }, []); // modelState and modelLoaded intentionally not in deps

    const toggleModel = async () => {
        if (modelState.tts) {
            setModelState(prev => ({ ...prev, tts: false }));
            setModelLoaded(false);
            // Optionally terminate worker here if you want to fully unload
            workerRef.current?.terminate();
            workerRef.current = new Worker(
                new URL('../workers/tts.worker.js', import.meta.url),
                { type: 'module' }
            );
        } else {
            try {
                setLoadingProgress(0);
                workerRef.current.postMessage({ type: 'load' });
            } catch (error) {
                console.error('Error loading TTS model:', error);
                setLoadingProgress(0);
            }
        }
    };

    const generateSpeech = async () => {
        const text = document.getElementById('ttsInput')?.value;
        const voice = document.getElementById('voiceSelect')?.value;

        if (!text) {
            alert('Please enter some text');
            return;
        }

        // If model isn't loaded, load it first
        if (!modelState.tts) {
            setLoadingProgress(0);
            try {
                workerRef.current.postMessage({ type: 'load' });
                // Wait for model to load before proceeding
                await new Promise(resolve => {
                    const originalOnMessage = workerRef.current.onmessage;
                    workerRef.current.onmessage = (e) => {
                        originalOnMessage(e);
                        if (e.data.status === 'ready') {
                            workerRef.current.onmessage = originalOnMessage;
                            resolve();
                        }
                    };
                });
            } catch (error) {
                console.error('Error loading TTS model:', error);
                setLoadingProgress(0);
                return;
            }
        }

        setIsProcessing(true);
        setLoadingProgress(0);

        try {
            workerRef.current.postMessage({
                type: 'run',
                data: { text, voice }
            });
        } catch (error) {
            console.error('TTS Error:', error);
            setLoadingProgress(0);
            setIsProcessing(false);
        }
    };

    const downloadSpeech = () => {
        if (audioState.blob) {
            const url = URL.createObjectURL(audioState.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'generated-speech.wav';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="w-full max-w-3xl p-8">
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl">Text to Speech</h2>
                <div className="text-[#a0a0a0]">
                    {!modelState.tts ? 'Model not loaded' :
                        isProcessing ? 'Generating...' : 'Model ready'}
                </div>
                <div className="flex-1" />
                {!modelState.tts && loadingProgress === 0 && (
                    <button
                        onClick={toggleModel}
                        className="button-primary px-4 py-2"
                    >
                        Load Model
                    </button>
                )}
                {loadingProgress > 0 && (
                    <div className="flex items-center gap-2 flex-1">
                        <div className="h-1 flex-1 bg-[#333] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[var(--accent)] transition-all duration-300"
                                style={{ width: `${loadingProgress}%` }}
                            />
                        </div>
                        <div className="text-sm text-[#a0a0a0] min-w-[3ch]">
                            {loadingProgress}%
                        </div>
                    </div>
                )}
            </div>

            <textarea
                id="ttsInput"
                className="w-full p-4 bg-[#1a1a1a] border border-[#333] text-white rounded resize-y min-h-[150px] mb-4"
                placeholder="Enter text to convert to speech..."
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
            />

            <select
                id="voiceSelect"
                className="w-full p-4 bg-[#1a1a1a] border border-[#333] text-white rounded mb-4"
            >
                <option value="af">Default (American Female)</option>
                <option value="af_bella">Bella (American Female)</option>
                <option value="am_adam">Adam (American Male)</option>
                <option value="bf_emma">Emma (British Female)</option>
                <option value="bm_george">George (British Male)</option>
            </select>

            <button
                onClick={generateSpeech}
                className="button-primary w-full p-4"
            >
                Generate Speech
            </button>

            {audioState.url && (
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[#a0a0a0]">Generated Audio</span>
                        <button
                            onClick={downloadSpeech}
                            className="text-[#ff7b00] hover:opacity-80 hover:cursor-pointer transition-all duration-250 hover:-translate-x-1 hover:-translate-y-1"
                        >
                            Download
                        </button>
                    </div>
                    <audio ref={audioRef} controls className="w-full" src={audioState.url} />
                </div>
            )}
        </div>
    );
} 