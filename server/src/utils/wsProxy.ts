import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { getMurfBearerToken } from "./murfAuth";
import { log } from "./logger";
import type { ClientMessage, ServerEvent } from "../types/murf";

/**
 * CONFIG
 * Default WS path is Murf "stream-input". You can override with env.
 */
const API_BASE = (process.env.MURF_API_BASE ?? "https://api.murf.ai").trim();
const WS_BASE = API_BASE.replace(/^http/i, "ws");
const DEFAULT_WS_URL = `${WS_BASE}/v1/speech/stream-input`;
const MURF_WS_URL = (process.env.MURF_WS_URL ?? DEFAULT_WS_URL).trim();
const REST_TTS_URL = (process.env.MURF_REST_TTS_URL ?? `${API_BASE}/v1/speech/generate`).trim();

const API_KEY = (process.env.MURF_API_KEY ?? "").trim();
if (!API_KEY) throw new Error("❌ Missing MURF_API_KEY in .env");

// sanity: no smart quotes / non-ascii
for (const ch of API_KEY) {
  if ((ch.codePointAt(0) ?? 0) > 127) {
    throw new Error("❌ MURF_API_KEY contains invalid characters");
  }
}

// append ?api_key=... to WS URL
function withApiKeyQuery(url: string, key: string) {
  const u = new URL(url);
  u.searchParams.set("api_key", key);
  return u.toString();
}

// ✅ Use ws.RawData for the queue so ArrayBuffer/Buffer[] are allowed
type PendingMsg = WebSocket.RawData;

type VoiceConfigLite = {
  language?: string;
  voiceId?: string;
  voice_id?: string;
  sampleRate?: number;
  sample_rate?: number;
  format?: "mp3" | "wav" | "pcm16";
  style?: string;
  channels?: number;
};

