import { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import * as llm from '../utils/llm.js';

// Configure marked for safe rendering
marked.setOptions({
    gfm: true,
    breaks: true,
});

function MessageContent({ content }) {
    const html = DOMPurify.sanitize(marked.parse(content || ''));
    return (
        <div 
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-[#666] hover:text-[#ff7b00] px-2 py-1"
            title="Copy message"
        >
            {copied ? '✓ Copied' : 'Copy'}
        </button>
    );
}

function Message({ message, isStreaming }) {
    const isUser = message.role === 'user';
    
    return (
        <div className={`group flex gap-4 py-4 ${isUser ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${isUser ? 'bg-[#333] text-white' : 'bg-[#ff7b00] text-[#0a0a0a]'}`}>
                {isUser ? 'U' : 'AI'}
            </div>
            
            {/* Content */}
            <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
                <div className={`inline-block max-w-[85%] px-4 py-3 rounded-2xl text-left
                    ${isUser 
                        ? 'bg-[#ff7b00] text-[#0a0a0a] rounded-tr-sm' 
                        : 'bg-[#1a1a1a] text-white rounded-tl-sm border border-[#252525]'
                    }`}>
                    {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <MessageContent content={message.content} />
                    )}
                    {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-[#ff7b00] ml-1 animate-pulse" />
                    )}
                </div>
                {!isUser && message.content && (
                    <div className="mt-1">
                        <CopyButton text={message.content} />
                    </div>
                )}
            </div>
        </div>
    );
}

function LoadingIndicator({ message, progress }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-[#252525] rounded-full" />
                <div 
                    className="absolute inset-0 border-4 border-[#ff7b00] rounded-full border-t-transparent animate-spin"
                    style={{ animationDuration: '1s' }}
                />
                {progress > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#ff7b00]">
                        {progress}%
                    </div>
                )}
            </div>
            <p className="text-[#a0a0a0] text-sm text-center max-w-xs">{message}</p>
        </div>
    );
}

function EmptyState({ onLoadModel, isLoading }) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    return (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <div className="text-6xl mb-6">🧠</div>
            <h2 className="text-2xl font-bold mb-2">LFM 2.5 Chat</h2>
            <p className="text-[#a0a0a0] text-center max-w-md mb-8">
                Chat with Liquid AI's LFM 2.5 running entirely in your browser. 
                No data leaves your device.
            </p>
            <button
                onClick={onLoadModel}
                disabled={isLoading}
                className="button-primary px-8 py-4 text-lg disabled:opacity-50"
            >
                {isLoading ? 'Loading...' : 'Load Model (~1.2GB)'}
            </button>
            <p className="text-[#666] text-xs mt-4 max-w-sm text-center">
                {isIOS ? (
                    <>Using transformers.js (ONNX) for iOS/Safari.</>
                ) : (
                    <>Using wllama (GGUF/llama.cpp). Runs on CPU — no GPU required.</>
                )}
            </p>
        </div>
    );
}

