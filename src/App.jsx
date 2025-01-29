import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import WhisperASR from './components/WhisperASR';
import TextToSpeech from './components/TextToSpeech';
import LLMChat from './components/LLMChat';
import Settings from './components/Settings';
import About from './components/About';
import Donate from './components/Donate';

function App() {
    const [activeTab, setActiveTab] = useState('whisper');
    const [modelState, setModelState] = useState(() => {
        // Initialize from localStorage or default values
        const savedState = localStorage.getItem('modelState');
        return savedState ? JSON.parse(savedState) : {
            whisper: null,
            tts: null,
            llm: null
        };
    });
    const [modelLoadedState, setModelLoadedState] = useState({
        whisper: false,
        tts: false,
        llm: false
    });
    const [transcriptionData, setTranscriptionData] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [ttsText, setTtsText] = useState("");
    const [audioState, setAudioState] = useState({
        url: '',
        blob: null
    });

    // Save modelState changes to localStorage
    useEffect(() => {
        localStorage.setItem('modelState', JSON.stringify(modelState));
    }, [modelState]);

    useEffect(() => {
        return () => {
            // Cleanup audio URL when component unmounts
            if (audioState.url) {
                URL.revokeObjectURL(audioState.url);
            }
        };
    }, []);

    // console.log('Model State:', modelState);
    // console.log('Model Loaded State:', modelLoadedState);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="flex min-h-screen">
                <Sidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
                <div className="flex-1 ml-[200px] flex justify-center">
                    {activeTab === 'whisper' && (
                        <WhisperASR
                            modelState={modelState}
                            setModelState={setModelState}
                            modelLoaded={modelLoadedState.whisper}
                            setModelLoaded={(loaded) => setModelLoadedState(prev => ({ ...prev, whisper: loaded }))}
                            transcriptionText={transcriptionData}
                            setTranscriptionText={setTranscriptionData}
                        />
                    )}
                    {activeTab === 'tts' && (
                        <TextToSpeech
                            modelState={modelState}
                            setModelState={setModelState}
                            modelLoaded={modelLoadedState.tts}
                            setModelLoaded={(loaded) => setModelLoadedState(prev => ({ ...prev, tts: loaded }))}
                            ttsText={ttsText}
                            setTtsText={setTtsText}
                            audioState={audioState}
                            setAudioState={setAudioState}
                        />
                    )}
                    {activeTab === 'llm' && (
                        <LLMChat
                            modelState={modelState}
                            setModelState={setModelState}
                            modelLoaded={modelLoadedState.llm}
                            setModelLoaded={(loaded) => setModelLoadedState(prev => ({ ...prev, llm: loaded }))}
                            chatHistory={chatHistory}
                            setChatHistory={setChatHistory}
                        />
                    )}
                    {activeTab === 'settings' && (
                        <Settings
                            modelState={modelState}
                            setModelState={setModelState}
                        />
                    )}
                    {activeTab === 'donate' && (
                        <Donate />
                    )}
                    {activeTab === 'about' && (
                        <About />
                    )}
                </div>
            </div>
        </div>
    );
}

export default App; 