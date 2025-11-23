export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  imageUrl?: string; // If the message results in a new image state
}

export interface ImageState {
  original: string; // Base64
  current: string; // Base64
  history: string[]; // Array of Base64 strings for undo
  historyIndex: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  TRANSCRIBING = 'TRANSCRIBING',
  EDITING = 'EDITING',
  ERROR = 'ERROR'
}