export default function LLMChat({
    modelState,
    setModelState,
    modelLoaded,
    setModelLoaded,
    chatHistory,
    setChatHistory
}) {
    const [streamingContent, setStreamingContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [tokensPerSecond, setTokensPerSecond] = useState(0);
    const [tokenCount, setTokenCount] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState(null);
    const [inputValue, setInputValue] = useState('');
    
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, streamingContent, scrollToBottom]);

    // Check if model is already loaded on mount
    useEffect(() => {
        if (llm.isLoaded()) {
            setModelState(prev => ({ ...prev, llm: true }));
            setModelLoaded(true);
        }
    }, [setModelState, setModelLoaded]);

    const loadModel = async () => {
        setError(null);
        setIsModelLoading(true);
        setLoadingMessage('Checking browser support...');

        try {
            const usedBackend = await llm.loadModel(
                (progress, message) => {
                    setLoadingProgress(progress);
                    setLoadingMessage(message);
                },
                (status) => {
                    setLoadingMessage(status);
                }
            );
            
            setModelState(prev => ({ ...prev, llm: usedBackend }));
            setModelLoaded(true);
        } catch (err) {
            setError(err.message || 'Failed to load model');
        } finally {
            setIsModelLoading(false);
            setLoadingProgress(0);
            setLoadingMessage('');
        }
    };

    const handleSubmit = async () => {
        const input = inputValue.trim();
        if (!input || isGenerating) return;

        setError(null);
        setInputValue('');
        
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = '56px';
        }

        // If model isn't loaded, load it first
        if (!modelLoaded) {
            await loadModel();
            if (!llm.isLoaded()) return; // Loading failed
        }

        const newMessages = [...chatHistory, { role: "user", content: input }];
        setChatHistory(newMessages);
        setIsGenerating(true);
        setStreamingContent('');
        setTokensPerSecond(0);
        setTokenCount(0);

        await llm.generate(
            newMessages,
            (output, tps, numTokens) => {
                setStreamingContent(output);
                setTokensPerSecond(tps);
                setTokenCount(numTokens);
            },
            (output, tps, numTokens) => {
                setChatHistory(prev => [...prev, { role: "assistant", content: output }]);
                setStreamingContent('');
                setIsGenerating(false);
            },
            (errorMsg) => {
                setError(errorMsg);
                setIsGenerating(false);
            }
        );
    };

    const handleStop = () => {
        llm.interrupt();
    };

    const handleNewChat = () => {
        setChatHistory([]);
        setStreamingContent('');
        setTokensPerSecond(0);
        setTokenCount(0);
        llm.reset();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleTextareaChange = (e) => {
        setInputValue(e.target.value);
        // Auto-resize
        e.target.style.height = '56px';
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    };

    const showEmptyState = !modelLoaded && !isModelLoading && chatHistory.length === 0;
    const showLoading = isModelLoading && chatHistory.length === 0;

    return (
        <div className="w-full max-w-3xl flex flex-col h-[calc(100vh-80px)] md:h-screen">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-[#252525]">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold">LFM 2.5 Chat</h1>
                    {modelLoaded && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                            LFM 2.5 {modelState.llm === 'wllama' ? '(GGUF)' : '(ONNX)'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isGenerating && (
                        <div className="text-xs text-[#a0a0a0] mr-2">
                            {tokensPerSecond.toFixed(1)} tok/s · {tokenCount} tokens
                        </div>
                    )}
                    {chatHistory.length > 0 && (
                        <button
                            onClick={handleNewChat}
                            className="button-secondary px-3 py-1.5 text-sm"
                            disabled={isGenerating}
                        >
                            New Chat
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4">
                {showEmptyState && (
                    <EmptyState onLoadModel={loadModel} isLoading={isModelLoading} />
                )}

                {showLoading && (
                    <LoadingIndicator message={loadingMessage} progress={loadingProgress} />
                )}

                {error && (
                    <div className="my-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {chatHistory.map((msg, i) => (
                    <Message key={i} message={msg} />
                ))}

                {isGenerating && streamingContent && (
                    <Message 
                        message={{ role: 'assistant', content: streamingContent }} 
                        isStreaming={true}
                    />
                )}

                {isGenerating && !streamingContent && (
                    <div className="flex gap-4 py-4">
                        <div className="w-8 h-8 rounded-full bg-[#ff7b00] flex items-center justify-center text-sm font-bold text-[#0a0a0a]">
                            AI
                        </div>
                        <div className="flex items-center gap-1 text-[#666]">
                            <span className="w-2 h-2 bg-[#ff7b00] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-[#ff7b00] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-[#ff7b00] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {(modelLoaded || chatHistory.length > 0 || isModelLoading) && (
                <div className="flex-shrink-0 p-4 border-t border-[#252525]">
                    <div className="flex gap-3">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Message LFM 2.5..."
                            disabled={isGenerating || isModelLoading}
                            className="flex-1 p-4 bg-[#1a1a1a] border border-[#333] rounded-xl resize-none 
                                focus:outline-none focus:border-[#ff7b00] transition-colors
                                disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ height: '56px', maxHeight: '200px' }}
                        />
                        {isGenerating ? (
                            <button
                                onClick={handleStop}
                                className="px-6 py-4 bg-red-500/20 text-red-400 border border-red-500/30 
                                    rounded-xl hover:bg-red-500/30 transition-colors font-medium"
                            >
                                Stop
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={!inputValue.trim() || isModelLoading}
                                className="button-primary px-6 py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-[#666] mt-2 text-center">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </div>
            )}
        </div>
    );
}
