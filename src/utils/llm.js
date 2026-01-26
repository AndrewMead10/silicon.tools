import { Wllama } from '@wllama/wllama/esm/index.js';

let wllama = null;
let abortController = null;

const WLLAMA_CONFIG = {
    hfRepo: 'LiquidAI/LFM2.5-1.2B-Instruct-GGUF',
    hfFile: 'LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
};

const WLLAMA_CONFIG_PATHS = {
    'single-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@latest/esm/single-thread/wllama.wasm',
    'multi-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@latest/esm/multi-thread/wllama.wasm',
};

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

function formatMessages(messages) {
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
            message: 'Using wllama (llama.cpp) - LFM 2.5 Q4'
        };
    }

    return {
        supported: false,
        message: 'Browser does not support OPFS (required for wllama)'
    };
}

export async function loadModel(onProgress, onStatus) {
    const support = await checkBrowserSupport();

    if (!support.supported) {
        throw new Error(support.message);
    }

    onStatus?.(support.message);

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

    return 'wllama';
}

export async function generate(messages, onToken, onComplete, onError) {
    if (!wllama) {
        onError?.('Model not loaded');
        return;
    }

    abortController = new AbortController();
    const prompt = formatMessages(messages);

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

export function interrupt() {
    if (abortController) {
        abortController.abort();
    }
}

export function isLoaded() {
    return wllama !== null;
}

export async function reset() {
    // wllama doesn't have a built-in reset, but we can clear the context
    // by creating a minimal completion to reset internal state
    if (wllama) {
        try {
            await wllama.kvClear();
        } catch {
            // kvClear may not be available in all versions
        }
    }
}
