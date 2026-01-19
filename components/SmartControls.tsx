
import React from 'react';
import { SmartHomeState } from '../types';

interface SmartControlsProps {
  state: SmartHomeState;
}

const SmartControls: React.FC<SmartControlsProps> = ({ state }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-zinc-900/50 backdrop-blur-md border-t border-white/5">
      <div className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${state.lights.livingRoom ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
        <span className="text-xs font-medium uppercase mb-1">Living Room</span>
        <span className="text-xl">💡</span>
        <span className="text-xs mt-2">{state.lights.livingRoom ? 'ON' : 'OFF'}</span>
      </div>
      <div className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${state.lights.kitchen ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
        <span className="text-xs font-medium uppercase mb-1">Kitchen</span>
        <span className="text-xl">💡</span>
        <span className="text-xs mt-2">{state.lights.kitchen ? 'ON' : 'OFF'}</span>
      </div>
      <div className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${state.lights.bedroom ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
        <span className="text-xs font-medium uppercase mb-1">Bedroom</span>
        <span className="text-xl">💡</span>
        <span className="text-xs mt-2">{state.lights.bedroom ? 'ON' : 'OFF'}</span>
      </div>
      <div className="p-4 rounded-xl border border-zinc-700 bg-zinc-800 flex flex-col items-center justify-center text-zinc-300">
        <span className="text-xs font-medium uppercase mb-1">Thermostat</span>
        <span className="text-2xl font-bold">{state.temperature}°C</span>
        <span className="text-xs mt-2">OPTIMAL</span>
      </div>
    </div>
  );
};

export default SmartControls;
