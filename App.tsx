
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { AssistantState, TranscriptionEntry, SmartHomeState } from './types';
import { decode, encode, decodeAudioData, float32ToInt16 } from './utils/audio';
import AssistantVisualizer from './components/AssistantVisualizer';
import Transcript from './components/Transcript';
import SmartControls from './components/SmartControls';

const App: React.FC = () => {
  const [assistantState, setAssistantState] = useState<AssistantState>(AssistantState.IDLE);
  const [entries, setEntries] = useState<TranscriptionEntry[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentOutput, setCurrentOutput] = useState('');
  const [smartHome, setSmartHome] = useState<SmartHomeState>({
    lights: { livingRoom: false, kitchen: false, bedroom: false },
    temperature: 22
  });

  const sessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionRef = useRef({ input: '', output: '' });

  // Function Declarations for Gemini
  const setLightFunction: FunctionDeclaration = {
    name: 'set_light',
    parameters: {
      type: Type.OBJECT,
      description: 'Set the state of a specific room light.',
      properties: {
        room: { type: Type.STRING, enum: ['livingRoom', 'kitchen', 'bedroom'], description: 'The room name' },
        isOn: { type: Type.BOOLEAN, description: 'True to turn on, false for off' }
      },
      required: ['room', 'isOn']
    }
  };

  const setTemperatureFunction: FunctionDeclaration = {
    name: 'set_temperature',
    parameters: {
      type: Type.OBJECT,
      description: 'Set the target temperature of the thermostat.',
      properties: {
        value: { type: Type.NUMBER, description: 'Temperature in Celsius' }
      },
      required: ['value']
    }
  };

  const stopConversation = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    // We keep outputAudioCtx for cleanup if needed, but usually just stop sources
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setAssistantState(AssistantState.IDLE);
  }, []);

  const startConversation = async () => {
    try {
      setAssistantState(AssistantState.CONNECTING);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // Setup Audio Contexts
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioCtxRef.current = inCtx;
      outputAudioCtxRef.current = outCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setAssistantState(AssistantState.LISTENING);
            const source = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16Data = float32ToInt16(inputData);
              const base64Data = encode(new Uint8Array(int16Data.buffer));
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
            
            source.connect(processor);
            processor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outCtx) {
              setAssistantState(AssistantState.SPEAKING);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                  setAssistantState(AssistantState.LISTENING);
                }
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              transcriptionRef.current.input += text;
              setCurrentInput(transcriptionRef.current.input);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              transcriptionRef.current.output += text;
              setCurrentOutput(transcriptionRef.current.output);
            }

            // Handle Turn Complete
            if (message.serverContent?.turnComplete) {
              const { input, output } = transcriptionRef.current;
              if (input || output) {
                setEntries(prev => [
                  ...prev,
                  ...(input ? [{ id: Math.random().toString(), role: 'user' as const, text: input, timestamp: Date.now() }] : []),
                  ...(output ? [{ id: Math.random().toString(), role: 'assistant' as const, text: output, timestamp: Date.now() }] : [])
                ]);
              }
              transcriptionRef.current = { input: '', output: '' };
              setCurrentInput('');
              setCurrentOutput('');
            }

            // Handle Function Calls (Smart Home Simulation)
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                console.log('Gemini calling:', fc.name, fc.args);
                let result = "ok";
                
                if (fc.name === 'set_light') {
                  const { room, isOn } = fc.args as any;
                  setSmartHome(prev => ({
                    ...prev,
                    lights: { ...prev.lights, [room]: isOn }
                  }));
                  result = `Light in ${room} turned ${isOn ? 'on' : 'off'}.`;
                } else if (fc.name === 'set_temperature') {
                  const { value } = fc.args as any;
                  setSmartHome(prev => ({ ...prev, temperature: value }));
                  result = `Thermostat set to ${value} degrees.`;
                }

                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result }
                    }
                  });
                });
              }
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error('Gemini Live Error:', e);
            setAssistantState(AssistantState.ERROR);
            stopConversation();
          },
          onclose: () => {
            setAssistantState(AssistantState.IDLE);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: "You are a helpful and friendly smart home assistant named Gemini. You can control lights and thermostat. Be conversational, concise, and professional. Use the provided tools when the user asks to change the environment.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [setLightFunction, setTemperatureFunction] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });

      const session = await sessionPromise;
      sessionRef.current = session;

    } catch (err) {
      console.error('Failed to start conversation:', err);
      setAssistantState(AssistantState.ERROR);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white selection:bg-blue-500/30">
      {/* Header */}
      <header className="p-6 flex justify-between items-center z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-xs">G</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Gemini Home</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">Smart Assistant Hub</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-end">
             <span className="text-xs text-zinc-400">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             <span className="text-[10px] text-zinc-600">CONNECTED</span>
          </div>
        </div>
      </header>

      {/* Main Experience */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Interaction & Visuals */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
          <AssistantVisualizer state={assistantState} />
          
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-light text-zinc-300">
              {assistantState === AssistantState.IDLE && "Waiting for command..."}
              {assistantState === AssistantState.CONNECTING && "Establishing link..."}
              {assistantState === AssistantState.LISTENING && "I'm listening..."}
              {assistantState === AssistantState.SPEAKING && "Gemini speaking..."}
              {assistantState === AssistantState.THINKING && "Processing..."}
              {assistantState === AssistantState.ERROR && "Connection error"}
            </h2>
            <p className="text-sm text-zinc-500 mt-2 max-w-xs mx-auto">
              {assistantState === AssistantState.IDLE ? "Tap the button below to start your assistant." : "You can speak naturally to Gemini."}
            </p>
          </div>

          <div className="mt-12">
            <button
              onClick={assistantState === AssistantState.IDLE ? startConversation : stopConversation}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                assistantState === AssistantState.IDLE 
                  ? 'bg-white text-black hover:scale-105 active:scale-95' 
                  : 'bg-red-500 text-white animate-pulse'
              }`}
            >
              {assistantState === AssistantState.IDLE ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Log / Transcript (Hidden on mobile or condensed) */}
        <div className="w-full md:w-[400px] flex flex-col border-l border-white/5 bg-zinc-950/30 backdrop-blur-xl z-10">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Conversation Log</span>
            <button 
              onClick={() => setEntries([])}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase underline decoration-zinc-700"
            >
              Clear
            </button>
          </div>
          <Transcript 
            entries={entries} 
            currentInput={currentInput} 
            currentOutput={currentOutput} 
          />
          <SmartControls state={smartHome} />
        </div>
      </main>

      {/* Decorative Blur Elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
};

export default App;
