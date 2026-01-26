import { Wllama } from '@wllama/wllama/esm/index.js';
import { AutoTokenizer, AutoModelForCausalLM, TextStreamer, InterruptableStoppingCriteria } from '@huggingface/transformers';

let backend = null; // 'wllama' or 'transformers'
let wllama = null;
let transformersModel = null;
let transformersTokenizer = null;
let abortController = null;
let stoppingCriteria = null;

const WLLAMA_CONFIG = {
    hfRepo: 'LiquidAI/LFM2.5-1.2B-Instruct-GGUF',
    hfFile: 'LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
};

const TRANSFORMERS_MODEL = 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX';

// WASM paths from CDN
const WLLAMA_CONFIG_PATHS = {
    'single-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@latest/esm/single-thread/wllama.wasm',
    'multi-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@latest/esm/multi-thread/wllama.wasm',
};

// Check if browser supports OPFS (required by wllama)
async function supportsOPFS() {
    if (!navigator.storage?.getDirectory) {
        return false;
    }
    try {
        await navigator.storage.getDirectory();
        return true;
    } catch (e) {
        return false;
    }
}

// Chat template for LFM 2.5 (wllama)
function formatMessagesWllama(messages) {
    let prompt = '';
    for (const msg of messages) {
        prompt += `${msg.role}\n${msg.content}\n`;
    }
    prompt += 'assistant\n';
    return prompt;
}

export async function checkBrowserSupport() {
    const opfsSupported = await supportsOPFS();
    
    if (opfsSupported) {
        return { 
            supported: true, 
            backend: 'wllama',
            message: 'Using wllama (llama.cpp) - LFM 2.5 Q4'
        };
    }
    
    // Fallback to transformers.js for iOS/unsupported browsers
    return { 
        supported: true, 
        backend: 'transformers',
        message: 'Using transformers.js (LFM 2.5 ONNX) - iOS compatible'
    };
}

export async function loadModel(onProgress, onStatus) {
    const support = await checkBrowserSupport();
    backend = support.backend;
    
    onStatus?.(support.message);
    
    if (backend === 'wllama') {
        await loadWllama(onProgress, onStatus);
    } else {
        await loadTransformers(onProgress, onStatus);
    }
    
    return backend;
}

async function loadWllama(onProgress, onStatus) {
    onStatus?.('Initializing wllama...');

    wllama = new Wllama(WLLAMA_CONFIG_PATHS, {
        parallelDownloads: 3,
    });

    await wllama.loadModelFromHF(WLLAMA_CONFIG.hfRepo, WLLAMA_CONFIG.hfFile, {
        progressCallback: ({ loaded, total }) => {
            const progress = Math.round((loaded / total) * 100);
            const loadedMB = (loaded / 1024 / 1024).toFixed(0);
            const totalMB = (total / 1024 / 1024).toFixed(0);
            onProgress?.(progress, `Downloading LFM 2.5... ${loadedMB}MB / ${totalMB}MB`);
        },
    });

    onStatus?.('Warming up...');
    onProgress?.(100, 'Warming up...');
    await wllama.createCompletion('Hi', { nPredict: 1 });
}

async function loadTransformers(onProgress, onStatus) {
    onStatus?.('Loading LFM 2.5 (ONNX)...');
    
    stoppingCriteria = new InterruptableStoppingCriteria();

    try {
        transformersTokenizer = await AutoTokenizer.from_pretrained(TRANSFORMERS_MODEL, {
            progress_callback: (p) => {
                if (p.status === 'progress') {
                    onProgress?.(Math.round(p.progress * 0.3), `Loading tokenizer... ${Math.round(p.progress)}%`);
                }
            }
        });

        onProgress?.(30, 'Loading model...');

        // Use CPU-only settings for iOS compatibility
        transformersModel = await AutoModelForCausalLM.from_pretrained(TRANSFORMERS_MODEL, {
            dtype: 'q4', // Use Q4 quantization
            device: 'wasm', // Force WASM backend, not WebGPU (iOS compatible)
            progress_callback: (p) => {
                if (p.status === 'progress') {
                    const overallProgress = 30 + Math.round(p.progress * 0.65);
                    onProgress?.(overallProgress, `Loading LFM 2.5... ${Math.round(p.progress)}%`);
                }
            }
        });

        onProgress?.(95, 'Ready!');
        onStatus?.('Model loaded!');
        
        // Skip warmup on iOS to avoid memory issues
        // The first inference will be slightly slower
        
    } catch (error) {
        console.error('Transformers.js load error:', error);
        throw new Error(`Failed to load model: ${error.message}`);
    }
}

