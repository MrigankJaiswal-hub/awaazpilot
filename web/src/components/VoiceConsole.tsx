import React, { useEffect, useRef, useState } from 'react';
import { connectTTS, sendText, sendVoiceConfig, type VoiceConfig } from '../lib/ws-client';
import { StreamPlayer } from '../lib/audio'; // no StreamFormat import needed
import { useRecorder } from '../hooks/useRecorder';
import { presetsByLanguage, VOICE_PRESETS, type VoicePreset } from '../lib/voices';

const DEFAULT_TEXTS: Record<string, string> = {
  'en-IN': 'Hello! How can I help you today?',
  'hi-IN': 'नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?',
  // keep others as placeholders (not in dropdown) for later:
  'mr-IN': 'नमस्कार! मी तुमची मदत कशी करू?',
  'te-IN': 'నమస్తే! నేను ఎలా సహాయం చేయగలను?',
  'kn-IN': 'ನಮಸ್ಕಾರ! ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
  'gu-IN': 'નમસ્તે! હું તમને કેવી રીતે મદદ કરી શકું?',
};

/** Coerce any incoming string to a VoiceConfig['format'].
 *  UI / REST might say 'pcm' → we normalize to 'pcm16'.
 */
function asFormat(s?: string | null): VoiceConfig['format'] {
  if (!s) return 'mp3';
  const v = s.toLowerCase();
  if (v === 'pcm') return 'pcm16';
  if (v === 'pcm16') return 'pcm16';
  if (v === 'wav') return 'wav';
  return 'mp3';
}

