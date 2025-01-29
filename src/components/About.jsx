export default function About() {
    return (
        <div className="w-full max-w-3xl p-8">
            <h1 className="text-2xl font-bold mb-6 text-[#ff7b00]">About silicon.tools</h1>

            <div className="space-y-6 text-gray-300">
                <p>
                    silicon.tools is a collection of AI-powered tools that run entirely in your browser.
                    No data leaves your device - all processing happens locally using WebAssembly and WebWorkers.
                </p>

                <div>
                    <h2 className="text-xl font-semibold mb-3 text-[#ff7b00]">Features</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Speech-to-Text transcription using Whisper</li>
                        <li>Text-to-Speech synthesis</li>
                        <li>AI Chat powered by various open-source LLMs</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-3 text-[#ff7b00]">Privacy First</h2>
                    <p>
                        All computations are performed locally in your browser. Your audio, text, and conversations
                        never leave your device, ensuring complete privacy.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-3 text-[#ff7b00]">Open Source</h2>
                    <p>
                        This project is open source and available on{' '}
                        <a
                            href="https://github.com/nsarrazin/silicon.tools"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#ff7b00] hover:underline"
                        >
                            GitHub
                        </a>.
                    </p>
                </div>
            </div>
        </div>
    );
} 