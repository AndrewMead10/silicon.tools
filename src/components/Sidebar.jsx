export default function Sidebar({ activeTab, setActiveTab }) {
    return (
        <div className="fixed w-[200px] min-w-[200px] h-screen bg-[#1a1a1a] p-8 border-r border-[#333] flex flex-col">
            <div className="text-[#ff7b00] text-lg mb-8 text-center">silicon.tools</div>

            <div
                className={`p-4 my-2 cursor-pointer text-center transition-transform hover:text-[#ff7b00] hover:-translate-x-2 hover:-translate-y-2 
                    ${activeTab === 'whisper' ? 'text-[#ff7b00]' : ''}`}
                onClick={() => setActiveTab('whisper')}
            >
                <span className="hidden md:inline">Transcribe</span>
                <span className="md:hidden">ASR</span>
            </div>

            <div
                className={`p-4 my-2 cursor-pointer text-center transition-transform hover:text-[#ff7b00] hover:-translate-x-2 hover:-translate-y-2
                    ${activeTab === 'tts' ? 'text-[#ff7b00]' : ''}`}
                onClick={() => setActiveTab('tts')}
            >
                <span className="hidden md:inline">Text to Speech</span>
                <span className="md:hidden">TTS</span>
            </div>

            <div
                className={`p-4 my-2 cursor-pointer text-center transition-transform hover:text-[#ff7b00] hover:-translate-x-2 hover:-translate-y-2
                    ${activeTab === 'llm' ? 'text-[#ff7b00]' : ''}`}
                onClick={() => setActiveTab('llm')}
            >
                Chat
            </div>

            <div className="mt-auto pt-4 border-t border-[#333] flex flex-col gap-2">
                <div
                    className={`p-2 my-2 cursor-pointer text-center transition-transform hover:text-[#ff7b00] hover:-translate-x-2 hover:-translate-y-2
                        ${activeTab === 'settings' ? 'text-[#ff7b00]' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    Settings
                </div>
                <div
                    className={`p-2 my-2 cursor-pointer text-center transition-transform hover:text-[#ff7b00] hover:-translate-x-2 hover:-translate-y-2
                        ${activeTab === 'donate' ? 'text-[#ff7b00]' : ''}`}
                    onClick={() => setActiveTab('donate')}
                >
                    Donate
                </div>
                <div
                    className={`p-2 my-2 cursor-pointer text-center transition-transform hover:text-[#ff7b00] hover:-translate-x-2 hover:-translate-y-2
                        ${activeTab === 'about' ? 'text-[#ff7b00]' : ''}`}
                    onClick={() => setActiveTab('about')}
                >
                    About
                </div>
            </div>
        </div>
    );
} 