// Import from the ESM build directly
import { Wllama } from '@wllama/wllama/esm/index.js';

let wllama = null;

const MODEL_CONFIG = {
    hfRepo: 'LiquidAI/LFM2.5-1.2B-Instruct-GGUF',
    hfFile: 'LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
};

// WASM paths from CDN
const WLLAMA_CONFIG_PATHS = {
    'single-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@latest/esm/single-thread/wllama.wasm',
    'multi-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@latest/esm/multi-thread/wllama.wasm',
};

// Chat template for LFM 2.5
function formatMessages(messages) {
    let prompt = '';
    for (const msg of messages) {
        prompt += `${msg.role}\n${msg.content}\n`;
    }
    prompt += 'assistant\n';
    return prompt;
}

async function load() {
    self.postMessage({
        status: 'loading',
        message: 'Initializing wllama...',
        progress: 0,
    });

    wllama = new Wllama(WLLAMA_CONFIG_PATHS, {
        parallelDownloads: 3,
    });

    await wllama.loadModelFromHF(MODEL_CONFIG.hfRepo, MODEL_CONFIG.hfFile, {
        progressCallback: ({ loaded, total }) => {
            const progress = Math.round((loaded / total) * 100);
            self.postMessage({
                status: 'progress',
                message: `Downloading model... ${(loaded / 1024 / 1024).toFixed(0)}MB / ${(total / 1024 / 1024).toFixed(0)}MB`,
                progress,
            });
        },
    });

    self.postMessage({
        status: 'loading',
        message: 'Model loaded, warming up...',
        progress: 100,
    });

    // Quick warmup
    await wllama.createCompletion('Hi', { nPredict: 1 });

    self.postMessage({ status: 'ready' });
}

let abortController = null;

async function generate(messages) {
    if (!wllama) {
        self.postMessage({
            status: 'error',
            message: 'Model not loaded',
        });
        return;
    }

    abortController = new AbortController();
    const prompt = formatMessages(messages);
    
    let output = '';
    let numTokens = 0;
    let startTime = null;
    let tps = 0;

    self.postMessage({ status: 'start' });

    try {
        await wllama.createCompletion(prompt, {
            nPredict: 2048,
            sampling: {
                temp: 0.7,
                top_k: 40,
                top_p: 0.9,
            },
            onNewToken: (token, piece, currentText, { abortSignal }) => {
                if (abortController.signal.aborted) {
                    abortSignal();
                    return;
                }

                startTime ??= performance.now();
                numTokens++;
                
                if (numTokens > 1) {
                    tps = ((numTokens - 1) / (performance.now() - startTime)) * 1000;
                }

                output = currentText;

                self.postMessage({
                    status: 'update',
                    output: output,
                    tps,
                    numTokens,
                });
            },
        });

        self.postMessage({
            status: 'complete',
            output: output,
            tps,
            numTokens,
        });
    } catch (error) {
        if (abortController.signal.aborted) {
            // User interrupted, send what we have
            self.postMessage({
                status: 'complete',
                output: output,
                tps,
                numTokens,
            });
        } else {
            self.postMessage({
                status: 'error',
                message: error.message || 'Generation failed',
            });
        }
    }

    abortController = null;
}

function interrupt() {
    if (abortController) {
        abortController.abort();
    }
}

async function reset() {
    // Clear KV cache if supported
    // wllama handles this internally for new completions
}

self.addEventListener('message', async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case 'load':
            try {
                await load();
            } catch (error) {
                self.postMessage({
                    status: 'error',
                    message: error.message || 'Failed to load model',
                });
            }
            break;
        case 'generate':
            await generate(data);
            break;
        case 'interrupt':
            interrupt();
            break;
        case 'reset':
            await reset();
            break;
    }
});
