// WebSocket client helpers for AwaazPilot (Vite + React)

export type VoiceConfig = {
  language: string;              // 'mr-IN', 'te-IN', 'kn-IN', 'gu-IN', 'hi-IN', 'en-IN'
  voiceId: string;               // Murf voice id
  format?: 'mp3' | 'wav' | 'pcm16';
  sampleRate?: number;           // e.g., 24000
  style?: string;                // 'conversational', etc.
  channels?: 1 | 2;              // for PCM16 playback
};

export function apiBase() {
  // Vite exposes env via import.meta.env; keep safe fallback
  const base = (import.meta as any)?.env?.VITE_API_BASE || 'http://localhost:3000';
  return String(base).replace(/\/+$/, '');
}

export function wsUrl() {
  const base = apiBase();
  // Convert http(s) -> ws(s) and append our ws path
  const u = new URL(base);
  u.protocol = u.protocol.startsWith('https') ? 'wss:' : 'ws:';
  u.pathname = '/ws/tts';
  u.search = '';
  return u.toString();
}

export function connectTTS(): WebSocket {
  return new WebSocket(wsUrl());
}

export function sendVoiceConfig(ws: WebSocket, cfg: VoiceConfig) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'voice_config', voice_config: cfg }));
  } else {
    // queueing not implemented; caller should call after onopen
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'voice_config', voice_config: cfg }));
    }, { once: true });
  }
}

export function sendText(ws: WebSocket, text: string) {
  ws.send(JSON.stringify({ type: 'text', input: text }));
}