export function initWsProxy(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/tts" });
  log.info("WS proxy mounted at ws://<host>/ws/tts");

  wss.on("connection", async (client: WebSocket) => {
    log.info("Client WS connected");

    let upstream: WebSocket | null = null;
    let upstreamOpen = false;
    let pingTimer: NodeJS.Timeout | null = null;

    const clientQueue: PendingMsg[] = []; // queue msgs from browser until upstream opens
    let lastCfg: VoiceConfigLite | null = null;

    // timing markers for WS audio
    let lastAudioAt = 0;
    const markAudio = () => (lastAudioAt = Date.now());

    const stopKeepalive = () => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    };

    const startKeepalive = () => {
      stopKeepalive();
      pingTimer = setInterval(() => {
        try {
          if (upstream && upstream.readyState === WebSocket.OPEN) {
            upstream.ping();
          }
        } catch {
          /* ignore */
        }
      }, 20000);
    };

    const openUpstream = async () => {
      // try to get bearer (some orgs require it for WS)
      let bearer: string | null = null;
      try {
        bearer = await getMurfBearerToken();
      } catch {
        log.warn("Bearer fetch failed or not needed; continuing with API key only.");
      }

      const fullUrl = withApiKeyQuery(MURF_WS_URL, API_KEY);
      const headers: Record<string, string> = {};
      if (bearer) headers["murf-api-token"] = bearer;

      log.info(
        "Dialing Murf WS URL=",
        fullUrl,
        bearer ? "[murf-api-token: bearer-token]" : "[?api_key only]"
      );

      upstream = new WebSocket(fullUrl, { headers });

      upstream.on("open", () => {
        upstreamOpen = true;
        log.info("WS open ✅ URL=" + fullUrl);
        try {
          // Some orgs expect an initial "hello" with api_key in frame, harmless if ignored
          upstream!.send(JSON.stringify({ type: "hello", api_key: API_KEY }));
        } catch (e) {
          log.warn("Unable to send hello frame", e);
        }

        // drain queued client messages
        for (const m of clientQueue.splice(0)) {
          try {
            upstream!.send(m);
          } catch (e) {
            log.warn("Failed to flush queued msg", e);
          }
        }

        // If we cached a previous config, reapply on reconnect
        if (upstream && lastCfg) {
          sendConfigVariants(upstream, lastCfg);
        }

        startKeepalive();
        sendToClient(client, { type: "status", message: "murf:connected" });
      });

      upstream.on("message", (data: WebSocket.RawData, isBinary) => {
        try {
          if (isBinary || Buffer.isBuffer(data)) {
            const b64 = Buffer.from(data as Buffer).toString("base64");
            markAudio();
            sendToClient(client, { type: "audio", audio: b64 } as any);
          } else {
            const text = data.toString();
            if (text.length < 512) log.info("[upstream->client] JSON", text);
            // forward textual events (status, errors, etc)
            client.send(text);
          }
        } catch (err) {
          log.error("Error relaying upstream message:", err);
        }
      });

      upstream.on("close", (code: number, reasonBuf: Buffer) => {
        upstreamOpen = false;
        const reason = reasonBuf?.toString() || "";
        log.warn("Murf WS closed", code, reason);
        if (code === 1008) {
          log.warn(
            "Hint: 1008 = WS auth mismatch. Ensure ?api_key=... is present, and header uses murf-api-token if required."
          );
        }
        sendToClient(client, { type: "close", code, reason });
        safeClose(client, 1000, "upstream closed");
        stopKeepalive();
      });

      upstream.on("error", (err: unknown) => {
        upstreamOpen = false;
        log.error("Murf WS error", err);
        sendToClient(client, {
          type: "error",
          message: "upstream-error",
          detail: String(err),
        });
        safeClose(client, 1011, "upstream error");
        stopKeepalive();
      });
    };

    try {
      await openUpstream();

      // ---------- BROWSER → PROXY ----------
      // Race WS vs REST for text; fan-out config; pass-through otherwise.
      let didSendAnyAudio = false;

      function markAndSendAudio(b64: string) {
        if (didSendAnyAudio) return; // first wins
        didSendAnyAudio = true;
        lastAudioAt = Date.now();
        sendToClient(client, { type: "audio", audio: b64 } as any);
      }

      client.on("message", async (data: WebSocket.RawData) => {
        // If upstream not ready yet, queue and return
        if (!upstream || upstream.readyState !== WebSocket.OPEN) {
          clientQueue.push(data); // queue RawData
          sendToClient(client, { type: "error", message: "upstream-not-open" });
          return;
        }

        const parsed = tryParseClientMessage(data);
        if (!parsed) {
          try {
            upstream.send(data);
          } catch (e) {
            log.warn("upstream send failed", e);
          }
          return;
        }

        // ---------- voice_config fan-out ----------
        if (parsed.type === "voice_config") {
          const cfg: VoiceConfigLite = (parsed as any).voice_config || {};
          lastCfg = cfg;

          log.info("[upstream] sending voice config variants", {
            voiceId: cfg.voiceId ?? cfg.voice_id,
            language: cfg.language,
            sampleRate: cfg.sampleRate ?? cfg.sample_rate ?? 24000,
            format: cfg.format ?? "mp3",
            style: cfg.style,
            channels: cfg.channels ?? 1,
          });

          sendConfigVariants(upstream, cfg);
          return;
        }

        // ---------- speak/text: race WS vs REST ----------
        if (parsed.type === "text" || (parsed as any).type === "speak") {
          const text: string = (
            (parsed as any).input ??
            (parsed as any).text ??
            ""
          )
            .toString()
            .trim();

          if (!text) {
            sendToClient(client, { type: "error", message: "empty-text" });
            return;
          }

          log.info("[upstream] sending speak variants", { bytes: text.length });

          // reset race flags
          didSendAnyAudio = false;
          lastAudioAt = 0;

          // 1) WS path
          sendSpeakVariants(upstream, text);

          // 2) REST path (parallel)
          (async () => {
            try {
              const vc = lastCfg ?? {};
              const voiceId = (vc.voiceId ?? vc.voice_id ?? "en-US-natalie") as string;
              const format = (vc.format ?? "mp3") as "mp3" | "wav" | "pcm16";

              log.info("[race] starting REST generate", { voiceId, format });

              const result = await restGenerate(text, voiceId, format);
              if (!result) {
                log.warn("[race] REST returned null");
                return;
              }

              if (result.base64) {
                markAndSendAudio(result.base64);
                return;
              }

              if (result.url) {
                const b64 = await fetchAsBase64(result.url);
                markAndSendAudio(b64);
                return;
              }

              log.warn("[race] REST unknown response; no audio field");
            } catch (e: any) {
              log.error("[race] REST failed", e);
            }
          })();

          // Optional watchdog: print if nothing has arrived
          setTimeout(() => {
            if (!didSendAnyAudio) {
              log.warn("[watchdog] No audio yet after 2s (WS or REST)");
            }
          }, 2000);

          return;
        }

        // default: pass through JSON
        try {
          upstream.send(JSON.stringify(parsed));
        } catch (e) {
          log.warn("upstream send failed", e);
        }
      });

      // ---------- PROXY → Clean up ----------
      client.on("close", () => {
        log.info("Client WS closed");
        stopKeepalive();
        if (upstream && upstream.readyState === WebSocket.OPEN) {
          upstream.close(1000, "client disconnected");
        }
      });

      client.on("error", (err: unknown) => {
        log.error("Client WS error", err);
        stopKeepalive();
        if (upstream && upstream.readyState === WebSocket.OPEN) {
          upstream.close(1011, "client error");
        }
      });
    } catch (e: any) {
      log.error("WS proxy init failed", e);
      sendToClient(client, {
        type: "error",
        message: "proxy-init-failed",
        detail: e.message,
      });
      safeClose(client, 1011, "proxy init failed");
    }
  });
}

