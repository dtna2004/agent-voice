export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  imageUrl?: string; // If the message results in a new image state
}

export interface HistoryItem {
  id: string;
  imageBase64: string;
  prompt: string; // The command that created this version
  timestamp: number;
}

export interface ImageState {
  items: HistoryItem[];
  currentIndex: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  TRANSCRIBING = 'TRANSCRIBING',
  EDITING = 'EDITING',
  ERROR = 'ERROR'
}
