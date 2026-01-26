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

            if (preferences.llm && !modelState.llm) {
                const { pipeline } = await import('@huggingface/transformers');
                const llmModel = await pipeline('text-generation', 'Mozilla/Qwen2.5-0.5B-Instruct', {
                    quantized: true
                });
                setModelState(prev => ({ ...prev, llm: llmModel }));
            }
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
                                href="https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#ff7b00] hover:underline"
                            >
                                Qwen2.5-0.5B-Instruct
                            </a>
                            <div className={`text-sm ${modelState.llm ? 'text-green-500' : 'text-[#a0a0a0]'}`}>
                                {modelState.llm ? 'Loaded' : 'Unloaded'}
                            </div>
                        </div>
                        <button
                            onClick={() => toggleModel('llm')}
                            className="px-4 py-2 bg-[#1a1a1a] text-[#ff7b00] border border-[#ff7b00] rounded hover:bg-[#252525]"
                        >
                            {modelState.llm ? 'Unload' : 'Load'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 