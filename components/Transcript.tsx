
import React, { useRef, useEffect } from 'react';
import { TranscriptionEntry } from '../types';

interface TranscriptProps {
  entries: TranscriptionEntry[];
  currentInput: string;
  currentOutput: string;
}

const Transcript: React.FC<TranscriptProps> = ({ entries, currentInput, currentOutput }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, currentInput, currentOutput]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 scroll-smooth pr-2 custom-scrollbar">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm md:text-base ${
                entry.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}
        
        {/* Real-time streaming UI */}
        {currentInput && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm md:text-base bg-blue-600/50 text-white italic animate-pulse rounded-tr-none">
              {currentInput}
            </div>
          </div>
        )}
        
        {currentOutput && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm md:text-base bg-zinc-800/50 text-zinc-300 italic animate-pulse rounded-tl-none border border-zinc-700/50">
              {currentOutput}
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default Transcript;
