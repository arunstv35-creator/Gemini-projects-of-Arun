
import React from 'react';
import { AssistantState } from '../types';

interface AssistantVisualizerProps {
  state: AssistantState;
}

const AssistantVisualizer: React.FC<AssistantVisualizerProps> = ({ state }) => {
  const getGlowColors = () => {
    switch (state) {
      case AssistantState.LISTENING:
        return 'from-blue-500 via-cyan-400 to-indigo-500';
      case AssistantState.THINKING:
        return 'from-purple-500 via-pink-400 to-blue-500 animate-spin-slow';
      case AssistantState.SPEAKING:
        return 'from-green-400 via-emerald-500 to-teal-400 scale-110';
      case AssistantState.ERROR:
        return 'from-red-500 via-orange-400 to-rose-600';
      case AssistantState.CONNECTING:
        return 'from-gray-500 via-slate-400 to-zinc-500';
      default:
        return 'from-blue-600/30 via-blue-400/20 to-transparent';
    }
  };

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
      {/* Background Glows */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${getGlowColors()} glow-sphere transition-all duration-1000`} />
      
      {/* Center Core */}
      <div className="relative z-10 w-32 h-32 md:w-40 md:h-40 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden">
        <div className={`w-full h-full absolute inset-0 bg-gradient-to-br opacity-20 ${getGlowColors()}`} />
        <div className="flex space-x-1 items-center justify-center">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-300 ${
                state === AssistantState.LISTENING || state === AssistantState.SPEAKING 
                  ? 'h-8 bg-white' 
                  : 'h-2 bg-white/50'
              }`}
              style={{
                animation: state === AssistantState.LISTENING || state === AssistantState.SPEAKING
                  ? `pulse 1s ease-in-out infinite ${i * 0.15}s`
                  : 'none'
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { height: 10px; opacity: 0.5; }
          50% { height: 40px; opacity: 1; }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AssistantVisualizer;
