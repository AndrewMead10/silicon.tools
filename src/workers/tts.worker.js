import { KokoroTTS } from 'kokoro-js';

class TTSSingleton {
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (!this.instance) {
            this.instance = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-ONNX", {
                dtype: "q8",
                progress_callback,
            });
        }
        return this.instance;
    }
}

async function load() {
    self.postMessage({
        status: "loading",
        data: "Loading TTS model...",
        progress: 0
    });

    const tts = await TTSSingleton.getInstance((x) => {
        self.postMessage({
            status: "loading",
            data: x.status,
            progress: x.progress
        });
    });

    self.postMessage({ status: "ready" });
}

async function run({ text, voice }) {
    const tts = await TTSSingleton.getInstance();
    const start = performance.now();

    const audioResult = await tts.generate(text, { voice });
    const wavData = await audioResult.toWav();
    const end = performance.now();

    self.postMessage({
        status: "complete",
        result: wavData,
        time: end - start
    });
}

self.addEventListener("message", async (e) => {
    const { type, data } = e.data;

    switch (type) {
        case "load":
            load();
            break;

        case "run":
            run(data);
            break;
    }
}); 