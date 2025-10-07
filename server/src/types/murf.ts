export type VoiceConfig = {
  language: string;
  voiceId: string;
  format?: 'mp3' | 'wav' | 'pcm16';
  sampleRate?: number;
  style?: string;
  channels?: 1 | 2;
};

export type ClientMessage =
  | { type: 'voice_config'; voice_config: VoiceConfig }
  | { type: 'text'; input: string }
  | { type: 'ping' };

export type ServerEvent =
  | { type: 'status'; message: string }
  | { type: 'error'; message: string; detail?: string }
  | { type: 'close'; code: number; reason?: string }
  | { type: 'audio'; audio: string };
