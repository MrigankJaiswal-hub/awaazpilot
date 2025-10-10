import { Router } from 'express';
import multer from 'multer';
import { log } from '../utils/logger';

// In-memory upload (no tmp files)
const upload = multer({ storage: multer.memoryStorage() });

export const dubRouter = Router();

/** tiny GET to prove route is mounted */
dubRouter.get('/', (_req, res) => res.json({ ok: true, route: '/api/dub', method: 'GET' }));

/** Utility to pick the first non-empty property */
function pick<T = any>(...vals: (T | undefined | null)[]) {
  for (const v of vals) if (v !== undefined && v !== null && v !== '') return v as T;
  return undefined;
}

/** Normalize Murf-ish responses into a single shape */
function normalizeMurfOut(out: any) {
  const audioUrl =
    pick(
      out?.audioUrl,
      out?.audioURL,
      out?.audio_file,
      out?.audioFile,
      out?.data?.audioUrl,
      out?.data?.audioFile
    ) || undefined;

  const audioBase64 =
    pick(out?.encodedAudio, out?.audioBase64, out?.data?.audioBase64) || undefined;

  return { audioUrl, audioBase64, meta: out };
}

/**
 * Minimal Murf call (adjust to your plan/endpoint).
 * Uses global fetch (Node 18+).
 */
async function callMurfDub(language: string) {
  const API_KEY = process.env.MURF_API_KEY!;
  const url = 'https://api.murf.ai/v1/speech/generate';

  // Use voices that exist in your tenant
  const voiceId = language === 'hi-IN' ? 'hi-IN-rahul' : 'en-IN-isha';

  const body = {
    text: 'Hello! This is a quick dub of your clip.',
    voiceId,
    format: 'mp3',
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const out = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`Murf ${resp.status} ${resp.statusText}: ${JSON.stringify(out)}`);
  }
  return out;
}

/**
 * POST /api/dub
 * fields:
 *  - media: file (wav/mp3/mp4)  ← field name must be 'media'
 *  - language: 'en-IN' | 'hi-IN'
 */
dubRouter.post('/', upload.single('media'), async (req, res) => {
  try {
    const language = String(req.body?.language || 'en-IN').trim();

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Field name must be "media".' });
    }

    log.info('[dub] received file', {
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      language,
    });

    const murfOut = await callMurfDub(language);
    const norm = normalizeMurfOut(murfOut);

    if (norm.audioUrl || norm.audioBase64) {
      return res.json({
        ok: true,
        audioUrl: norm.audioUrl || null,
        audioBase64: norm.audioBase64 || null,
        meta: norm.meta,
      });
    }

    return res.status(502).json({
      error: 'Murf did not return audioUrl or audioBase64',
      detail: murfOut,
    });
  } catch (err: any) {
    log.error('[dub] failed', err);
    return res.status(502).json({
      error: 'Dub failed',
      detail: String(err?.message || err),
    });
  }
});

export default dubRouter;
