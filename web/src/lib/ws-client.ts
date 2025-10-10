// web/src/lib/ws-client.ts
export type StreamFormat = 'mp3' | 'wav' | 'pcm16';

export type VoiceConfig = {
  format?: StreamFormat;
  language: string;
  voiceId: string;
  sampleRate?: number;
  style?: string;
  channels?: 1 | 2;
};

// Resolve API base (in this order):
// 1) window.__API_BASE_URL__ (runtime override)
// 2) VITE_API_BASE_URL (baked at build time)
// 3) window.location.origin (same origin)
function getApiBase(): string {
  const runtime = (window as any).__API_BASE_URL__ as string | undefined;
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return (runtime || fromEnv || window.location.origin).replace(/\/+$/, '');
}

// Build WS URL with correct scheme (ws/wss)
function toWs(url: string): string {
  // https -> wss, http -> ws
  return url.replace(/^http/i, 'ws');
}

export function connectTTS(): WebSocket {
  const apiBase = getApiBase();
  const wsUrl = `${toWs(apiBase)}/ws/tts`;

  // helpful console trace
  // eslint-disable-next-line no-console
  console.log('[ws-client] connecting to', wsUrl);

  const ws = new WebSocket(wsUrl);
  return ws;
}

export function sendVoiceConfig(ws: WebSocket, cfg: VoiceConfig) {
  const msg = { type: 'voice_config', ...cfg };
  ws.send(JSON.stringify(msg));
}

export function sendText(ws: WebSocket, text: string) {
  ws.send(JSON.stringify({ type: 'text', input: text }));
}
