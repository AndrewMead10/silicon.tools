import { pipeline } from "@huggingface/transformers";

const PER_DEVICE_CONFIG = {
    webgpu: {
        dtype: {
            encoder_model: "fp32",
            decoder_model_merged: "q4",
        },
        device: "webgpu",
    },
    wasm: {
        dtype: "q8",
        device: "wasm",
    },
};

class PipelineSingleton {
    static model_id = "Xenova/whisper-base";
    static instance = null;

    static async getInstance(progress_callback = null, device = "webgpu") {
        if (!this.instance) {
            this.instance = pipeline("automatic-speech-recognition", this.model_id, {
                // ...PER_DEVICE_CONFIG[device],
                progress_callback,
            });
        }
        return this.instance;
    }
}

async function load({ device }) {
    self.postMessage({
        status: "loading",
        data: `Loading model (${device})...`,
        progress: 0
    });

    const transcriber = await PipelineSingleton.getInstance((x) => {
        self.postMessage({
            status: "loading",
            data: x.status,
            progress: x.progress
        });
    }, device);

    if (device === "webgpu") {
        self.postMessage({
            status: "loading",
            data: "Compiling shaders and warming up model...",
            progress: 0.9
        });

        await transcriber(new Float32Array(16_000));
    }

    self.postMessage({ status: "ready" });
}

async function run(audio) {
    const transcriber = await PipelineSingleton.getInstance();
    const start = performance.now();

    const result = await transcriber(audio);
    const end = performance.now();

    self.postMessage({ status: "complete", data: result.text, time: end - start });
}

self.addEventListener("message", async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case "load":
            load(data);
            break;

        case "run":
            run(data.audio);
            break;
    }
}); 