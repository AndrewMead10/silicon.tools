import { ModelManager, Wllama } from '@wllama/wllama';
import { WLLAMA_CONFIG_PATHS } from '../config';

let wllamaInstance;
let modelManager;
let stopSignal = false;

const DEFAULT_PARAMS = {
    nPredict: 2048,
    temperature: 0.7,
    nThreads: 0, // auto
    nContext: 2048,
    nBatch: 512,
};

async function initWllama() {
    modelManager = new ModelManager();
    wllamaInstance = new Wllama(WLLAMA_CONFIG_PATHS);
}

async function loadModel(modelUrl, params = DEFAULT_PARAMS) {
    self.postMessage({
        status: "loading",
        data: "Loading model...",
    });

    try {
        // Download model if not cached
        await modelManager.downloadModel(modelUrl, {
            progressCallback(opts) {
                self.postMessage({
                    status: "progress",
                    data: {
                        progress: opts.loaded / opts.total,
                    }
                });
            },
        });

        // Get cached model
        const models = await modelManager.getModels();
        const model = models.find(m => m.url === modelUrl);
        
        if (!model) {
            throw new Error('Model not found in cache');
        }

        // Load the model
        self.postMessage({
            status: "loading",
            data: "Initializing model...",
        });

        await wllamaInstance.loadModel(model, {
            n_threads: params.nThreads > 0 ? params.nThreads : undefined,
            n_ctx: params.nContext,
            n_batch: params.nBatch,
        });

        self.postMessage({ status: "ready" });
    } catch (error) {
        self.postMessage({ 
            status: "error", 
            error: error.message 
        });
    }
}

async function generate(messages) {
    if (!wllamaInstance) {
        throw new Error('Model not loaded');
    }

    stopSignal = false;
    let startTime = performance.now();
    let numTokens = 0;

    self.postMessage({ status: "start" });

    try {
        // Convert messages array to input string if needed
        const input = Array.isArray(messages) 
            ? messages.map(m => `${m.role}: ${m.content}`).join('\n')
            : messages;

        const result = await wllamaInstance.createCompletion(input, {
            nPredict: DEFAULT_PARAMS.nPredict,
            useCache: true,
            sampling: {
                temp: DEFAULT_PARAMS.temperature,
            },
            onNewToken(token, piece, currentText, optionals) {
                numTokens++;
                const tps = (numTokens / (performance.now() - startTime)) * 1000;

                self.postMessage({
                    status: "update",
                    output: currentText,
                    tps,
                    numTokens,
                    state: "answering"
                });

                if (stopSignal) {
                    optionals.abortSignal();
                }
            },
        });

        self.postMessage({
            status: "complete",
            output: result,
        });
    } catch (error) {
        self.postMessage({ 
            status: "error", 
            error: error.message 
        });
    }
}

// Initialize wllama when the worker starts
initWllama();

self.addEventListener("message", async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case "load":
            await loadModel(data.modelUrl, data.params);
            break;
        case "generate":
            await generate(data);
            break;
        case "interrupt":
            stopSignal = true;
            break;
        case "reset":
            stopSignal = false;
            break;
    }
}); 