export default function VoiceConsole() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const [cfg, setCfg] = useState<VoiceConfig>({
    language: 'en-IN',
    voiceId: 'en-IN-isha',
    format: 'mp3',
    sampleRate: 24000,
    style: 'Conversational',
    channels: 1,
  });

  const [voicePresetId, setVoicePresetId] = useState('en-IN-isha');
  const [text, setText] = useState(DEFAULT_TEXTS['en-IN']);
  const [logLines, setLogLines] = useState<string[]>([]);
  const playerRef = useRef<StreamPlayer | null>(null);

  // simple perf metrics
  const [runs, setRuns] = useState(0);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [avgMs, setAvgMs] = useState<number | null>(null);
  const [worstMs, setWorstMs] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const sendAtRef = useRef<number | null>(null);

  const rec = useRecorder(cfg.language);
  const [liveTranscript, setLiveTranscript] = useState('');

  useEffect(() => {
    playerRef.current = new StreamPlayer();

    const socket = connectTTS();
    setWs(socket);

    socket.onopen = () => {
      setConnected(true);
      pushLog('ws: connected');
      sendVoiceConfig(socket, cfg);
    };

    socket.onmessage = (e: MessageEvent) => {
      try {
        const msg = typeof e.data === 'string' ? JSON.parse(e.data) : null;

        if (msg?.type === 'status') {
          pushLog(`status: ${msg.message}`);
          return;
        }
        if (msg?.type === 'error') {
          pushLog(`error: ${msg.message} ${msg.detail ?? ''}`);
          return;
        }
        if (msg?.type === 'close') {
          pushLog(`close: ${msg.code} ${msg.reason ?? ''}`);
          setConnected(false);
          setIsLive(false);
          return;
        }

        // 🔊 AUDIO HANDLING (robust)
        const b64: string | undefined = msg?.audioBase64 ?? msg?.audio;
        if (b64 && typeof b64 === 'string') {
          // Ignore obviously tiny/garbage payloads
          if (b64.length < 32) {
            pushLog(`skipping tiny audio chunk (${b64.length} bytes)`);
            return;
          }

          const fmt = asFormat(msg?.format ?? cfg.format);

          // mark first-byte time
          if (!isLive) setIsLive(true);
          if (sendAtRef.current != null) {
            const ms = performance.now() - sendAtRef.current;
            updatePerf(ms);
            sendAtRef.current = null;
          }

          pushLog(`audio chunk: fmt=${fmt}, b64len=${b64.length}`);

          // StreamPlayer accepts 'mp3' | 'wav' | 'pcm' | 'pcm16'
          // We always store 'pcm16' in state; the player handles it.
          playerRef.current?.enqueueBase64(
            b64,
            fmt as any,
            cfg.sampleRate ?? 24000,
            cfg.channels ?? 1
          );
        }
      } catch {
        /* ignore non-JSON frames */
      }
    };

    socket.onclose = (ev: CloseEvent) => {
      pushLog(`ws: closed ${ev.code} ${ev.reason}`);
      setConnected(false);
      setIsLive(false);
    };

    socket.onerror = () => {
      pushLog('ws: error');
      setConnected(false);
      setIsLive(false);
    };

    const off = rec.onTranscript((t: string, isFinal: boolean) => {
      setLiveTranscript(t);
      if (isFinal) {
        setText((prev) => (prev.trim() ? prev + ' ' + t : t));
        setLiveTranscript('');
      }
    });

    return () => {
      off();
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushLog = (line: string) =>
    setLogLines((prev) => [line, ...prev].slice(0, 120));

  const updatePerf = (ms: number) => {
    setRuns((r) => r + 1);
    setBestMs((b) => (b == null ? ms : Math.min(b, ms)));
    setWorstMs((w) => (w == null ? ms : Math.max(w, ms)));
    setAvgMs((a) => {
      if (a == null) return ms;
      return a + (ms - a) * 0.2; // cheap running average
    });
  };

  const resetMetrics = () => {
    setRuns(0);
    setBestMs(null);
    setAvgMs(null);
    setWorstMs(null);
    setIsLive(false);
    sendAtRef.current = null;
    pushLog('metrics: reset');
  };

  const applyVoice = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    sendVoiceConfig(ws, cfg);
    pushLog(`voice_config applied: ${cfg.language}/${cfg.voiceId}/${cfg.format}@${cfg.sampleRate}`);
  };

  const speak = async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const content = (text + (liveTranscript ? ' ' + liveTranscript : '')).trim();
    if (!content) return;

    // Unlock audio context
    await playerRef.current?.resume?.();

    // mark send time (for latency to first chunk)
    sendAtRef.current = performance.now();
    setIsLive(true);

    sendText(ws, content);
    pushLog('sent text → speaking…');
  };

  // Language change with safe fallback
  const onLanguageChange = (lang: string) => {
    const presets = presetsByLanguage(lang);
    const pick = presets[0] ?? VOICE_PRESETS.find((v) => v.language === 'en-IN')!;
    setVoicePresetId(pick.id);
    setCfg((c): VoiceConfig => ({
      ...c,
      language: pick.language,
      voiceId: pick.id,
      style: pick.style ?? c.style,
      sampleRate: pick.sampleRate ?? c.sampleRate,
      format: asFormat(pick.format ?? c.format), // ✅ VoiceConfig['format']
      channels: c.channels,
    }));
    setText(DEFAULT_TEXTS[lang] ?? DEFAULT_TEXTS['en-IN']);
  };

  // Preset change keeps types tight
  const onPresetChange = (id: string) => {
    const preset = VOICE_PRESETS.find((v: VoicePreset) => v.id === id);
    if (!preset) {
      pushLog(`unknown preset: ${id}`);
      return;
    }
    setVoicePresetId(id);
    setCfg((c): VoiceConfig => ({
      ...c,
      language: preset.language,
      voiceId: preset.id,
      style: preset.style ?? c.style,
      sampleRate: preset.sampleRate ?? c.sampleRate,
      format: asFormat(preset.format ?? c.format), // ✅ VoiceConfig['format']
      channels: c.channels,
    }));
    setText(DEFAULT_TEXTS[preset.language] ?? DEFAULT_TEXTS['en-IN']);
  };

  const toggleMic = () => {
    if (!rec.supported()) {
      alert('SpeechRecognition API not supported in this browser.');
      return;
    }
    if (rec.getState() === 'recording') rec.stop();
    else rec.start();
  };

  const langHasVoice = presetsByLanguage(cfg.language).length > 0;

  return (
    <div className="card">
      <h2>🎙️ Voice Response Console</h2>

      <div className="row">
        <label>Language</label>
        {/* Tightened to your tenant (en-IN, hi-IN) */}
        <select value={cfg.language} onChange={(e) => onLanguageChange(e.target.value)}>
          <option value="en-IN">English (India)</option>
          <option value="hi-IN">Hindi</option>
        </select>

        <label>Voice Preset</label>
        <select value={voicePresetId} onChange={(e) => onPresetChange(e.target.value)}>
          {presetsByLanguage(cfg.language).map((p: VoicePreset) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label>Format</label>
        <select
          value={cfg.format ?? 'mp3'}
          onChange={(e) =>
            setCfg((c): VoiceConfig => ({
              ...c,
              format: asFormat(e.target.value), // ✅ always 'mp3' | 'wav' | 'pcm16'
            }))
          }
        >
          <option value="mp3">mp3</option>
          <option value="wav">wav</option>
          <option value="pcm16">pcm16</option>
        </select>

        <label>Rate</label>
        <input
          type="number"
          value={cfg.sampleRate ?? 24000}
          onChange={(e) =>
            setCfg((c): VoiceConfig => ({ ...c, sampleRate: Number(e.target.value) || 24000 }))
          }
          min={8000}
          step={1000}
        />
        <button className="btn" onClick={applyVoice}>Apply Voice</button>
      </div>

      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something to speak…"
      />

      {liveTranscript && (
        <p className="muted" style={{ marginTop: 6 }}>
          🎤 <em>Live transcript:</em> {liveTranscript}
        </p>
      )}

      <div className="actions">
        <button className="btn" onClick={toggleMic}>
          {rec.getState() === 'recording' ? 'Stop Mic ◼' : 'Start Mic 🎤'}
        </button>
        <button
          className="btn primary"
          onClick={speak}
          disabled={!connected || !langHasVoice || !cfg.voiceId}
          title={
            !connected
              ? 'Waiting for WS to connect…'
              : (!langHasVoice ? `No voices configured for ${cfg.language}` : 'Send text to TTS')
          }
        >
          Speak ▶ {!connected && <span style={{ fontSize: 12, marginLeft: 6 }}>(connecting…)</span>}
        </button>
      </div>

      {/* ⚡ Perf card */}
      <div className="perf-card">
        <div className="perf-header">⚡ Performance Summary</div>
        <div className="perf-grid">
          <div className="perf-cell">
            <div className="perf-label">Runs</div>
            <div className="perf-value">{runs}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-label">Best</div>
            <div className="perf-value">{bestMs != null ? `${Math.round(bestMs)} ms` : '—'}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-label">Avg</div>
            <div className="perf-value">{avgMs != null ? `${Math.round(avgMs)} ms` : '—'}</div>
          </div>
          <div className="perf-cell">
            <div className="perf-label">Worst</div>
            <div className="perf-value">{worstMs != null ? `${Math.round(worstMs)} ms` : '—'}</div>
          </div>
        </div>
        <div className="perf-foot">
          <span className={`dot ${isLive ? 'live' : ''}`}></span>
          <span>{isLive ? 'streaming…' : 'idle'}</span>
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={resetMetrics}>
            Reset metrics
          </button>
        </div>
      </div>

      <details className="logs">
        <summary>Logs</summary>
        <ul>{logLines.map((l, i) => (<li key={i}>{l}</li>))}</ul>
      </details>
    </div>
  );
}

