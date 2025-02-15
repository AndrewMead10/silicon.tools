import { useState, useEffect, useRef } from 'react';
import { ModelManager, Wllama } from '@wllama/wllama/esm';
import { WLLAMA_CONFIG_PATHS, LIST_MODELS } from '../config';

const DEFAULT_PARAMS = {
    nPredict: 2048,
    temperature: 0.7,
    nThreads: 0, // auto
    nContext: 2048,
    nBatch: 512,
};

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
    const wllamaRef = useRef(null);
    const modelManagerRef = useRef(null);
    const startTimeRef = useRef(0);
    const numTokensRef = useRef(0);
    const isInitializedRef = useRef(false);

    // Cleanup function to properly close model and manager
    const cleanup = async () => {
        if (wllamaRef.current) {
            try {
                await wllamaRef.current.exit();
            } catch (error) {
                console.error('Error during wllama cleanup:', error);
            }
            wllamaRef.current = null;
        }
        if (modelManagerRef.current) {
            try {
                await modelManagerRef.current.clear();
            } catch (error) {
                console.error('Error clearing model manager:', error);
            }
            modelManagerRef.current = null;
        }
        isInitializedRef.current = false;
    };

    // Initialize wllama and model manager
    const initialize = async () => {
        if (!isInitializedRef.current) {
            modelManagerRef.current = new ModelManager();
            wllamaRef.current = new Wllama(WLLAMA_CONFIG_PATHS);
            isInitializedRef.current = true;
        }
    };

    useEffect(() => {
        // Reset state on mount
        setModelState(prev => ({ ...prev, llm: false }));
        setModelLoaded(false);

        const init = async () => {
            await cleanup();
            await initialize();

            // Auto-load if previously loaded
            if (modelState.llm && !modelLoaded) {
                await loadModel();
            }
        };

        init();

        // Cleanup on unmount
        return () => {
            cleanup();
        };
    }, []); // modelState and modelLoaded intentionally not in deps

    const loadModel = async () => {
        setLoadingMessage("Loading model...");
        setIsGenerating(true);

        try {
            if (!isInitializedRef.current) {
                await initialize();
            }

            const modelUrl = LIST_MODELS[0].url; // Using the first model for now

            // Download model if not cached
            await modelManagerRef.current.downloadModel(modelUrl, {
                progressCallback(opts) {
                    setLoadingProgress(opts.loaded / opts.total * 100);
                },
            });

            // Get cached model
            const models = await modelManagerRef.current.getModels();
            const model = models.find(m => m.url === modelUrl);

            if (!model) {
                throw new Error('Model not found in cache');
            }

            setLoadingMessage("Initializing model...");

            await wllamaRef.current.loadModel(model, {
                n_threads: DEFAULT_PARAMS.nThreads > 0 ? DEFAULT_PARAMS.nThreads : undefined,
                n_ctx: DEFAULT_PARAMS.nContext,
                n_batch: DEFAULT_PARAMS.nBatch,
            });

            setModelState(prev => ({ ...prev, llm: true }));
            setModelLoaded(true);
            setIsGenerating(false);
            setLoadingProgress(0);
        } catch (error) {
            console.error('Error loading model:', error);
            setIsGenerating(false);
            setModelState(prev => ({ ...prev, llm: false }));
            setModelLoaded(false);
            await cleanup();
        }
    };

    const toggleModel = async () => {
        if (modelState.llm) {
            setModelState(prev => ({ ...prev, llm: false }));
            setModelLoaded(false);
            await cleanup();
        } else {
            await loadModel();
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
            await loadModel();
            if (!modelState.llm) {
                return; // Loading failed
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
        startTimeRef.current = performance.now();
        numTokensRef.current = 0;

        try {
            // Convert messages array to input string
            const prompt = newMessages.map(m => `${m.role}: ${m.content}`).join('\n');

            const result = await wllamaRef.current.createCompletion(prompt, {
                nPredict: DEFAULT_PARAMS.nPredict,
                useCache: true,
                sampling: {
                    temp: DEFAULT_PARAMS.temperature,
                },
                onNewToken(token, piece, currentText, optionals) {
                    numTokensRef.current++;
                    const tps = (numTokensRef.current / (performance.now() - startTimeRef.current)) * 1000;

                    setResponse(currentText);
                    setTokensPerSecond(tps);
                },
            });

            setIsGenerating(false);
            setChatHistory(prev => [...prev, { role: "assistant", content: result }]);
            setResponse('');
        } catch (error) {
            console.error('Error generating text:', error);
            setIsGenerating(false);
        }
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
        <div className="w-full max-w-3xl p-4 md:p-8">
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
                            <span>{Math.round(loadingProgress)}%</span>
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