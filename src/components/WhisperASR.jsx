import { useState, useRef, useEffect } from 'react';

export default function WhisperASR({
    transcriptionText,
    setTranscriptionText,
    modelState,
    setModelState,
    modelLoaded,
    setModelLoaded
}) {
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const audioChunksRef = useRef([]);
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [copyIcon, setCopyIcon] = useState(
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" className="w-5 h-5 mr-1">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    );
    const workerRef = useRef(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new Worker(
            new URL('../workers/whisper.worker.js', import.meta.url),
            { type: 'module' }
        );

        // Set up message handler
        workerRef.current.onmessage = (e) => {
            if (e.data.status === 'loading') {
                if (e.data.progress) {
                    setLoadingProgress(Math.round(e.data.progress));
                }
            } else if (e.data.status === 'ready') {
                setModelState(prev => ({ ...prev, whisper: true }));
                setModelLoaded(true);
                setLoadingProgress(0);
            } else if (e.data.status === 'complete') {
                setTranscriptionText(e.data.data);
                setLoadingProgress(0);
                setIsProcessing(false);
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };

        // Auto-load if previously loaded and not already loaded
        if (modelState.whisper && !modelLoaded) {
            workerRef.current.postMessage({
                type: 'load',
                data: { device: 'webgpu' }
            });
            setModelLoaded(true);
        }

        return () => {
            workerRef.current?.terminate();
        };
    }, []); // modelState and modelLoaded intentionally not in deps

    const toggleModel = async () => {
        if (modelState.whisper) {
            setModelState(prev => ({ ...prev, whisper: false }));
            setModelLoaded(false);
            // Optionally terminate worker here if you want to fully unload
            workerRef.current?.terminate();
            workerRef.current = new Worker(
                new URL('../workers/whisper.worker.js', import.meta.url),
                { type: 'module' }
            );
        } else {
            try {
                setLoadingProgress(0);
                workerRef.current.postMessage({
                    type: 'load',
                    data: { device: 'webgpu' }
                });
            } catch (error) {
                console.error('Error loading Whisper model:', error);
                setLoadingProgress(0);
            }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            recorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                audioChunksRef.current = [];

                // Create a File object and update the file input
                const audioFile = new File([audioBlob], 'recorded-audio.wav', { type: 'audio/wav' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(audioFile);
                if (fileInputRef.current) {
                    fileInputRef.current.files = dataTransfer.files;
                }

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (error) {
            console.error('Recording Error:', error);
        }
    };

    const stopRecording = async () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);

            // Create a File object when recording stops
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            const audioFile = new File([audioBlob], 'recorded-audio.wav', { type: 'audio/wav' });
            setSelectedFile(audioFile);

            // Update file input
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(audioFile);
            if (fileInputRef.current) {
                fileInputRef.current.files = dataTransfer.files;
            }

            // Clear audio chunks
            audioChunksRef.current = [];
            // Stop all tracks
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };

    const transcribeAudio = async () => {
        const file = fileInputRef.current?.files[0];
        if (!file) {
            alert('Please select an audio file');
            return;
        }

        // If model isn't loaded, load it first
        if (!modelState.whisper) {
            setLoadingProgress(0);
            try {
                workerRef.current.postMessage({
                    type: 'load',
                    data: { device: 'webgpu' }
                });
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
                console.error('Error loading Whisper model:', error);
                setLoadingProgress(0);
                return;
            }
        }

        setIsProcessing(true);
        setLoadingProgress(0);

        try {
            const audioData = await readAudio(file);
            workerRef.current.postMessage({
                type: 'run',
                data: { audio: audioData }
            });
        } catch (error) {
            console.error('Transcription Error:', error);
            setLoadingProgress(0);
            setIsProcessing(false);
        }
    };

    const readAudio = async (file, samplingRate = 16000) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: samplingRate });
        const buffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        let samples = audioBuffer.getChannelData(0);

        if (audioBuffer.numberOfChannels === 2) {
            const SCALING_FACTOR = Math.sqrt(2);
            const channel2 = audioBuffer.getChannelData(1);
            const mergedSamples = new Float32Array(samples.length);
            for (let i = 0; i < samples.length; ++i) {
                mergedSamples[i] = (SCALING_FACTOR * (samples[i] + channel2[i])) / 2;
            }
            samples = mergedSamples;
        }

        if (audioBuffer.sampleRate !== samplingRate) {
            const resampledLength = Math.round(samples.length * samplingRate / audioBuffer.sampleRate);
            const resampledSamples = new Float32Array(resampledLength);
            for (let i = 0; i < resampledLength; i++) {
                const originalIndex = i * audioBuffer.sampleRate / samplingRate;
                const index1 = Math.floor(originalIndex);
                const index2 = Math.min(index1 + 1, samples.length - 1);
                const fraction = originalIndex - index1;
                resampledSamples[i] = (1 - fraction) * samples[index1] + fraction * samples[index2];
            }
            samples = resampledSamples;
        }

        return samples;
    };

    const copyTranscription = async () => {
        try {
            await navigator.clipboard.writeText(transcriptionText);
            setCopyIcon(
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" className="w-5 h-5 mr-1">
                    <path d="M20 6L9 17l-5-5"></path>
                </svg>
            );
            setTimeout(() => {
                setCopyIcon(
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" className="w-5 h-5 mr-1">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                );
            }, 10000);
        } catch (error) {
            console.error('Copy Error:', error);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleDropZoneClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="w-full max-w-3xl p-8">
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl">Speech Recognition</h2>
                <div className="text-[#a0a0a0]">
                    {!modelState.whisper ? 'Model not loaded' :
                        isProcessing ? 'Transcribing...' : 'Model ready'}
                </div>
                <div className="flex-1" />
                {!modelState.whisper && loadingProgress === 0 && (
                    <button
                        onClick={toggleModel}
                        className="button-primary px-4 py-2 "
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

            <div className="drop-zone" onClick={handleDropZoneClick}>
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <div className="mb-4">
                    <div className="w-12 h-12 border-2 border-[#a0a0a0] rounded-full mx-auto mb-4 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-0.5 bg-[#a0a0a0]" />
                            <div className="w-0.5 h-6 bg-[#a0a0a0] absolute" />
                        </div>
                    </div>
                    <div className="text-[#a0a0a0]">
                        {selectedFile ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-[var(--accent)]">{selectedFile.name}</div>
                                <div className="text-sm">Click to change file</div>
                            </div>
                        ) : (
                            "Drag & drop audio file or click to upload"
                        )}
                    </div>
                </div>
            </div>

            <div className="text-center text-[#a0a0a0] my-6">or record directly</div>

            <div className="flex gap-4 mb-6">
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        className="button-secondary flex-1 flex items-center justify-center gap-2 p-5"
                    >
                        <div className="w-3 h-3 rounded-full bg-current" />
                        Start Recording
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="button-secondary flex-1 flex items-center justify-center gap-2 p-5 animate-pulse"
                    >
                        <div className="w-3 h-3 rounded-full bg-current animate-pulse" />
                        Stop Recording
                    </button>
                )}
            </div>

            <div className="border-t border-[#333] my-6" />

            <button
                onClick={transcribeAudio}
                className="button-primary w-full p-4"
            >
                Transcribe
            </button>

            {transcriptionText && (
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[#a0a0a0]">Transcription Result</span>
                        <button
                            onClick={copyTranscription}
                            className="text-[#ff7b00] hover:opacity-80 cursor-pointer flex items-center transition-all duration-250 hover:-translate-x-1 hover:-translate-y-1"
                        >
                            {copyIcon}
                            Copy
                        </button>
                    </div>
                    <div className="p-4 bg-[#1a1a1a] rounded">
                        {transcriptionText}
                    </div>
                </div>
            )}
        </div>
    );
} 