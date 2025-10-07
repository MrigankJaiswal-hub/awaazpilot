import { Router, Request, Response } from 'express';
import { getMurfBearerToken } from '../utils/murfAuth';

export const tokenRouter = Router();

/**
 * Debug endpoint – NEVER expose full token in production UI.
 * Returns a short preview to confirm server-side token minting works.
 */
tokenRouter.get('/token/debug', async (_req: Request, res: Response) => {
  try {
    const token = await getMurfBearerToken();
    res.json({ tokenPreview: token.slice(0, 12) + '…' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
