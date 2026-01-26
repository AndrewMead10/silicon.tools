import { useEffect } from 'react';

export default function Settings({
    modelState,
    setModelState,
}) {
    // Load saved preferences on mount
    useEffect(() => {
        const preferences = JSON.parse(localStorage.getItem('modelPreferences')) || {};
        loadModels(preferences);
    }, []);

    const loadModels = async (preferences) => {
        try {
            if (preferences.whisper && !modelState.whisper) {
                const { pipeline } = await import('@huggingface/transformers');
                const whisperModel = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base');
                setModelState(prev => ({ ...prev, whisper: whisperModel }));
            }

            if (preferences.tts && !modelState.tts) {
                const { KokoroTTS } = await import('kokoro-js');
                const ttsModel = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-ONNX", {
                    dtype: "q8"
                });
                setModelState(prev => ({ ...prev, tts: ttsModel }));
            }

            // LLM is handled by its own page/worker now
        } catch (error) {
            console.error('Error loading models:', error);
        }
    };

    const toggleModel = async (modelId) => {
        const preferences = JSON.parse(localStorage.getItem('modelPreferences')) || {};

        if (modelState[modelId]) {
            setModelState(prev => ({ ...prev, [modelId]: null }));
            preferences[modelId] = false;
        } else {
            try {
                await loadModels({ ...preferences, [modelId]: true });
                preferences[modelId] = true;
            } catch (error) {
                console.error(`Error loading ${modelId} model:`, error);
            }
        }

        localStorage.setItem('modelPreferences', JSON.stringify(preferences));
    };

    return (
        <div className="w-full max-w-3xl p-8">
            <div className="mb-8">
                <h2 className="text-2xl mb-4">Settings</h2>
            </div>

            <div className="bg-[#1a1a1a] p-6 rounded">
                <h3 className="text-[#a0a0a0] text-lg mb-4">Models</h3>

                <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-[#0a0a0a] border border-[#333]">
                        <div>
                            <div className="font-bold">Whisper ASR</div>
                            <a
                                href="https://huggingface.co/openai/whisper-base"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#ff7b00] hover:underline"
                            >
                                whisper-base
                            </a>
                            <div className={`text-sm ${modelState.whisper ? 'text-green-500' : 'text-[#a0a0a0]'}`}>
                                {modelState.whisper ? 'Loaded' : 'Unloaded'}
                            </div>
                        </div>
                        <button
                            onClick={() => toggleModel('whisper')}
                            className="px-4 py-2 bg-[#1a1a1a] text-[#ff7b00] border border-[#ff7b00] rounded hover:bg-[#252525]"
                        >
                            {modelState.whisper ? 'Unload' : 'Load'}
                        </button>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-[#0a0a0a] border border-[#333]">
                        <div>
                            <div className="font-bold">Text to Speech</div>
                            <a
                                href="https://huggingface.co/hexgrad/Kokoro-82M"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#ff7b00] hover:underline"
                            >
                                Kokoro-82M
                            </a>
                            <div className={`text-sm ${modelState.tts ? 'text-green-500' : 'text-[#a0a0a0]'}`}>
                                {modelState.tts ? 'Loaded' : 'Unloaded'}
                            </div>
                        </div>
                        <button
                            onClick={() => toggleModel('tts')}
                            className="px-4 py-2 bg-[#1a1a1a] text-[#ff7b00] border border-[#ff7b00] rounded hover:bg-[#252525]"
                        >
                            {modelState.tts ? 'Unload' : 'Load'}
                        </button>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-[#0a0a0a] border border-[#333]">
                        <div>
                            <div className="font-bold">Chat LLM</div>
                            <a
                                href="https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#ff7b00] hover:underline"
                            >
                                LFM 2.5 Instruct Q4_K_M
                            </a>
                            <div className="text-xs text-[#666] mt-1">
                                ~700MB · wllama (llama.cpp) · CPU optimized
                            </div>
                            <div className={`text-sm ${modelState.llm ? 'text-green-500' : 'text-[#a0a0a0]'}`}>
                                {modelState.llm ? 'Loaded' : 'Unloaded'}
                            </div>
                        </div>
                        <div className="text-sm text-[#666]">
                            Load from Chat page
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-[#0a0a0a] border border-[#252525] rounded">
                    <h4 className="text-sm font-bold text-[#a0a0a0] mb-2">About Browser ML</h4>
                    <p className="text-xs text-[#666] leading-relaxed">
                        All models run entirely in your browser using WebGPU or WebAssembly. 
                        No data is sent to any server. Models are cached locally after first download.
                    </p>
                </div>
            </div>
        </div>
    );
}
