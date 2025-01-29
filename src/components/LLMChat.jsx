import { useState, useEffect, useRef } from 'react';

export default function LLMChat({
    modelState,
    setModelState,
    modelLoaded,
    setModelLoaded,
    chatHistory,
    setChatHistory
}) {
    const [response, setResponse] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [tokensPerSecond, setTokensPerSecond] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const workerRef = useRef(null);

    useEffect(() => {
        // Initialize worker
        workerRef.current = new Worker(
            new URL('../workers/llm.worker.js', import.meta.url),
            { type: 'module' }
        );

        // Set up message handler
        workerRef.current.onmessage = (e) => {
            const { status, data, output, tps } = e.data;

            switch (status) {
                case "loading":
                    setLoadingMessage(data);
                    break;
                case "ready":
                    setModelState(prev => ({ ...prev, llm: true }));
                    setModelLoaded(true);
                    setIsGenerating(false);
                    setLoadingProgress(0);
                    break;
                case "update":
                    setResponse(prev => prev + output);
                    setTokensPerSecond(tps);
                    break;
                case "complete":
                    setIsGenerating(false);
                    setChatHistory(prev => [...prev, { role: "assistant", content: output }]);
                    setResponse('');
                    break;
                case "progress":
                    if (data.progress !== undefined) {
                        setLoadingProgress(Math.round(data.progress));
                    }
                    break;
            }
        };

        // Auto-load if previously loaded and not already loaded
        if (modelState.llm && !modelLoaded) {
            workerRef.current.postMessage({ type: "load" });
            setModelLoaded(true);
        }

        return () => workerRef.current?.terminate();
    }, []); // modelState and modelLoaded intentionally not in deps

    const toggleModel = async () => {
        if (modelState.llm) {
            setModelState(prev => ({ ...prev, llm: false }));
            setModelLoaded(false);
            // Optionally terminate worker here if you want to fully unload
            workerRef.current?.terminate();
            workerRef.current = new Worker(
                new URL('../workers/llm.worker.js', import.meta.url),
                { type: 'module' }
            );
        } else {
            setIsGenerating(true);
            try {
                workerRef.current.postMessage({ type: "load" });
            } catch (error) {
                console.error('Error loading LLM model:', error);
                setIsGenerating(false);
            }
        }
    };

    const generateText = async () => {
        const input = document.getElementById('llmInput')?.value.trim();

        // Clear the textarea
        document.getElementById('llmInput').value = '';

        if (!input) {
            alert('Please enter a prompt');
            return;
        }

        // If model isn't loaded, load it first
        if (!modelState.llm) {
            setIsGenerating(true);
            try {
                workerRef.current.postMessage({ type: "load" });
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
                console.error('Error loading LLM model:', error);
                setIsGenerating(false);
                return;
            }
        }

        // Add user message to chat
        const newMessages = [
            ...chatHistory,
            { role: "user", content: input }
        ];
        setChatHistory(newMessages);

        setIsGenerating(true);
        setResponse('');
        setTokensPerSecond(0);

        workerRef.current.postMessage({
            type: "generate",
            data: newMessages // Send entire message history
        });
    };

    // Add function to handle textarea auto-resize
    const handleTextareaInput = (e) => {
        const textarea = e.target;
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set new height based on scrollHeight, capped at 300px
        textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    };

    return (
        <div className="w-full max-w-3xl p-8">
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl">
                    AI Chat
                    <span className="text-xs bg-[#ff7b00] text-[#0a0a0a] px-2 py-0.5 ml-2 align-middle">
                        BETA
                    </span>
                </h2>
                <div className="text-[#a0a0a0]">
                    {!modelState.llm ? (isGenerating ? 'Loading model...' : 'Model not loaded') : 'Model ready'}
                </div>
                <div className="flex-1" />
                {!modelState.llm && !isGenerating && (
                    <button
                        onClick={toggleModel}
                        className="button-primary px-4 py-2"
                    >
                        Load Model
                    </button>
                )}
                {modelState.llm && chatHistory.length > 0 && (
                    <button
                        onClick={() => setChatHistory([])}
                        className="button-primary px-4 py-2"
                    >
                        New Chat
                    </button>
                )}
                {isGenerating && !modelState.llm && (
                    <div className="flex flex-col gap-2 flex-grow max-w-md">
                        <div className="flex justify-between text-sm text-[#a0a0a0]">
                            <span>{loadingMessage}</span>
                            <span>{loadingProgress}%</span>
                        </div>
                        <div className="w-full bg-[#1a1a1a] rounded-full h-2">
                            <div
                                className="bg-[#ff7b00] h-2 rounded-full transition-all duration-300"
                                style={{ width: `${loadingProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <p className="text-[#a0a0a0] text-sm mb-6">
                Note: This model currently runs very slowly. We are working on making this faster.
            </p>

            <div className="mb-6 space-y-4">
                {chatHistory.map((message, index) => (
                    <div
                        key={index}
                        className={`p-4 rounded ${message.role === "user"
                            ? "bg-[#2a2a2a] ml-8"
                            : "bg-[#1a1a1a] mr-8"
                            }`}
                    >
                        <div className="text-xs text-[#a0a0a0] mb-1">
                            {message.role === "user" ? "You" : "Assistant"}
                        </div>
                        <div className="whitespace-pre-wrap">
                            {message.content}
                        </div>
                    </div>
                ))}

                {isGenerating && (
                    <div className="p-4 rounded bg-[#1a1a1a] mr-8">
                        <div className="text-xs text-[#a0a0a0] mb-1">
                            Assistant
                        </div>
                        <div className="whitespace-pre-wrap">
                            {response}
                        </div>
                    </div>
                )}
            </div>

            {tokensPerSecond > 0 && (
                <div className="text-[#a0a0a0] text-sm mb-2">
                    Generating ({tokensPerSecond.toFixed(2)} tokens/sec)
                </div>
            )}

            <textarea
                id="llmInput"
                className="w-full p-4 bg-[#1a1a1a] border border-[#333] text-white rounded resize-none overflow-y-auto mb-4"
                placeholder="Enter your prompt..."
                onInput={handleTextareaInput}
                rows={1}
                style={{ height: '52px' }} // 52px = 1 line + padding
            />

            <button
                onClick={generateText}
                disabled={isGenerating}
                className="button-primary w-full p-4 disabled:opacity-50"
            >
                {isGenerating ? 'Generating...' : 'Generate'}
            </button>

        </div>
    );
} 