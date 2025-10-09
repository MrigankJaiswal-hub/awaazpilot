import { Router } from 'express';
import multer from 'multer';
import { log } from '../utils/logger';

const upload = multer({ storage: multer.memoryStorage() });
export const dubRouter = Router();

/** Helper: pick first defined value */
function pick<T = any>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null && v !== '') return v as T;
  return undefined;
}

/** Normalize Murf output */
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

/** Example Murf call (adjust if you have different plan) */
async function callMurfDub(language: string) {
  const API_KEY = process.env.MURF_API_KEY!;
  const url = 'https://api.murf.ai/v1/speech/generate';
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
  if (!resp.ok) throw new Error(`Murf ${resp.status}: ${JSON.stringify(out)}`);
  return out;
}

/** POST /api/dub */
dubRouter.post('/dub', upload.single('media'), async (req, res) => {
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
    return res.status(502).json({ error: 'Dub failed', detail: String(err?.message || err) });
  }
});

/** GET /api/dub/ping — for debugging */
dubRouter.get('/dub/ping', (_req, res) => res.json({ ok: true, route: '/api/dub/ping' }));

export default dubRouter;