/* ---------------- helpers ---------------- */

function sendToClient(ws: WebSocket, evt: ServerEvent) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(evt));
}

function safeClose(ws: WebSocket, code = 1000, reason?: string) {
  try {
    if (ws.readyState === WebSocket.OPEN) ws.close(code, reason);
  } catch {
    /* ignore */
  }
}

function tryParseClientMessage(data: WebSocket.RawData): ClientMessage | null {
  let text: string;
  if (typeof data === "string") text = data;
  else {
    try {
      text = (data as any).toString();
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(text) as ClientMessage;
  } catch {
    return null;
  }
}

// fan-out config variants to satisfy different org schemas
function sendConfigVariants(upstream: WebSocket, cfg: VoiceConfigLite) {
  const voiceId = cfg.voiceId ?? cfg.voice_id;
  const language = cfg.language;
  const sampleRate = cfg.sampleRate ?? cfg.sample_rate ?? 24000;
  const format = (cfg.format ?? "mp3") as "mp3" | "wav" | "pcm16";
  const style = cfg.style;
  const channels = cfg.channels ?? 1;

  const variants: any[] = [
    {
      type: "config",
      voiceId,
      language,
      audio: { format, sampleRate, channels },
      style,
    },
    {
      type: "config",
      voice_id: voiceId,
      language,
      audio_format: format,
      sample_rate: sampleRate,
      channels,
      style,
    },
    { type: "config", voiceId },
  ];

  for (const v of variants) {
    try {
      upstream.send(JSON.stringify(v));
    } catch (e) {
      log.warn("config variant send failed", e);
    }
  }
}

// fan-out speak variants
function sendSpeakVariants(upstream: WebSocket, text: string) {
  const speakVariants: any[] = [
    { type: "speak", text },
    { type: "text", text },
    { input: text },
    { type: "speak", input: text },
  ];
  for (const v of speakVariants) {
    try {
      upstream.send(JSON.stringify(v));
    } catch (e) {
      log.warn("speak variant send failed", e);
    }
  }
}

// ---- REST fallback helpers ----

async function restGenerate(
  text: string,
  voiceId: string,
  format: "mp3" | "wav" | "pcm16"
): Promise<{ base64?: string; url?: string } | null> {
  const body = {
    text,
    voiceId,
    format, // many tenants accept 'format'; if ignored, MP3 is default
  };
  const res = await fetch(REST_TTS_URL, {
    method: "POST",
    headers: {
      "api-key": API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    log.error("REST TTS failed", res.status, errText);
    return null;
  }

  // response shapes can vary:
  // { audioUrl: "..." } or { url: "..." } or { audioFile: "..." } or { audio: "<base64>" }
  let json: any = null;
  try {
    json = await res.json();
  } catch {}

  if (json?.audio || json?.audioBase64) {
    return { base64: json.audio ?? json.audioBase64 };
  }

  const url =
    json?.audioUrl ||
    json?.audioFile ||
    json?.url ||
    json?.data?.url ||
    null;

  if (url) return { url };

  // some APIs return a signed URL directly as text
  const txt = typeof json === "string" ? json : null;
  if (txt && /^https?:\/\//i.test(txt)) return { url: txt };

  log.warn("REST TTS unknown response shape", json);
  return null;
}

async function fetchAsBase64(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("download failed: " + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.toString("base64");
}