export async function generate(messages, onToken, onComplete, onError) {
    if (backend === 'wllama') {
        await generateWllama(messages, onToken, onComplete, onError);
    } else {
        await generateTransformers(messages, onToken, onComplete, onError);
    }
}

async function generateWllama(messages, onToken, onComplete, onError) {
    if (!wllama) {
        onError?.('Model not loaded');
        return;
    }

    abortController = new AbortController();
    const prompt = formatMessagesWllama(messages);

    let output = '';
    let numTokens = 0;
    let startTime = null;
    let tps = 0;

    try {
        await wllama.createCompletion(prompt, {
            nPredict: 2048,
            sampling: {
                temp: 0.7,
                top_k: 40,
                top_p: 0.9,
            },
            onNewToken: (token, piece, currentText, { abortSignal }) => {
                if (abortController?.signal.aborted) {
                    abortSignal();
                    return;
                }

                startTime ??= performance.now();
                numTokens++;

                if (numTokens > 1) {
                    tps = ((numTokens - 1) / (performance.now() - startTime)) * 1000;
                }

                output = currentText;
                onToken?.(output, tps, numTokens);
            },
        });

        onComplete?.(output, tps, numTokens);
    } catch (error) {
        if (abortController?.signal.aborted) {
            onComplete?.(output, tps, numTokens);
        } else {
            onError?.(error.message || 'Generation failed');
        }
    }

    abortController = null;
}

async function generateTransformers(messages, onToken, onComplete, onError) {
    if (!transformersModel || !transformersTokenizer) {
        onError?.('Model not loaded');
        return;
    }

    stoppingCriteria.reset();
    
    let output = '';
    let numTokens = 0;
    let startTime = null;
    let tps = 0;

    try {
        const inputs = transformersTokenizer.apply_chat_template(messages, {
            add_generation_prompt: true,
            return_dict: true,
        });

        const streamer = new TextStreamer(transformersTokenizer, {
            skip_prompt: true,
            skip_special_tokens: true,
            callback_function: (text) => {
                startTime ??= performance.now();
                numTokens++;
                
                if (numTokens > 1) {
                    tps = ((numTokens - 1) / (performance.now() - startTime)) * 1000;
                }
                
                output = text;
                onToken?.(output, tps, numTokens);
            },
        });

        await transformersModel.generate({
            ...inputs,
            max_new_tokens: 1024,
            do_sample: true,
            temperature: 0.7,
            top_p: 0.9,
            streamer,
            stopping_criteria: stoppingCriteria,
        });

        onComplete?.(output, tps, numTokens);
    } catch (error) {
        if (stoppingCriteria.wasInterrupted) {
            onComplete?.(output, tps, numTokens);
        } else {
            onError?.(error.message || 'Generation failed');
        }
    }
}

export function interrupt() {
    if (backend === 'wllama' && abortController) {
        abortController.abort();
    } else if (backend === 'transformers' && stoppingCriteria) {
        stoppingCriteria.interrupt();
    }
}

export function reset() {
    if (backend === 'transformers' && stoppingCriteria) {
        stoppingCriteria.reset();
    }
}

export function isLoaded() {
    if (backend === 'wllama') {
        return wllama !== null;
    } else {
        return transformersModel !== null && transformersTokenizer !== null;
    }
}

export function getBackend() {
    return backend;
}
