
export enum AssistantState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}

export interface TranscriptionEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface SmartHomeState {
  lights: {
    livingRoom: boolean;
    kitchen: boolean;
    bedroom: boolean;
  };
  temperature: number;
}
