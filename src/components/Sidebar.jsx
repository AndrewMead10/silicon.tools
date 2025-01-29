import React, { useState } from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleTabClick = (tab) => {
        setActiveTab(tab);
        setIsMenuOpen(false);
    };

    // Mobile top nav and menu
    const mobileNav = (
        <>
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between px-4 z-50">
                <div className="text-[#ff7b00] text-lg">silicon.tools</div>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="text-white p-2"
                >
                    {isMenuOpen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Full screen mobile menu */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-[#1a1a1a] pt-16 z-40">
                    <div className="p-4 flex flex-col">
                        <div
                            className={`p-4 my-2 cursor-pointer text-center text-xl
                                ${activeTab === 'whisper' ? 'text-[#ff7b00]' : 'text-white'}`}
                            onClick={() => handleTabClick('whisper')}
                        >
                            Transcribe
                        </div>

                        <div
                            className={`p-4 my-2 cursor-pointer text-center text-xl
                                ${activeTab === 'tts' ? 'text-[#ff7b00]' : 'text-white'}`}
                            onClick={() => handleTabClick('tts')}
                        >
                            Text to Speech
                        </div>

                        <div
                            className={`p-4 my-2 cursor-pointer text-center text-xl
                                ${activeTab === 'llm' ? 'text-[#ff7b00]' : 'text-white'}`}
                            onClick={() => handleTabClick('llm')}
                        >
                            Chat
                        </div>

                        <div className="mt-auto pt-4 border-t border-[#333]">
                            <div
                                className={`p-4 my-2 cursor-pointer text-center text-xl
                                    ${activeTab === 'settings' ? 'text-[#ff7b00]' : 'text-white'}`}
                                onClick={() => handleTabClick('settings')}
                            >
                                Settings
                            </div>
                            <div
                                className={`p-4 my-2 cursor-pointer text-center text-xl
                                    ${activeTab === 'donate' ? 'text-[#ff7b00]' : 'text-white'}`}
                                onClick={() => handleTabClick('donate')}
                            >
                                Donate
                            </div>
                            <div
                                className={`p-4 my-2 cursor-pointer text-center text-xl
                                    ${activeTab === 'about' ? 'text-[#ff7b00]' : 'text-white'}`}
                                onClick={() => handleTabClick('about')}
                            >
                                About
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // Desktop sidebar
    const desktopSidebar = (
        <div className="hidden md:flex fixed w-[200px] min-w-[200px] h-screen bg-[#1a1a1a] p-8 border-r border-[#333] flex-col">
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

    return (
        <>
            {mobileNav}
            {desktopSidebar}
        </>
    );
} 