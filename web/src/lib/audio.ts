// web/src/lib/audio.ts

export type StreamFormat = 'mp3' | 'wav' | 'pcm' | 'pcm16';

type QueueItem = {
  fmt: StreamFormat;
  data: ArrayBuffer;
  sampleRate: number;
  channels: 1 | 2;
};

const TINY_B64_LEN = 600; // ~450 bytes after base64 -> almost always undecodable lone MP3 frames

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  // strip possible data: URLs (defensive)
  const comma = b64.indexOf(',');
  const clean = comma >= 0 ? b64.slice(comma + 1) : b64;

  const binStr = atob(clean);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes.buffer;
}

function pcm16ToFloat32Buffer(
  pcm: ArrayBuffer,
  channels: 1 | 2,
  sampleRate: number,
  ctx: AudioContext
): AudioBuffer {
  const view = new DataView(pcm);
  const samples = view.byteLength / 2; // int16
  const frames = Math.floor(samples / channels);
  const buf = ctx.createBuffer(channels, frames, sampleRate);

  for (let ch = 0; ch < channels; ch++) {
    const out = buf.getChannelData(ch);
    let i = ch;
    for (let f = 0; f < frames; f++, i += channels) {
      const s = view.getInt16(i * 2, true); // little-endian
      out[f] = Math.max(-1, Math.min(1, s / 32768));
    }
  }
  return buf;
}

async function decodeSafe(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // Some browsers still use callback form; wrap it in a Promise either way
  return new Promise((resolve, reject) => {
    try {
      // @ts-ignore - decodeAudioData is overloaded
      ctx.decodeAudioData(
        data.slice(0),
        (buf: AudioBuffer) => resolve(buf),
        (err: any) => reject(err)
      );
    } catch (err) {
      // Newer browsers: decodeAudioData returns a Promise
      (ctx.decodeAudioData as any)(data).then(resolve).catch(reject);
    }
  });
}

export class StreamPlayer {
  private ctx: AudioContext;
  private gain: GainNode;
  private queue: QueueItem[] = [];
  private playing = false;
  private volume = 1.0;

  constructor() {
    // Keep suspended until user gesture; you call resume() before speaking
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = this.volume;
    this.gain.connect(this.ctx.destination);
  }

  /** Ensure AudioContext is running (call this on user gesture) */
  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') {
      await this.ctx.resume().catch(() => {});
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.gain.gain.value = this.volume;
  }

  clear() {
    this.queue = [];
  }

  /**
   * Enqueue a base64 chunk to play.
   * - Skips tiny MP3 fragments to avoid decode spam.
   * - Supports 'mp3' | 'wav' | 'pcm' | 'pcm16'
   */
  enqueueBase64(b64: string, fmt: StreamFormat, sampleRate = 24000, channels: 1 | 2 = 1) {
    // Filter tiny chunks (main source of EncodingError noise for MP3)
    if ((fmt === 'mp3' || fmt === 'wav') && b64.length < TINY_B64_LEN) {
      // Too small to decode as a standalone frame — ignore quietly
      // If you want to see them: console.debug('skip tiny chunk', fmt, b64.length);
      return;
    }

    try {
      const data = base64ToArrayBuffer(b64);
      this.queue.push({ fmt, data, sampleRate, channels });
      // Fire-and-forget; keep latency low
      void this.maybePlayNext();
    } catch (e) {
      console.error('enqueueBase64: failed to parse base64', e);
    }
  }

  private async maybePlayNext(): Promise<void> {
    if (this.playing) return;
    const next = this.queue.shift();
    if (!next) return;

    this.playing = true;

    try {
      let buffer: AudioBuffer;

      if (next.fmt === 'pcm' || next.fmt === 'pcm16') {
        // raw little-endian 16-bit PCM
        buffer = pcm16ToFloat32Buffer(next.data, next.channels, next.sampleRate, this.ctx);
      } else {
        // mp3 / wav — decodeAudioData may throw if chunk is not a full frame
        try {
          buffer = await decodeSafe(this.ctx, next.data);
        } catch (err: any) {
          // Mute harmless frame errors, surface unexpected ones
          if (err?.name === 'EncodingError' || /decode/i.test(String(err))) {
            // Silently skip; the next chunk will likely decode fine
            // If you want a breadcrumb: console.debug('skip undecodable chunk');
            this.playing = false;
            // Try the next chunk immediately
            void this.maybePlayNext();
            return;
          }
          console.error('Unexpected audio decode error:', err);
          this.playing = false;
          void this.maybePlayNext();
          return;
        }
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.gain);
      // Slight offset helps avoid "start in the past" errors on some devices
      const when = Math.max(this.ctx.currentTime + 0.005, 0);
      src.start(when);

      src.onended = () => {
        this.playing = false;
        void this.maybePlayNext();
      };
    } catch (e) {
      // Any unexpected failure — keep pipeline alive
      console.error('maybePlayNext: play failed', e);
      this.playing = false;
      void this.maybePlayNext();
    }
  }
}
