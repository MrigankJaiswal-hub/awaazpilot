import { Router } from 'express';
export const voicesRouter = Router();

voicesRouter.get('/voices', async (_req, res) => {
  try {
    const apiKey = (process.env.MURF_API_KEY ?? '').trim();
    if (!apiKey) return res.status(500).json({ error: 'MURF_API_KEY missing' });
    const r = await fetch('https://api.murf.ai/v1/speech/voices', {
      headers: { 'api-key': apiKey },
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json(j);
    res.json(j);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'voices fetch failed' });
  }
});
